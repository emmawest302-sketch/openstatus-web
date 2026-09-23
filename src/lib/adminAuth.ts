import { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * Admin authentication, server-side only.
 *
 * Two ways in:
 *   1. Signed in with an email listed in ADMIN_EMAILS.
 *   2. A passcode, so you can get in while logged in as a test business owner
 *      — or not logged in at all.
 *
 * The passcode is deliberately NOT what the old one was. That one was written
 * into a 'use client' component, so it was compiled into a public JavaScript
 * bundle: anyone who loaded /admin could read it and then call the admin API.
 *
 * Here the secret only ever exists in ADMIN_PASSCODE on the server. The browser
 * posts what the user typed to /api/admin/session, the server compares it, and
 * on success hands back an httpOnly cookie holding a signed, expiring token —
 * not the passcode. The passcode itself never reaches client code, and the
 * cookie can't be read by JavaScript or forged without the signing secret.
 */

export const ADMIN_COOKIE = 'os_admin';
const SESSION_HOURS = 12;

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? 'emeline@forothers.com,emmawest302@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** HMAC key. Falls back to the service role key so there's one less env var to set. */
function signingSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY set');
  return secret;
}

function sign(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('hex');
}

/** Constant-time compare, so response timing can't be used to guess the value. */
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so the mismatch isn't faster than a match.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** A passcode is only usable if it's set and long enough to not be guessable. */
export function passcodeEnabled() {
  const code = process.env.ADMIN_PASSCODE ?? '';
  return code.length >= 16;
}

export function checkPasscode(submitted: unknown) {
  const expected = process.env.ADMIN_PASSCODE ?? '';
  if (!passcodeEnabled()) return false;
  if (typeof submitted !== 'string' || !submitted) return false;
  return safeEqual(submitted, expected);
}

/** `<expiresAtMs>.<nonce>.<hmac>` — opaque to the browser, verifiable by us. */
export function issueSessionToken() {
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  const nonce = randomBytes(8).toString('hex');
  const payload = `${expires}.${nonce}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: SESSION_HOURS * 3600 };
}

function validSessionCookie(raw: string | undefined) {
  if (!raw) return false;
  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, mac] = parts;
  if (!safeEqual(mac, sign(`${expires}.${nonce}`))) return false;
  const ts = Number(expires);
  return Number.isFinite(ts) && ts > Date.now();
}

/**
 * Returns a service-role client if the caller is an admin, otherwise null.
 * Every admin route funnels through this — there is no second code path.
 */
export async function requireAdmin(req: NextRequest) {
  if (validSessionCookie(req.cookies.get(ADMIN_COOKIE)?.value)) {
    return getAdminClient();
  }

  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  if (!adminEmails().includes((data.user.email ?? '').toLowerCase())) return null;
  return admin;
}
