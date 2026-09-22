import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * Google Business Profile open-state + special hours.
 *
 * Two different concepts, deliberately kept apart:
 *
 *  - specialHours  — dated, self-expiring exceptions ("closed today", "closed
 *    Dec 25"). This is the everyday case. Because each period carries dates,
 *    the business reopens on its own and the owner never has to undo anything.
 *
 *  - openInfo.status — a heavyweight state for an extended closure. Reversible
 *    only while Google's OUTPUT-ONLY `canReopen` flag is true, which is why the
 *    UI has to read it back rather than assume.
 *
 * Permanent closure is intentionally NOT exposed: Google's own guidance is that
 * a permanently closed profile should not be reopened — you create a new one and
 * contact support to move the reviews. That is not something to put behind a
 * button in a builder.
 */

// The v1 reference pages don't render the OpenForBusiness enum, and the
// deprecated v4 docs disagree with one v1 rendering. Rather than guess we try
// the documented values in order and let Google arbitrate.
const CLOSE_TEMPORARILY_VALUES = ['CLOSED_TEMPORARILY', 'CLOSED'];
const OPEN_VALUE = 'OPEN';

async function refreshAccessToken(refresh: string, clientId: string, clientSecret: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refresh, grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  return await res.json() as { access_token: string; expires_in: number };
}

/** Resolve caller -> their business -> a valid Google access token. */
async function resolveGoogle(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return { error: 'Not signed in', status: 401 as const };

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return { error: 'Not signed in', status: 401 as const };

  const { data: business } = await admin
    .from('businesses')
    .select('id, google_location_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!business) return { error: 'No business found', status: 404 as const };
  if (!business.google_location_id) {
    return { error: 'Google Business Profile not connected.', status: 400 as const };
  }

  const { data: tokenRow } = await admin
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('business_id', business.id)
    .eq('provider', 'google')
    .single();
  if (!tokenRow) return { error: 'Google not connected. Reconnect in Settings.', status: 400 as const };

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { error: 'Google not configured', status: 500 as const };

  let accessToken = tokenRow.access_token as string;
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
  if (expiresAt > 0 && Date.now() > expiresAt - 60_000 && tokenRow.refresh_token) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token, clientId, clientSecret);
    if (refreshed) {
      accessToken = refreshed.access_token;
      await admin.from('oauth_tokens').update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('business_id', business.id).eq('provider', 'google');
    }
  }

  return { accessToken, locationName: business.google_location_id as string };
}

const BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

function googleError(status: number, body: unknown) {
  if (status === 429) {
    return NextResponse.json(
      { error: 'Google API access is pending review — saved here, will sync once approved.' },
      { status: 202 }
    );
  }
  const msg = (body as { error?: { message?: string } })?.error?.message ?? `Google API error (${status})`;
  return NextResponse.json({ error: msg }, { status: 500 });
}

/**
 * GET — read the live open state.
 * This is also the definitive answer to "which enum strings does v1 use?":
 * whatever Google returns here is the vocabulary for this account.
 */
export async function GET(req: NextRequest) {
  const r = await resolveGoogle(req);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const url = `${BASE}/${r.locationName}?readMask=openInfo,specialHours`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${r.accessToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return googleError(res.status, body);

  const b = body as {
    openInfo?: { status?: string; canReopen?: boolean; openingDate?: unknown };
    specialHours?: { specialHourPeriods?: unknown[] };
  };

  return NextResponse.json({
    status: b.openInfo?.status ?? null,
    canReopen: b.openInfo?.canReopen ?? null,
    isClosed: !!b.openInfo?.status && b.openInfo.status !== OPEN_VALUE,
    specialHourPeriods: b.specialHours?.specialHourPeriods ?? [],
  });
}

type SpecialPeriod = {
  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  openTime?: { hours: number; minutes: number };
  closeTime?: { hours: number; minutes: number };
  closed?: boolean;
};

export async function POST(req: NextRequest) {
  const r = await resolveGoogle(req);
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const body = await req.json().catch(() => null) as
    | { action: 'close_temporarily' | 'reopen' }
    | { action: 'special_hours'; periods: SpecialPeriod[] }
    | null;
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const patch = async (mask: string, payload: unknown) =>
    fetch(`${BASE}/${r.locationName}?updateMask=${mask}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${r.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

  // ── Dated exceptions. These expire on their own. ──
  if (body.action === 'special_hours') {
    const periods = Array.isArray(body.periods) ? body.periods : [];
    const res = await patch('specialHours', { specialHours: { specialHourPeriods: periods } });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return googleError(res.status, out);
    return NextResponse.json({ ok: true });
  }

  // ── Extended closure / reopen ──
  if (body.action === 'reopen') {
    const res = await patch('openInfo.status', { openInfo: { status: OPEN_VALUE } });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return googleError(res.status, out);
    return NextResponse.json({ ok: true, status: OPEN_VALUE });
  }

  // Try each documented spelling; a bad enum comes back as 400 INVALID_ARGUMENT.
  let lastStatus = 500;
  let lastBody: unknown = {};
  for (const value of CLOSE_TEMPORARILY_VALUES) {
    const res = await patch('openInfo.status', { openInfo: { status: value } });
    if (res.ok) return NextResponse.json({ ok: true, status: value });
    lastStatus = res.status;
    lastBody = await res.json().catch(() => ({}));
    if (res.status !== 400) break; // a real failure, not an enum mismatch
  }
  return googleError(lastStatus, lastBody);
}
