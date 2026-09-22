/**
 * Background motion shared by the builder preview and the public page.
 *
 * Lives here rather than in builder-client so the public page doesn't pull the
 * whole builder bundle in just to read two constants.
 */
export const BG_KEYFRAMES = `
@keyframes os-bg-drift { from { background-position: 0 0; } to { background-position: 600px 0; } }
@keyframes os-bg-fall  { from { background-position: 0 0; } to { background-position: 0 600px; } }
@keyframes os-bg-rise  { from { background-position: 0 600px; } to { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) {
  [data-os-bg-anim] { animation: none !important; }
}
`;

/** The inline `animation` value for a stored background animation name. */
export function bgAnimationStyle(anim?: string, speed?: number): string | undefined {
  if (!anim) return undefined;
  const name = anim === 'fall' ? 'os-bg-fall' : anim === 'rise' ? 'os-bg-rise' : 'os-bg-drift';
  return `${name} ${speed ?? 60}s linear infinite`;
}

/** Pull a solid hex out of any background value (hex, gradient, multi-layer). */
export function solidBg(bg?: string): string {
  const v = (bg ?? '').trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  const hexes = v.match(/#[0-9a-fA-F]{6}/g);
  return hexes ? hexes[hexes.length - 1] : '#F7F7F5';
}

/** Is the page background dark enough that light text and surfaces are needed? */
export function isDarkBg(bg?: string): boolean {
  const hex = solidBg(bg);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

/** Lift a hue toward white so a mid-tone icon colour survives a dark page. */
export function liftColor(color: string | undefined, dark: boolean, amount = 0.5): string | undefined {
  if (!dark || !color) return color;
  const m = /^#([0-9a-fA-F]{6})$/.exec(color.trim());
  if (!m) return color;
  const n = parseInt(m[1], 16);
  const lift = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${lift((n >> 16) & 255)},${lift((n >> 8) & 255)},${lift(n & 255)})`;
}

/**
 * Surface tokens derived from the page background.
 *
 * Card fill and border used to be hardcoded — a translucent white that only
 * worked on mid-tone backgrounds. On a dark page the builder dropped to 7%
 * white (invisible) and the live page stayed at 72% white (a glaring slab).
 * Deriving them means a card is always visible against whatever is behind it.
 */
export function surfaceTokens(bg?: string) {
  const dark = isDarkBg(bg);
  return {
    dark,
    card:       dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.72)',
    cardBorder: dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.82)',
    text:       dark ? '#FFFFFF' : '#151515',
    textMuted:  dark ? 'rgba(255,255,255,0.64)' : '#8A8A86',
    chip:       dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.05)',
    icon:       (c?: string) => liftColor(c, dark),
  };
}
