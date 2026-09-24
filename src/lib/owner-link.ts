import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * The owner link: how a shop owner reaches their own controls with no password.
 *
 * Why this exists at all. The owner bar used to live on the public page and
 * checked for a Supabase session — but an owner reaches their own page by
 * tapping the link in their Instagram bio, which opens in Instagram's webview
 * with a separate cookie jar and no session. So the controls were invisible in
 * the one place they were most needed.
 *
 * Two different strings, doing two different jobs:
 *
 *   The TOKEN (openstatus.co/s/<token>) is a key. It is handed over once — by
 *   email, or as a QR scanned from the desktop dashboard — and exchanged for a
 *   session. It is rotatable, so a lost phone is one button to fix.
 *
 *   The SESSION COOKIE is what the owner actually lives with. The home screen
 *   icon points at /me, which carries no secret, so the key is never sitting
 *   in a bookmark where a screenshot or a borrowed phone would leak it, and
 *   rotating the token doesn't silently break the icon.
 */

export const OWNER_COOKIE = 'os_owner';

/** Long, because re-authenticating a shop owner is a support ticket. */
export const SESSION_DAYS = 400;

/** 32 bytes, url-safe: fine in a QR code and in a text message. */
export function generateOwnerToken(): string {
  return randomBytes(24).toString('base64url');
}

function signingSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY set');
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

/** Constant time, so response timing can't be used to guess a signature. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/**
 * `<businessId>.<version>.<expiresAtMs>.<hmac>`
 *
 * The version is the revocation handle. Without it, rotating the owner token
 * only stopped the *link* working — every phone that had already swapped that
 * link for a cookie kept full access for the remaining 400 days. The button
 * said "the old one stops working on every phone" and it did not, which is
 * worse than having no button: an owner whose phone was stolen would tap it,
 * believe they were safe, and stop worrying.
 *
 * Rotating now bumps the business's owner_session_version, and every cookie
 * carrying an older number is refused on the next request.
 */
// Options object, not positional. Adding `version` as a second parameter
// turned every existing two-argument call — which passed `now` — into one that
// silently issued a cookie versioned at a millisecond timestamp. The tests
// caught it; a caller elsewhere would not have.
export function issueOwnerSession(
  businessId: string,
  { version = 1, now = Date.now() }: { version?: number; now?: number } = {},
): string {
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${businessId}.${version}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export type OwnerSession = { businessId: string; version: number; expiresAt: number };

/**
 * Cookies issued before versioning existed have three parts and no version.
 *
 * They are read as version 1, which is the column's default — so nobody is
 * signed out by the upgrade, and the first rotation still revokes them,
 * because it moves the business to 2. Grandfathering them *permanently* would
 * leave the hole open; grandfathering them until the next rotation costs
 * nothing, since rotation is the only thing that was ever supposed to revoke.
 */
const LEGACY_VERSION = 1;

export function readOwnerSession(
  cookie: string | undefined | null,
  now = Date.now()
): OwnerSession | null {
  if (!cookie) return null;

  // Split from the right: a business id is a uuid and contains no dots, but
  // being strict here costs nothing and a malformed cookie should never be
  // interpreted generously.
  const parts = cookie.split('.');
  if (parts.length !== 3 && parts.length !== 4) return null;

  const legacy = parts.length === 3;
  const businessId = parts[0];
  const versionRaw = legacy ? String(LEGACY_VERSION) : parts[1];
  const expiresRaw = legacy ? parts[1] : parts[2];
  const mac = legacy ? parts[2] : parts[3];
  if (!businessId || !versionRaw || !expiresRaw || !mac) return null;

  const version = Number(versionRaw);
  if (!Number.isInteger(version) || version < 1) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;

  const payload = legacy ? `${businessId}.${expiresRaw}` : `${businessId}.${versionRaw}.${expiresRaw}`;
  if (!safeEqual(mac, sign(payload))) return null;

  return { businessId, version, expiresAt };
}

/**
 * Does this cookie still match the business's current session version?
 *
 * Kept separate from readOwnerSession so the signature check stays pure and
 * testable, and so every caller has to make the database check deliberately
 * rather than inherit it by accident.
 */
export function sessionVersionOk(session: OwnerSession, currentVersion: number | null | undefined): boolean {
  const current = typeof currentVersion === 'number' && Number.isInteger(currentVersion) && currentVersion >= 1
    ? currentVersion
    // Column missing or null — the migration has not run. Fall back to the
    // default rather than locking every owner out of their own controls.
    : 1;
  return session.version >= current;
}

/** Where the installed icon points. Carries no secret. */
export const OWNER_HOME = '/me';

/** The one-time key, for email, SMS and the QR code. */
export function ownerLinkUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/s/${token}`;
}
