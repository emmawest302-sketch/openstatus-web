'use client';

import type React from 'react';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

/**
 * An outbound link that records the tap.
 *
 * It exists because the bio card is a SERVER component. Adding an onClick to
 * an anchor in there compiles fine and then throws at request time — "event
 * handlers cannot be passed to client component props" — which took the whole
 * public page down with "Something went wrong". The handler has to live on the
 * client side of the boundary, so it lives here, and the server component
 * hands over only serialisable props.
 */
export default function PublicTrackedLink({
  href, businessId, eventType, blockId, style, children,
}: {
  href: string;
  businessId: string;
  eventType: 'block_click' | 'directions_click';
  blockId: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={style}
      onClick={() => trackOpenStatusEvent(businessId, eventType, blockId)}
    >
      {children}
    </a>
  );
}
