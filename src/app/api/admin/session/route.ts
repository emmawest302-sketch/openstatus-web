import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkPasscode, issueSessionToken, passcodeEnabled } from '@/lib/adminAuth';

/**
 * Exchange the admin passcode for a short-lived signed cookie.
 *
 * The passcode is read from ADMIN_PASSCODE on the server and compared here. It
 * is never sent to the browser, never embedded in a bundle, and never returned
 * in a response body.
 */

// Best-effort brute-force slowing. Serverless instances aren't shared, so this
// is a speed bump rather than a lock — the real protection is a long passcode.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;

function rateLimited(ip: string) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function GET() {
  // Lets the sign-in screen know whether to offer the passcode field at all.
  return NextResponse.json({ passcodeEnabled: passcodeEnabled() });
}

export async function POST(req: NextRequest) {
  if (!passcodeEnabled()) {
    return NextResponse.json(
      { error: 'Passcode sign-in is not configured. Set ADMIN_PASSCODE (16+ characters) in Vercel.' },
      { status: 503 }
    );
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!checkPasscode(body?.passcode)) {
    // Deliberately vague, and slowed a little.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const { value, maxAge } = issueSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, value, {
    httpOnly: true,                 // JavaScript can't read it, so XSS can't steal it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
