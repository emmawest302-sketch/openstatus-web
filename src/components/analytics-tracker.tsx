'use client';

import { useEffect } from 'react';

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

export function trackOpenStatusEvent(businessId: string, eventType: EventType, blockId?: string) {
  if (!businessId || typeof window === 'undefined') return;
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

export default function AnalyticsTracker({ businessId }: { businessId: string }) {
  useEffect(() => {
    const key = `openstatus_view_${businessId}_${window.location.pathname}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {}
    trackOpenStatusEvent(businessId, 'page_view');
  }, [businessId]);
  return null;
}
