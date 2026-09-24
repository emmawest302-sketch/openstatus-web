import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { OWNER_COOKIE, OWNER_HOME, SESSION_DAYS, issueOwnerSession, readOwnerSession } from '@/lib/owner-link';

/**
 * The owner link.
 *
 * Tapping it proves who you are once, swaps the key for a long-lived session,
 * and sends you to /me — which has no secret in its URL, so the owner can add
 * it to their home screen without the key living in a bookmark forever.
 *
 * Deliberately a redirect and not a page: the token never renders, so it does
 * not end up in a screenshot, a browser title, or a referrer header.
 */

export const dynamic = 'force-dynamic';

function landing(req: NextRequest, params: Record<string, string> = {}) {
  const url = new URL(OWNER_HOME, req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  if (!token || token.length < 20) {
    return NextResponse.redirect(landing(req, { link: 'invalid' }));
  }

  const admin = getAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('owner_token', token)
    .maybeSingle();

  if (!business) {
    // Either rotated or mistyped. Never say which — a wrong token should not
    // be a way to learn whether a token exists.
    const existing = readOwnerSession(req.cookies.get(OWNER_COOKIE)?.value);
    return NextResponse.redirect(landing(req, { link: existing ? 'stale' : 'invalid' }));
  }

  const res = NextResponse.redirect(landing(req, { welcome: '1' }));
  res.cookies.set(OWNER_COOKIE, issueOwnerSession(business.id), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return res;
}
