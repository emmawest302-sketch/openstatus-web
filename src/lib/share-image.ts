/**
 * The picture that shows up when someone texts the link.
 *
 * There are three places a business's image can live and they are not
 * interchangeable:
 *
 *   config.bgImage  the cover the owner picked in the builder — what the page
 *                   actually renders at the top
 *   header_url      the older column, still set for pages built before the
 *                   cover moved into the page config
 *   avatar_url      the logo. Square, often a wordmark, and a poor crop at
 *                   1200x630 — a last resort, not a choice.
 *
 * The share card was reading header_url and never looking at config.bgImage,
 * so an owner who set their cover in the builder — which is everyone, now —
 * got their logo in the text preview instead of their shop. With the default
 * logo still in place that meant the OpenStatus mark went out on every link
 * they shared.
 *
 * Whatever comes back has to be absolute: a scraper fetching og:image has no
 * page to resolve "/api/assets?..." against.
 */

export type ShareImageInput = {
  siteUrl: string;
  businessId: string;
  /** The cover from the page config. May be absolute, relative, or a storage ref. */
  bgImage?: string | null;
  headerUrl?: string | null;
  avatarUrl?: string | null;
};

const STORAGE = 'storage:';

function assetUrl(siteUrl: string, businessId: string, kind: 'header' | 'avatar'): string {
  return `${siteUrl}/api/assets?businessId=${encodeURIComponent(businessId)}&kind=${kind}`;
}

/** A single candidate, resolved to an absolute URL, or null if unusable. */
function resolve(value: string | null | undefined, siteUrl: string, businessId: string, kind: 'header' | 'avatar'): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith(STORAGE)) return assetUrl(siteUrl, businessId, kind);
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${siteUrl}${raw}`;
  // A data: URI is megabytes of base64 and no scraper will take it as og:image.
  if (raw.startsWith('data:')) return null;
  return null;
}

export function shareImageUrl(input: ShareImageInput): string | null {
  const { siteUrl, businessId, bgImage, headerUrl, avatarUrl } = input;
  return resolve(bgImage, siteUrl, businessId, 'header')
    ?? resolve(headerUrl, siteUrl, businessId, 'header')
    ?? resolve(avatarUrl, siteUrl, businessId, 'avatar');
}
