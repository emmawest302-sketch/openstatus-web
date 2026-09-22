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
