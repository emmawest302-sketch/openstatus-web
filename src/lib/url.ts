/**
 * Turning what an owner typed into a link that leaves the page.
 *
 * People type "yoursite.com". A bare host in an href is a *relative* path, so
 * the button lands on openstatus.co/yoursite.com and 404s — on the owner's own
 * page, in front of their customer, looking like we lost their website.
 *
 * This lived as a private helper inside one component while the header's
 * Website and Directions buttons used the raw value, which is exactly where
 * the typo hurts most.
 */

const ALLOWED = /^(https?:\/\/|tel:|mailto:)/i;

export function externalUrl(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '';
  if (ALLOWED.test(raw)) return raw;
  // A protocol we don't allow — javascript:, data:, anything else — is not
  // something to "fix" by prefixing https://, which would produce nonsense.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';
  // Protocol-relative, e.g. "//example.com".
  if (raw.startsWith('//')) return `https:${raw}`;
  // A path, not a site. Nothing sensible to link to.
  if (raw.startsWith('/') || raw.startsWith('?') || raw.startsWith('#')) return '';
  return `https://${raw}`;
}
