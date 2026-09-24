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
 */
export const PAGE_CONTAINER_CLASS = 'os-page';

export const PAGE_METRICS_CSS = `
.${PAGE_CONTAINER_CLASS} {
  container-type: inline-size;
  container-name: ospage;
}
.${PAGE_CONTAINER_CLASS} {
  /* Cover: scene-setting, never the content. */
  --os-cover-h: clamp(148px, 46cqw, 214px);
  --os-cover-h-bare: clamp(60px, 18cqw, 84px);

  /* Identity */
  --os-logo: clamp(52px, 16cqw, 66px);
  --os-name: clamp(21px, 6.4cqw, 27px);
  --os-addr: clamp(12.5px, 3.6cqw, 14.5px);
  --os-tag: clamp(10px, 2.9cqw, 11px);

  /* Card padding and radii, so a narrow column doesn't spend a fifth of its
     width on the gap between the text and the card edge. */
  --os-card-pad: clamp(12px, 4.1cqw, 16px);
  --os-radius: clamp(14px, 4.6cqw, 18px);
  --os-gap: clamp(7px, 2.4cqw, 10px);

  /* Rows */
  --os-row-min: clamp(64px, 20cqw, 78px);
  --os-row-title: clamp(13.5px, 3.8cqw, 15px);
  --os-row-sub: clamp(11.5px, 3.2cqw, 12.5px);
  --os-icon: clamp(34px, 10cqw, 40px);

  /* Hours is allowed to be the loudest thing here, but not by much. */
  --os-hours-headline: clamp(17px, 4.9cqw, 19px);
  --os-hours-detail: clamp(12.5px, 3.5cqw, 13.5px);

  /* Actions */
  --os-action-fs: clamp(11.5px, 3.2cqw, 12.5px);
  --os-action-pad-y: clamp(8px, 2.4cqw, 9px);
  --os-action-pad-x: clamp(9px, 3cqw, 12px);
}
`;
