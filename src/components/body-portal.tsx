'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders into <body>, out of the page's layout tree.
 *
 * The business page is now a CSS container (`container-type: inline-size`, see
 * lib/page-metrics), which is what lets the 340px builder preview and a phone
 * render identically. Container types are specified to apply layout
 * containment, and layout containment makes an element the containing block
 * for `position: fixed` descendants — which would clip the share sheet and the
 * photo lightbox to the 560px column instead of the screen.
 *
 * Chrome 141 measurably does *not* do this today. That is a thin thing to rest
 * a full-screen overlay on across every browser our customers use, and on a
 * phone the bug would be invisible while looking broken on a tablet, so the
 * overlays go to <body> and the question stops mattering.
 *
 * There is a client check because this renders on the server first, where
 * there is no document. useSyncExternalStore rather than the usual
 * set-a-flag-in-an-effect: it reports the same thing without a render pass
 * whose only job is to trigger a second one.
 */
const subscribe = () => () => {};

export default function BodyPortal({ children }: { children: React.ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return null;
  return createPortal(children, document.body);
}
