import { NextRequest, NextResponse } from 'next/server';

// Google Places API day index: 0=Sun, 1=Mon, ..., 6=Sat
const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const ALL_DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
type WeekDay = typeof ALL_DAYS[number];
interface DayHours { open: string; close: string; closed: boolean; }

// Convert Google "1430" → "14:30"
function fmtTime(t: string): string {
  return t.length === 4 ? `${t.slice(0,2)}:${t.slice(2)}` : t;
}

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId');
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 500 });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=opening_hours&key=${apiKey}`;

  let data: { result?: { opening_hours?: { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> } }; status?: string };
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    data = await res.json();
  } catch {
    return NextResponse.json({ error: 'Failed to reach Google Places API' }, { status: 502 });
  }

  if (data.status && data.status !== 'OK') {
    return NextResponse.json({ error: `Google API error: ${data.status}` }, { status: 400 });
  }

  const periods = data.result?.opening_hours?.periods;
  if (!periods) return NextResponse.json({ weeklyHours: null });

  // Build a map of day → hours, defaulting all days to closed
  const weeklyHours: Record<WeekDay, DayHours> = {} as Record<WeekDay, DayHours>;
  for (const d of ALL_DAYS) {
    weeklyHours[d] = { open: '09:00', close: '17:00', closed: true };
  }

  for (const period of periods) {
    const day = DAY_MAP[period.open.day] as WeekDay | undefined;
    if (!day) continue;
    weeklyHours[day] = {
      open: fmtTime(period.open.time),
      close: period.close ? fmtTime(period.close.time) : '23:59',
      closed: false,
    };
  }

  return NextResponse.json({ weeklyHours });
}
