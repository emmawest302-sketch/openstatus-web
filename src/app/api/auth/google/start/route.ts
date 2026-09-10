import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
].join(' ');

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openstatus-web-nu.vercel.app';
  return base.replace(/\/$/, '') + '/api/auth/google/callback';
}

// The browser calls this with the signed-in user's token and gets back a
// Google consent URL. The business id travels in an httpOnly cookie so the
// callback knows who is connecting.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google is not configured yet' },
      { status: 500 }
    );
  }

  const admin = getAdminClient();

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Session not valid' }, { status: 401 });
  }

  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    // offline + consent so we get a refresh token, which we need to keep
    // writing hours long after the owner has forgotten about us.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: nonce,
  });

  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();

  const res = NextResponse.json({ url });
  res.cookies.set('os_google_state', nonce + '.' + business.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
