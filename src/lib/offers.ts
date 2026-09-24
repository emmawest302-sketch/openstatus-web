/**
 * Offers — the answer to "is there a reason to go today?"
 *
 * Structured data, deliberately. An offer could have been a custom link with
 * the code typed into the title, and that would have shipped faster — but then
 * "how many offers does this business run" and "did anyone tap redeem" are
 * unanswerable, and an expired offer sits on the page until someone notices.
 *
 * The owner writes the words. They do not design the coupon: how it looks is
 * the page's job, and a business that has to art-direct a voucher will simply
 * not put one up.
 */

export type Offer = {
  id: string;
  title: string;
  description?: string;
  /** What the customer says or types at the till. */
  code?: string;
  /** ISO date, YYYY-MM-DD. The last day the offer is good for, inclusive. */
  expiresAt?: string;
  /** Somewhere to redeem it online. Optional — a code on a page is enough. */
  url?: string;
  /** Off keeps a seasonal offer around without showing it. */
  on?: boolean;
};

export const MAX_OFFERS = 8;
export const OFFER_TITLE_MAX = 80;
export const OFFER_DESC_MAX = 140;
export const OFFER_CODE_MAX = 24;

/** `YYYY-MM-DD` for a moment, in the business's own timezone. */
export function localDay(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).format(at);
}

/**
 * Has this offer run out?
 *
 * Inclusive of the expiry day: "valid through Nov 30" is good all of Nov 30,
 * which is what the words say and what the customer will argue at the counter.
 * A malformed date is treated as no expiry rather than as expired — losing an
 * offer to a typo is worse than showing one a day longer.
 */
export function isExpired(offer: Offer, today: string): boolean {
  const raw = offer.expiresAt?.trim();
  if (!raw) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  return raw < today;
}

/** What a customer should actually see, in the owner's order. */
export function activeOffers(offers: Offer[] | undefined, today: string): Offer[] {
  if (!Array.isArray(offers)) return [];
  return offers.filter((o) =>
    o.on !== false &&
    !!o.title?.trim() &&
    !isExpired(o, today)
  );
}

/** "2 available" / "1 available". Plain, because a badge that lies is worse. */
export function offersLabel(count: number): string {
  return `${count} available`;
}

/** "Valid through Nov 30" — no year unless it is not this one. */
export function expiryLabel(expiresAt: string | undefined, today: string): string | null {
  const raw = expiresAt?.trim();
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  // Build in UTC and format in UTC: a date with no time is a calendar date,
  // and letting a timezone shift it turns Nov 30 into Nov 29 for half the map.
  const when = new Date(Date.UTC(y, m - 1, d));
  const sameYear = raw.slice(0, 4) === today.slice(0, 4);
  const text = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(when);
  return `Valid through ${text}`;
}

/** Stable enough for a list key and short enough to read in a config blob. */
export function newOfferId(): string {
  return `offer-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
