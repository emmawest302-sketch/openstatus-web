'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type EventType = 'page_view' | 'block_click' | 'directions_click' | 'social_click';

function visitorId() {
  try {
    const key = 'openstatus_visitor_id';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return '';
  }
}

/**
 * The owner's own visits (from the builder, the owner bar, or a ?preview load)
 * were counted as customer traffic, which makes the numbers meaningless to the
 * only person who reads them. This flag is set once we know who is looking.
 */
let suppressTracking = false;
export function setAnalyticsSuppressed(v: boolean) { suppressTracking = v; }

export function trackOpenStatusEvent(businessId: string, eventType: EventType, blockId?: string) {
  if (!businessId || typeof window === 'undefined') return;
  if (suppressTracking) return;
  if (new URLSearchParams(window.location.search).has('preview')) return;
  const payload = JSON.stringify({
    businessId,
    eventType,
    blockId: blockId || null,
    visitorId: visitorId(),
    path: window.location.pathname,
    referrer: document.referrer || null,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }
  void fetch('/api/analytics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true });
}

export default function AnalyticsTracker({ businessId, ownerUserId }: { businessId: string; ownerUserId?: string | null }) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Resolve who is viewing before recording anything, so an owner's own
      // page load never lands in their customer numbers.
      if (ownerUserId) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.id === ownerUserId) {
            setAnalyticsSuppressed(true);
            return;
          }
        } catch {/* not signed in — treat as a visitor */}
      }
      if (cancelled) return;
      if (new URLSearchParams(window.location.search).has('preview')) return;

      const key = `openstatus_view_${businessId}_${window.location.pathname}`;
      try {
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, '1');
      } catch {}
      trackOpenStatusEvent(businessId, 'page_view');
    })();
    return () => { cancelled = true; };
  }, [businessId, ownerUserId]);
  return null;
}
