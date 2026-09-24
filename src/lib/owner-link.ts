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

/** `<businessId>.<expiresAtMs>.<hmac>` */
export function issueOwnerSession(businessId: string, now = Date.now()): string {
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${businessId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export type OwnerSession = { businessId: string; expiresAt: number };

export function readOwnerSession(
  cookie: string | undefined | null,
  now = Date.now()
): OwnerSession | null {
  if (!cookie) return null;

  // Split from the right: a business id is a uuid and contains no dots, but
  // being strict here costs nothing and a malformed cookie should never be
  // interpreted generously.
  const parts = cookie.split('.');
  if (parts.length !== 3) return null;

  const [businessId, expiresRaw, mac] = parts;
  if (!businessId || !expiresRaw || !mac) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;

  if (!safeEqual(mac, sign(`${businessId}.${expiresRaw}`))) return null;

  return { businessId, expiresAt };
}

/** Where the installed icon points. Carries no secret. */
export const OWNER_HOME = '/me';

/** The one-time key, for email, SMS and the QR code. */
export function ownerLinkUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/s/${token}`;
}
