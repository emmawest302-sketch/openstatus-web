/**
 * How a cover or background photo is toned down so it sits behind the page
 * rather than competing with it.
 *
 * Three independent controls, deliberately few:
 *   intensity — how present the image is, 0 to 100
 *   blur      — none / soft / strong
 *   overlay   — auto / light / dark / none
 *
 * Kept pure and separate from the page so the numbers can be tested and the
 * page code stays about layout.
 */

export type ImageBlur = 'none' | 'soft' | 'strong';
export type ImageOverlay = 'auto' | 'light' | 'dark' | 'none';

export const DEFAULT_INTENSITY = 78;
export const DEFAULT_BLUR: ImageBlur = 'none';
/**
 * No overlay, by default.
 *
 * 'auto' made sense when the business name sat ON the cover photo and needed
 * something to be legible against. It does not sit there any more — the name
 * is on the frosted card below, which carries its own contrast — so the
 * overlay had no legibility job left and was only ever greying out the
 * owner's photo. It stays available for anyone who wants it.
 */
export const DEFAULT_OVERLAY: ImageOverlay = 'none';

/** Restrained on purpose. Past about 10px a photo stops reading as a photo. */
const BLUR_PX: Record<ImageBlur, number> = { none: 0, soft: 4, strong: 10 };

export function blurPx(blur: ImageBlur | undefined): number {
  return BLUR_PX[blur ?? DEFAULT_BLUR] ?? 0;
}

/**
 * A CSS blur samples past the element's edge and leaves a soft transparent
 * band all the way round. Scaling the image up hides that band behind the
 * container, which must clip. Roughly 3x the radius across the box is enough.
 */
export function blurScale(px: number): number {
  if (px <= 0) return 1;
  return 1 + (px * 3) / 100;
}

export function intensityToOpacity(intensity: number | undefined): number {
  const n = typeof intensity === 'number' && Number.isFinite(intensity)
    ? intensity
    : DEFAULT_INTENSITY;
  return Math.min(100, Math.max(0, n)) / 100;
}

/**
 * Resolve 'auto'.
 *
 * A page that prints its text in white needs the photo pushed darker; a page
 * with dark text needs it pushed lighter. Either way the overlay moves the
 * image away from the text, not toward it.
 */
export function resolveOverlay(
  overlay: ImageOverlay | undefined,
  pageIsDark: boolean
): Exclude<ImageOverlay, 'auto'> {
  const choice = overlay ?? DEFAULT_OVERLAY;
  if (choice !== 'auto') return choice;
  return pageIsDark ? 'dark' : 'light';
}

/**
 * The overlay wash. Strength rises as the image is turned up, because a faint
 * image needs no help and a full-strength one does.
 */
export function overlayColor(
  resolved: Exclude<ImageOverlay, 'auto'>,
  opacity: number
): string | null {
  if (resolved === 'none') return null;
  const strength = Math.round((0.10 + 0.22 * opacity) * 100) / 100;
  return resolved === 'dark'
    ? `rgba(0,0,0,${strength})`
    : `rgba(255,255,255,${strength})`;
}

export type ImageTreatment = {
  opacity: number;
  blur: number;
  scale: number;
  overlay: string | null;
};

export function imageTreatment(input: {
  intensity?: number;
  blur?: ImageBlur;
  overlay?: ImageOverlay;
  pageIsDark: boolean;
}): ImageTreatment {
  const opacity = intensityToOpacity(input.intensity);
  const px = blurPx(input.blur);
  return {
    opacity,
    blur: px,
    scale: blurScale(px),
    overlay: overlayColor(resolveOverlay(input.overlay, input.pageIsDark), opacity),
  };
}

export function isImageBlur(v: unknown): v is ImageBlur {
  return v === 'none' || v === 'soft' || v === 'strong';
}

export function isImageOverlay(v: unknown): v is ImageOverlay {
  return v === 'auto' || v === 'light' || v === 'dark' || v === 'none';
}
