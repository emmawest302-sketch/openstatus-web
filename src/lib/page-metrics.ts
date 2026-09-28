/**
 * How big the page's furniture is, as one scale rather than ~40 loose numbers.
 *
 * Every size on the business page used to be a literal in a style object,
 * tuned against a 390px phone. The builder preview is a 340px column, and the
 * live page runs from 320 to 560 — so a cover that looked right on one was a
 * wall on another, and "the bio box is huge" turned out to mean "the numbers
 * were picked at one width and used at every width".
 *
 * These are container query units, not viewport units, on purpose. The preview
 * is a 340px box inside a 1400px browser window; `vw` would read the window
 * and size the preview as though it were a desktop page, which is exactly the
 * drift we keep paying for. `cqw` reads the column the page is actually in, so
 * the preview at 340 and a phone at 340 render the same pixels.
 *
 * The clamps matter as much as the ratios: the floor keeps a 320px screen
 * legible and the ceiling stops a 560px column turning the cover into a
 * billboard.
 *
 * The ratios came down about 12% once the phone builder stopped rendering the
 * page in a 340px card and started rendering it full width. That correction
 * then overshot at the small end: measured on a real 390px phone, the row
 * subtitles resolved to 11px and the three header actions to 11.3px, and the
 * headline the whole product exists to deliver — "Open now, closes at 5" —
 * came out at 16px, smaller than the business name above it. The floors and
 * ratios for type have been raised back; the cover, the logo and the row
 * heights were right and have not moved. That was not a
 * regression in the preview — it was the first time the preview told the
 * truth, and the truth was that the page read as zoomed in on a real phone.
 * Tuning here fixes it everywhere at once, which is the whole point of having
 * one scale instead of forty literals.
 */
import type React from 'react';

export const PAGE_CONTAINER_CLASS = 'os-page';

export const PAGE_METRICS_CSS = `
.${PAGE_CONTAINER_CLASS} {
  container-type: inline-size;
  container-name: ospage;
  /* Overwritten per page by fontScaleStyle() below. */
  --os-scale: 1;
}
.${PAGE_CONTAINER_CLASS} {
  /* Cover: scene-setting, never the content. */
  --os-cover-h: clamp(128px, calc(39cqw * var(--os-scale, 1)), 188px);
  --os-cover-h-bare: clamp(52px, calc(15cqw * var(--os-scale, 1)), 74px);

  /* Identity */
  --os-logo: clamp(46px, calc(13.5cqw * var(--os-scale, 1)), 58px);
  --os-name: clamp(21px, calc(6cqw * var(--os-scale, 1)), 26px);
  --os-addr: clamp(12.5px, calc(3.3cqw * var(--os-scale, 1)), 14px);
  --os-tag: clamp(9.5px, calc(2.6cqw * var(--os-scale, 1)), 10.5px);

  /* Card padding and radii, so a narrow column doesn't spend a fifth of its
     width on the gap between the text and the card edge. */
  --os-card-pad: clamp(11px, calc(3.5cqw * var(--os-scale, 1)), 14px);
  --os-radius: clamp(13px, calc(4cqw * var(--os-scale, 1)), 17px);
  --os-gap: clamp(6px, calc(2.1cqw * var(--os-scale, 1)), 9px);

  /* Rows */
  --os-row-min: clamp(56px, calc(16.5cqw * var(--os-scale, 1)), 68px);
  --os-row-title: clamp(14px, calc(3.7cqw * var(--os-scale, 1)), 15.5px);
  --os-row-sub: clamp(12px, calc(3.1cqw * var(--os-scale, 1)), 13px);
  --os-icon: clamp(30px, calc(8.6cqw * var(--os-scale, 1)), 35px);

  /* Hours is allowed to be the loudest thing here, but not by much. */
  --os-hours-headline: clamp(18px, calc(4.9cqw * var(--os-scale, 1)), 20.5px);
  --os-hours-detail: clamp(12.5px, calc(3.3cqw * var(--os-scale, 1)), 14px);

  /* Actions */
  --os-action-fs: clamp(12.5px, calc(3.3cqw * var(--os-scale, 1)), 13.5px);
  --os-action-pad-y: clamp(7.5px, calc(2.1cqw * var(--os-scale, 1)), 8.5px);
  --os-action-pad-x: clamp(9px, calc(2.7cqw * var(--os-scale, 1)), 11px);
}
`;

/**
 * The owner's one dial on page density.
 *
 * Not a font size — a multiplier on the whole scale above, so the cover, the
 * logo, the rows and the type all move together and stay in proportion. A
 * business with a long name picks Compact and the page tightens; one aimed at
 * older customers picks Large. Both still get a page someone designed.
 *
 * Applied as an inline custom property on the page container, which is the
 * only place a per-page value can enter a stylesheet that is otherwise static
 * and shared.
 */
export function fontScaleStyle(scale: 'compact' | 'standard' | 'large' | undefined): React.CSSProperties {
  const factor = scale === 'compact' ? 0.92 : scale === 'large' ? 1.09 : 1;
  return factor === 1 ? {} : ({ '--os-scale': String(factor) } as React.CSSProperties);
}
