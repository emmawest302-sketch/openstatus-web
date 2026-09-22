import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

// Day name mapping: openstatus weekday keys -> Google Business Profile day names
const DAY_MAP: Record<string, string> = {
  sun: 'SUNDAY',
  mon: 'MONDAY',
  tue: 'TUESDAY',
  wed: 'WEDNESDAY',
  thu: 'THURSDAY',
  fri: 'FRIDAY',
  sat: 'SATURDAY',
};

interface DayHours { open: string; close: string; closed: boolean; }
type WeeklyHours = Record<string, DayHours>;

interface GBPTimePeriod {
  openDay: string;
  openTime: { hours: number; minutes: number };
  closeDay: string;
  closeTime: { hours: number; minutes: number };
}

const DAY_ORDER = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];

function nextDay(day: string): string {
  const i = DAY_ORDER.indexOf(day);
  return DAY_ORDER[(i + 1) % 7];
}

function toGBPPeriods(weekly: WeeklyHours): GBPTimePeriod[] {
  const periods: GBPTimePeriod[] = [];
  for (const [key, day] of Object.entries(weekly)) {
    if (day.closed) continue;
    const googleDay = DAY_MAP[key];
    if (!googleDay) continue;

    const [openH, openM] = (day.open || '09:00').split(':').map(Number);
    const [closeH, closeM] = (day.close || '17:00').split(':').map(Number);

    // 00:00 close means midnight end of day -> attribute to next day
    const isCloseMidnight = closeH === 0 && closeM === 0;

    periods.push({
      openDay: googleDay,
      openTime: { hours: openH || 0, minutes: openM || 0 },
      closeDay: isCloseMidnight ? nextDay(googleDay) : googleDay,
      closeTime: { hours: isCloseMidnight ? 0 : (closeH || 0), minutes: isCloseMidnight ? 0 : (closeM || 0) },
    });
  }
  return periods;
}

async function refreshToken(
  refreshToken: string, clientId: string, clientSecret: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return NextResponse.json({ error: 'Session not valid' }, { status: 401 });

  const { data: business } = await admin
    .from('businesses')
    .select('id, google_location_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 });

  if (!business.google_location_id) {
    return NextResponse.json(
      { error: 'Google Business Profile not connected. Connect it in Settings.' },
      { status: 400 }
    );
  }

  const { data: tokenRow } = await admin
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('business_id', business.id)
    .eq('provider', 'google')
    .single();

  if (!tokenRow) {
    return NextResponse.json(
      { error: 'Google not connected. Reconnect in Settings.' },
      { status: 400 }
    );
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'Google not configured' }, { status: 500 });

  let accessToken = tokenRow.access_token;
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
  if (expiresAt > 0 && Date.now() > expiresAt - 60_000 && tokenRow.refresh_token) {
    const refreshed = await refreshToken(tokenRow.refresh_token, clientId, clientSecret);
    if (refreshed) {
      accessToken = refreshed.access_token;
      await admin.from('oauth_tokens').update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('business_id', business.id).eq('provider', 'google');
    }
  }

  let weeklyHours: WeeklyHours;
  try {
    const body = await req.json();
    weeklyHours = body.weeklyHours;
    if (!weeklyHours || typeof weeklyHours !== 'object') {
      return NextResponse.json({ error: 'Missing weeklyHours' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const periods = toGBPPeriods(weeklyHours);

  // Never push a week with no open periods. An empty regularHours reads to Google
  // as "this business is never open", which is not something a hours-sync bug or a
  // half-filled form should be able to tell Google on an owner's behalf.
  if (periods.length === 0) {
    return NextResponse.json(
      {
        error:
          'Every day is marked closed, so nothing was sent to Google. Set at least one ' +
          'open day, or use Special hours to close for specific dates.',
      },
      { status: 400 }
    );
  }
  const locationName = business.google_location_id;
  const gbpUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationName}?updateMask=regularHours`;

  const gbpRes = await fetch(gbpUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ regularHours: { periods } }),
  });

  if (!gbpRes.ok) {
    if (gbpRes.status === 429) {
      return NextResponse.json(
        { error: 'Google API access is pending review. Hours saved locally and will sync once approved.' },
        { status: 202 }
      );
    }
    const err = await gbpRes.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } })?.error?.message ?? `Google API error (${gbpRes.status})`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
