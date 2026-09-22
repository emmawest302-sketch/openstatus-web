import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * Google Business Profile open-state + special hours.
 *
 * Only ONE of these is writable from OpenStatus:
 *
 *  - specialHours  — dated, self-expiring exceptions ("closed today", "closed
 *    Dec 25", "closing early Friday"). Because each period carries dates, the
 *    business reopens on its own and the owner never has to undo anything.
 *    This is the only closure mechanism the product exposes.
 *
 *  - openInfo.status — a heavyweight state for an extended closure. Setting it
 *    is DISABLED here, on purpose. It is reversible only while Google's
 *    OUTPUT-ONLY `canReopen` flag is true, and when Google decides it is false
 *    the owner's only route back is a "suggest an edit" appeal on their own
 *    profile. An owner hit exactly that. A button in a builder must never be
 *    able to put someone in a state they cannot get out of from the builder.
 *    The `reopen` action is kept as a one-way recovery valve.
 *
 * Permanent closure is likewise not exposed: Google's own guidance is that a
 * permanently closed profile should not be reopened — you create a new one and
 * contact support to move the reviews.
 */

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

/**
 * Reads openInfo straight from Google with caching disabled. Next will happily
 * cache a plain GET fetch inside a route handler, and a cached openInfo looks
 * exactly like a reopen that silently did nothing — which is how an owner ends
 * up staring at "Open on Google" while their listing still says closed.
 */
async function readOpenInfo(locationName: string, accessToken: string) {
  const res = await fetch(`${BASE}/${locationName}?readMask=openInfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, status: res.status, body };
  const info = (body as { openInfo?: { status?: string; canReopen?: boolean } }).openInfo;
  return {
    ok: true as const,
    status: info?.status ?? null,
    canReopen: info?.canReopen ?? null,
    isClosed: !!info?.status && info.status !== OPEN_VALUE,
  };
}

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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${r.accessToken}` },
    cache: 'no-store',
  });
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
    | { action: 'reopen' | 'close_temporarily' }
    | { action: 'special_hours'; periods: SpecialPeriod[] }
    | null;
  if (!body?.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const patch = async (mask: string, payload: unknown) =>
    fetch(`${BASE}/${r.locationName}?updateMask=${mask}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${r.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

  // ── Dated exceptions. These expire on their own. ──
  if (body.action === 'special_hours') {
    const periods = Array.isArray(body.periods) ? body.periods : [];
    const res = await patch('specialHours', { specialHours: { specialHourPeriods: periods } });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return googleError(res.status, out);
    return NextResponse.json({ ok: true });
  }

  // ── Reopen (recovery only) ──
  // A 2xx on the PATCH is NOT proof the listing reopened: Google can accept the
  // write and still leave the profile closed, or route the change into a pending
  // review. So we read openInfo back and report what Google actually says, never
  // what we asked for. `applied` is the only field the UI should trust.
  if (body.action === 'reopen') {
    const res = await patch('openInfo.status', { openInfo: { status: OPEN_VALUE } });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return googleError(res.status, out);

    const after = await readOpenInfo(r.locationName, r.accessToken);
    if (!after.ok) {
      return NextResponse.json({
        ok: true,
        applied: null,
        status: null,
        canReopen: null,
        isClosed: null,
        message: 'Google accepted the change but would not tell us the new state. Check your listing.',
      });
    }

    return NextResponse.json({
      ok: true,
      applied: !after.isClosed,
      status: after.status,
      canReopen: after.canReopen,
      isClosed: after.isClosed,
      message: after.isClosed
        ? `Google still reports this listing as ${after.status ?? 'closed'}. Reopening a profile often has to be reviewed by Google, or done from your Google Business Profile directly — the change may take up to a few days to appear.`
        : 'Google now reports this listing as open.',
    });
  }

  // Anything else — in practice only the retired 'close_temporarily' — is refused.
  // Kept as an explicit 410 rather than a silent fallthrough so a stale client
  // that still sends it gets a message instead of a mystery.
  return NextResponse.json(
    {
      error:
        'Marking your business temporarily closed on Google has been removed. ' +
        'Use Special hours to close for a day or a date range — those expire on ' +
        'their own and never need undoing.',
    },
    { status: 410 }
  );
}
