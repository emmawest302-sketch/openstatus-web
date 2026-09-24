'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AudienceGate, type QueuedEvent } from '@/lib/analytics-audience';

type EventType = 'page_view' | 'block_click' | 'directions_click' | 'social_click' | 'share_click';

function visitorId() {
  try {
    const key = 'openstatus_visitor_id';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    // A private window or blocked storage. The visit still counts as a view;
    // it just cannot be attributed to a returning person, which is the honest
    // outcome rather than bucketing every such visitor under one id.
    return '';
  }
}

function post(event: QueuedEvent & { businessId: string }) {
  const payload = JSON.stringify({
    businessId: event.businessId,
    eventType: event.eventType,
    blockId: event.blockId || null,
    visitorId: visitorId(),
    path: window.location.pathname,
    referrer: document.referrer || null,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

/**
 * One gate for the page, holding events until we know who is looking.
 *
 * Module-level because the emitters are plain functions called from deep
 * inside the public components, not hooks — there is no tree to hang a
 * context off without rewriting eleven call sites for no gain.
 *
 * `businessId` travels with each event rather than being captured here: a
 * client-side navigation between two business pages would otherwise send the
 * second page's clicks to the first page's business.
 */
let pageBusinessId = '';
const gate = new AudienceGate((e) => {
  if (!pageBusinessId) return;
  post({ ...e, businessId: pageBusinessId });
});

/**
 * The builder calls this.
 *
 * Its preview renders the real public components with the real business id,
 * so every tap inside it was landing in that business's analytics as though a
 * customer had done it. An owner arranging her own page all afternoon
 * manufactured a week of fake engagement. There is no page view in the
 * builder, so the damage showed up as actions with no views behind them.
 */
export function excludeFromAnalytics() {
  pageBusinessId = '';
  gate.resolve('excluded');
}

/** Leaving the builder or a public page: the next one decides for itself. */
export function resetAnalyticsAudience() {
  pageBusinessId = '';
  gate.reset();
}

export function trackOpenStatusEvent(businessId: string, eventType: EventType, blockId?: string) {
  if (!businessId || typeof window === 'undefined') return;
  // A preview of someone's page is not a visit to it.
  if (new URLSearchParams(window.location.search).has('preview')) return;
  // Only ever count events for the page we resolved an audience for.
  if (pageBusinessId && businessId !== pageBusinessId) return;
  gate.emit({ eventType, blockId });
}

/**
 * Decides the audience for one public page, then records the view.
 *
 * Owner exclusion is deliberate and total: an owner checking their own page
 * is not a customer, and a shop with five staff refreshing it all day would
 * otherwise read as traffic. It applies to their clicks as well as their
 * views — consistently, which is the part that was broken.
 */
export default function AnalyticsTracker({ businessId, ownerUserId }: { businessId: string; ownerUserId?: string | null }) {
  useEffect(() => {
    let cancelled = false;
    pageBusinessId = businessId;

    void (async () => {
      if (new URLSearchParams(window.location.search).has('preview')) {
        if (!cancelled) gate.resolve('excluded');
        return;
      }

      let isOwner = false;
      if (ownerUserId) {
        try {
          const { data } = await supabase.auth.getSession();
          isOwner = data.session?.user?.id === ownerUserId;
        } catch {/* not signed in — treat as a visitor */}
      }
      if (cancelled) return;

      gate.resolve(isOwner ? 'excluded' : 'visitor');
      if (isOwner) return;

      // Every load is a view. Unique people are counted separately, from the
      // visitor id — so a refresh adds a view and not a visitor. There used to
      // be a sessionStorage guard here, which made "views" quietly mean
      // "sessions" and left the two numbers measuring almost the same thing.
      gate.emit({ eventType: 'page_view' });
    })();

    return () => { cancelled = true; resetAnalyticsAudience(); };
  }, [businessId, ownerUserId]);

  return null;
}
