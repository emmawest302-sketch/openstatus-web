/**
 * One source of truth for where this app lives.
 *
 * The builder previously showed three different domains for the same page
 * (forothers.co, openstatus.co, and the Vercel preview URL). Everything that
 * renders a public link should read from here.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'https://openstatus.co';

/** Host without protocol — for display, e.g. "openstatus.co/herban-market". */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, '');

/** Absolute public URL for a business page. */
export function pageUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

/** Display form, no protocol. */
export function pageDisplayUrl(slug: string): string {
  return `${SITE_DOMAIN}/${slug}`;
}
