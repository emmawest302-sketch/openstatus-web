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
 * page in a 340px card and started rendering it full width. That was not a
 * regression in the preview — it was the first time the preview told the
 * truth, and the truth was that the page read as zoomed in on a real phone.
 * Tuning here fixes it everywhere at once, which is the whole point of having
 * one scale instead of forty literals.
 */
export const PAGE_CONTAINER_CLASS = 'os-page';

export const PAGE_METRICS_CSS = `
.${PAGE_CONTAINER_CLASS} {
  container-type: inline-size;
  container-name: ospage;
}
.${PAGE_CONTAINER_CLASS} {
  /* Cover: scene-setting, never the content. */
  --os-cover-h: clamp(128px, 39cqw, 188px);
  --os-cover-h-bare: clamp(52px, 15cqw, 74px);

  /* Identity */
  --os-logo: clamp(46px, 13.5cqw, 58px);
  --os-name: clamp(19px, 5.5cqw, 24px);
  --os-addr: clamp(12px, 3.2cqw, 13.5px);
  --os-tag: clamp(9.5px, 2.6cqw, 10.5px);

  /* Card padding and radii, so a narrow column doesn't spend a fifth of its
     width on the gap between the text and the card edge. */
  --os-card-pad: clamp(11px, 3.5cqw, 14px);
  --os-radius: clamp(13px, 4cqw, 17px);
  --os-gap: clamp(6px, 2.1cqw, 9px);

  /* Rows */
  --os-row-min: clamp(56px, 16.5cqw, 68px);
  --os-row-title: clamp(13px, 3.4cqw, 14px);
  --os-row-sub: clamp(11px, 2.9cqw, 12px);
  --os-icon: clamp(30px, 8.6cqw, 35px);

  /* Hours is allowed to be the loudest thing here, but not by much. */
  --os-hours-headline: clamp(16px, 4.3cqw, 17.5px);
  --os-hours-detail: clamp(12px, 3.1cqw, 13px);

  /* Actions */
  --os-action-fs: clamp(11px, 2.9cqw, 12px);
  --os-action-pad-y: clamp(7.5px, 2.1cqw, 8.5px);
  --os-action-pad-x: clamp(9px, 2.7cqw, 11px);
}
`;
