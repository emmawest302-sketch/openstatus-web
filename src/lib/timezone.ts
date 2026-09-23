/**
 * Establishing a business's timezone.
 *
 * Every open/closed decision runs on it (see business-status.ts), but nothing
 * was ever writing businesses.timezone — so every business in the database was
 * falling back to America/Chicago regardless of where it actually is.
 *
 * The value comes from the owner's browser. Google Places only returns
 * utcOffsetMinutes in the fields we already request, and a fixed offset is
 * wrong for half the year wherever daylight saving applies; a real IANA zone
 * from Google needs lat/lng plus the separate Time Zone API. The browser
 * reports a proper zone for free and is right whenever the owner is anywhere
 * near their own business, which is almost always.
 *
 * It can still be wrong — an owner setting up a Denver shop while visiting
 * Miami — so this is a sensible default, not a claim of certainty, and it
 * should stay editable in the Business panel.
 */

/** The viewer's IANA zone, or null if the browser won't say. */
export function detectTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.includes('/') ? tz : null;
  } catch {
    return null;
  }
}

/** Rejects junk before it reaches the database. */
export function isValidTimeZone(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Last resort, matching the historical default so behaviour doesn't shift. */
export const FALLBACK_TIME_ZONE = 'America/Chicago';
