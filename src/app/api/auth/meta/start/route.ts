import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { buildAuthUrl } from '@/lib/meta';

// The browser calls this with the signed-in user's access token and gets back
// a Facebook authorisation URL. The business id rides along in an httpOnly
// cookie, and a nonce ties the callback back to this request.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!jwt) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const admin = getAdminClient();

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Session not valid' }, { status: 401 });
  }

  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .single();

  if (bizErr || !business) {
    return NextResponse.json(
      { error: 'No business found for this account' },
      { status: 404 }
    );
  }

  const nonce = crypto.randomUUID();
  const url = buildAuthUrl(nonce);

  const res = NextResponse.json({ url });
  res.cookies.set('os_meta_state', nonce + '.' + business.id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
