import { NextRequest, NextResponse } from 'next/server';

// Google Places API day index: 0=Sun, 1=Mon, ..., 6=Sat
const DAY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};
const ALL_DAYS = ['mon','tue','wed','thu','fri','sat','sun'] as const;
type WeekDay = typeof ALL_DAYS[number];

function fmtTime(t: string): string {
  // Google "1430" → "14:30"
  return t.length === 4 ? `${t.slice(0,2)}:${t.slice(2)}` : t;
}

export type PlaceDetails = {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: Record<WeekDay, { open: string; close: string; closed: boolean }> | null;
  /** Google star rating, 0–5 (e.g. 4.7) */
  rating?: number;
  /** Total number of Google reviews */
  reviewCount?: number;
};

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('placeId')?.trim();
  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'displayName,formattedAddress,nationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return NextResponse.json(
        { error: err?.error?.message ?? 'Google Places error' },
        { status: res.status }
      );
    }

    const data = await res.json() as {
      displayName?: { text?: string };
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
      regularOpeningHours?: {
        periods?: Array<{
          open: { day: number; hour: number; minute: number };
          close?: { day: number; hour: number; minute: number };
        }>;
      };
    };

    // Build weekly hours map if available
    let hours: PlaceDetails['hours'] = null;
    const periods = data.regularOpeningHours?.periods;
    if (periods && periods.length > 0) {
      hours = {} as Record<WeekDay, { open: string; close: string; closed: boolean }>;
      for (const d of ALL_DAYS) {
        hours[d] = { open: '09:00', close: '17:00', closed: true };
      }
      for (const period of periods) {
        const day = DAY_MAP[period.open.day] as WeekDay | undefined;
        if (!day) continue;
        const openTime = fmtTime(
          String(period.open.hour).padStart(2,'0') + String(period.open.minute).padStart(2,'0')
        );
        const closeTime = period.close
          ? fmtTime(String(period.close.hour).padStart(2,'0') + String(period.close.minute).padStart(2,'0'))
          : '23:59';
        hours[day] = { open: openTime, close: closeTime, closed: false };
      }
    }

    const details: PlaceDetails = {
      name: data.displayName?.text ?? '',
      address: data.formattedAddress ?? '',
      phone: data.nationalPhoneNumber ?? undefined,
      website: data.websiteUri ?? undefined,
      hours,
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      reviewCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
    };

    return NextResponse.json(details);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
