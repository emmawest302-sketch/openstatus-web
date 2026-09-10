import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://openstatus-web-nu.vercel.app';
  return base.replace(/\/$/, '') + '/api/auth/google/callback';
}

function back(req: NextRequest, params: Record<string, string>) {
  const url = new URL('/dashboard', req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete('os_google_state');
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const denied = req.nextUrl.searchParams.get('error');

  if (denied) return back(req, { google: 'cancelled' });
  if (!code || !state) {
    return back(req, { google: 'error', reason: 'Missing code or state' });
  }

  const cookie = req.cookies.get('os_google_state')?.value;
  if (!cookie) {
    return back(req, { google: 'error', reason: 'Session expired, try again' });
  }

  const [nonce, businessId] = cookie.split('.');
  if (!nonce || !businessId || nonce !== state) {
    return back(req, { google: 'error', reason: 'State mismatch' });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return back(req, { google: 'error', reason: 'Google is not configured' });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
      }),
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok) {
      return back(req, {
        google: 'error',
        reason: token?.error_description ?? 'Token exchange failed',
      });
    }

    // Try to find which location this account manages. This needs the
    // allowlist to be granted, so a 429 here means we are still pending.
    let accountName: string | null = null;
    let locationName: string | null = null;
    let locationTitle: string | null = null;
    let pending = false;

    try {
      const accRes = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: 'Bearer ' + token.access_token } }
      );
      if (accRes.status === 429) {
        pending = true;
      } else if (accRes.ok) {
        const accBody = await accRes.json();
        accountName = accBody.accounts?.[0]?.name ?? null;

        if (accountName) {
          const locRes = await fetch(
            'https://mybusinessbusinessinformation.googleapis.com/v1/' +
              accountName +
              '/locations?readMask=name,title',
            { headers: { Authorization: 'Bearer ' + token.access_token } }
          );
          if (locRes.status === 429) {
            pending = true;
          } else if (locRes.ok) {
            const locBody = await locRes.json();
            locationName = locBody.locations?.[0]?.name ?? null;
            locationTitle = locBody.locations?.[0]?.title ?? null;
          }
        }
      }
    } catch {
      pending = true;
    }

    const admin = getAdminClient();
    const expiresAt = token.expires_in
      ? new Date(Date.now() + token.expires_in * 1000).toISOString()
      : null;

    const { error: tokenErr } = await admin.from('oauth_tokens').upsert(
      {
        business_id: businessId,
        provider: 'google',
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        expires_at: expiresAt,
        scope: token.scope ?? null,
        external_account_id: locationName,
        metadata: {
          account_name: accountName,
          location_title: locationTitle,
          allowlist_pending: pending,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,provider' }
    );

    if (tokenErr) {
      return back(req, { google: 'error', reason: 'Could not save token' });
    }

    if (locationName) {
      await admin
        .from('businesses')
        .update({ google_location_id: locationName })
        .eq('id', businessId);
    }

    if (pending) {
      return back(req, {
        google: 'pending',
        reason:
          'Connected, but our Google API access is still being reviewed. Hours will sync automatically once it is approved.',
      });
    }

    return back(req, { google: 'ok', place: locationTitle ?? '' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return back(req, { google: 'error', reason: msg });
  }
}
