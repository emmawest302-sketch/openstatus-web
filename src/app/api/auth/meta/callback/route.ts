import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  findInstagramAccount,
  META_SCOPES,
} from '@/lib/meta';

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL('/dashboard', req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete('os_meta_state');
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const denied = req.nextUrl.searchParams.get('error');

  if (denied) {
    return back(req, { connect: 'cancelled' });
  }
  if (!code || !state) {
    return back(req, { connect: 'error', reason: 'Missing code or state' });
  }

  const cookie = req.cookies.get('os_meta_state')?.value;
  if (!cookie) {
    return back(req, { connect: 'error', reason: 'Session expired, try again' });
  }

  const [nonce, businessId] = cookie.split('.');
  if (!nonce || !businessId || nonce !== state) {
    return back(req, { connect: 'error', reason: 'State mismatch' });
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);
    const account = await findInstagramAccount(long.access_token);

    if (!account) {
      return back(req, {
        connect: 'no_instagram',
        reason:
          'No Instagram business account is linked to your Facebook page. Convert the account to Business or Creator and link it to a Page, then try again.',
      });
    }

    const admin = getAdminClient();
    const expiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null;

    const { error: tokenErr } = await admin.from('oauth_tokens').upsert(
      {
        business_id: businessId,
        provider: 'meta',
        access_token: account.pageAccessToken,
        expires_at: expiresAt,
        scope: META_SCOPES,
        external_account_id: account.igUserId,
        metadata: {
          page_id: account.pageId,
          page_name: account.pageName,
          ig_username: account.username,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,provider' }
    );

    if (tokenErr) {
      return back(req, { connect: 'error', reason: 'Could not save token' });
    }

    await admin
      .from('businesses')
      .update({
        instagram_handle: account.username,
        instagram_account_id: account.igUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    return back(req, { connect: 'ok', handle: account.username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return back(req, { connect: 'error', reason: msg });
  }
}
