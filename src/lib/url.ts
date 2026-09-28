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

export function externalUrl(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '';
  if (/^(tel:|mailto:)/i.test(raw)) return raw;
  if (/^https?:\/\//i.test(raw)) return validWebUrl(raw);
  // A protocol we don't allow — javascript:, data:, anything else — is not
  // something to "fix" by prefixing https://, which would produce nonsense.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return '';
  // Protocol-relative, e.g. "//example.com".
  if (raw.startsWith('//')) return validWebUrl(`https:${raw}`);
  // A path, not a site. Nothing sensible to link to.
  if (raw.startsWith('/') || raw.startsWith('?') || raw.startsWith('#')) return '';
  return validWebUrl(`https://${raw}`);
}

function validWebUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    // URL() accepts `https://.com` in some runtimes. Such a row looks live
    // but leads nowhere, as happened with the social links on a real page.
    const labels = url.hostname.split('.');
    if (labels.length < 2 || labels.some(label => !label || label.startsWith('-') || label.endsWith('-'))) return '';
    if (url.username || url.password) return '';
    return value;
  } catch {
    return '';
  }
}
