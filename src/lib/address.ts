/**
 * The address as a customer needs to read it.
 *
 * Google returns "2716 Wind Gap Dr, Columbia, TN 38401, USA". The postcode and
 * the country are noise to someone deciding whether to walk over, and on a
 * phone they push the line to wrap — costing a whole row of the most valuable
 * part of the page to tell a local customer they are in the USA.
 *
 * This lived inline in the page component, so the builder preview showed the
 * full Google string while the live page showed the short one, and an owner
 * comparing the two saw a difference we'd created. One function, both callers.
 */
export function shortAddress(full?: string | null): string {
  const value = (full ?? '').trim();
  if (!value) return '';

  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');

  const [street, town, region] = parts;
  // "TN 38401" → "TN". Four or more digits is a postcode; a street number is
  // in `street`, so there is nothing here to lose.
  const state = (region ?? '').replace(/\s*\d{4,}.*$/, '').trim();
  return [street, town, state].filter(Boolean).join(', ');
}
