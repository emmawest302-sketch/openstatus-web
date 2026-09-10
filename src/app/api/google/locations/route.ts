import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

// Refreshes an expired Google access token using the stored refresh token.
async function freshAccessToken(
  refreshToken: string
): Promise<{ token: string | null; error?: string }> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { token: null, error: 'not configured' };

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json();
  if (!res.ok) return { token: null, error: body?.error_description ?? 'refresh failed' };
  return { token: body.access_token };
}

// Looks up the business's Google locations and stores the first one.
// Also reports exactly what Google said, so we can tell an allowlist
// problem apart from an empty account.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

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
  if (!business) return NextResponse.json({ error: 'No business' }, { status: 404 });

  const { data: tok } = await admin
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('business_id', business.id)
    .eq('provider', 'google')
    .maybeSingle();

  if (!tok?.access_token) {
    return NextResponse.json({ error: 'Google is not connected' }, { status: 400 });
  }

  let accessToken = tok.access_token;
  const expired = tok.expires_at ? new Date(tok.expires_at) < new Date() : false;
  if (expired && tok.refresh_token) {
    const r = await freshAccessToken(tok.refresh_token);
    if (!r.token) {
      return NextResponse.json(
        { stage: 'refresh', ok: false, detail: r.error },
        { status: 200 }
      );
    }
    accessToken = r.token;
    await admin
      .from('oauth_tokens')
      .update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
      })
      .eq('business_id', business.id)
      .eq('provider', 'google');
  }

  const accRes = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: 'Bearer ' + accessToken } }
  );
  const accText = await accRes.text();

  if (!accRes.ok) {
    return NextResponse.json({
      stage: 'accounts',
      ok: false,
      status: accRes.status,
      detail: accText.slice(0, 400),
      hint:
        accRes.status === 403
          ? 'API not enabled or project not allowlisted yet'
          : accRes.status === 429
          ? 'Quota is zero, meaning the allowlist request is still pending'
          : 'Unexpected error from Google',
    });
  }

  let accounts: { name: string; accountName?: string }[] = [];
  try {
    accounts = JSON.parse(accText).accounts ?? [];
  } catch {
    accounts = [];
  }

  if (accounts.length === 0) {
    return NextResponse.json({
      stage: 'accounts',
      ok: true,
      status: 200,
      accounts: 0,
      hint: 'This Google account manages no Business Profiles',
    });
  }

  const results: unknown[] = [];
  let stored: string | null = null;

  for (const acc of accounts) {
    const locRes = await fetch(
      'https://mybusinessbusinessinformation.googleapis.com/v1/' +
        acc.name +
        '/locations?readMask=name,title,storefrontAddress',
      { headers: { Authorization: 'Bearer ' + accessToken } }
    );
    const locText = await locRes.text();
    if (!locRes.ok) {
      results.push({ account: acc.name, status: locRes.status, detail: locText.slice(0, 300) });
      continue;
    }
    let locs: { name: string; title?: string }[] = [];
    try {
      locs = JSON.parse(locText).locations ?? [];
    } catch {
      locs = [];
    }
    results.push({ account: acc.name, status: 200, locations: locs.map((l) => l.title ?? l.name) });

    if (!stored && locs.length > 0) {
      stored = locs[0].name;
      await admin
        .from('businesses')
        .update({ google_location_id: stored })
        .eq('id', business.id);
      await admin
        .from('oauth_tokens')
        .update({
          external_account_id: stored,
          metadata: {
            account_name: acc.name,
            location_title: locs[0].title ?? null,
            allowlist_pending: false,
          },
        })
        .eq('business_id', business.id)
        .eq('provider', 'google');
    }
  }

  return NextResponse.json({
    stage: 'locations',
    ok: true,
    accounts: accounts.length,
    stored,
    results,
  });
}
