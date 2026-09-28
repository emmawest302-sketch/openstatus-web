/**
 * Turning what an owner typed into the social row into something a customer
 * can actually tap.
 *
 * Both functions here exist because of one live page. It carried five social
 * buttons: every one of them pointed at `https://.com`, and the Twitter one
 * rendered the literal text "Tw" where its logo should have been. Neither is
 * a data problem the owner could see — the builder accepted what they typed
 * and the page drew real, confident, dead buttons.
 *
 * Kept out of the component so it can be tested without a DOM.
 */

/** The platforms the public page knows how to draw a mark for. */
export const SOCIAL_KEYS = ['instagram', 'tiktok', 'facebook', 'twitter', 'youtube'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/**
 * Work out which platform a stored entry means.
 *
 * The record format keys straight off the platform id, but the legacy array
 * format stored the builder's *display* label — and one of those labels is
 * "Twitter / X". Lowercased that is "twitter / x", which equals no platform
 * id, so the icon lookup failed and the button fell back to printing the
 * first two characters of the label. Matching on a contained platform name
 * rather than string equality fixes that one and any label we reword later.
 */
export function platformKeyFor(raw: string): SocialKey | null {
  const v = (raw ?? '').toLowerCase();
  if (v.includes('instagram')) return 'instagram';
  if (v.includes('tiktok')) return 'tiktok';
  if (v.includes('facebook')) return 'facebook';
  if (v.includes('youtube')) return 'youtube';
  // "X" standing alone is the platform; an x inside another word is not.
  if (v.includes('twitter') || /(^|[^a-z])x([^a-z]|$)/.test(v)) return 'twitter';
  return null;
}

/**
 * Is this actually somewhere a customer can go?
 *
 * `.com` became `https://.com`: a host whose first label is empty. It parses,
 * it renders, it is tappable, and it goes nowhere. A destination has to have
 * a name in front of the dot before it earns a place on someone's page.
 *
 * Returns the URL to use, or null when the entry should not be shown at all.
 */
export function socialHref(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  let host: string;
  try {
    host = new URL(withScheme).hostname;
  } catch {
    return null;
  }
  if (!host || host.startsWith('.') || host.endsWith('.')) return null;
  const labels = host.split('.');
  // Needs a name and a TLD, and no empty label anywhere between them.
  if (labels.length < 2) return null;
  if (labels.some(l => l.length === 0)) return null;
  return withScheme;
}
