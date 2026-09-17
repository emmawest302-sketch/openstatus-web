import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type DayKey = 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';
const DAY_KEYS: DayKey[] = ['sun','mon','tue','wed','thu','fri','sat'];

function fmtTime(t: string): string {
  // Google returns "0900" → "09:00"
  return t.length === 4 ? `${t.slice(0,2)}:${t.slice(2)}` : t;
}

function extractSearchQuery(url: string): string | null {
  try {
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) return null;
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/\/maps\/place\/([^/@?]+)/);
    if (match) return match[1].replace(/\+/g, ' ');
    return null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 });

  const query = extractSearchQuery(url);
  if (!query) {
    return NextResponse.json(
      { error: 'Use the full Google Maps URL — not a short link. Open Google Maps, find your business, and copy the URL from the address bar.' },
      { status: 422 }
    );
  }

  // Step 1: Find place_id
  const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name&key=${key}`;
  const findRes = await fetch(findUrl);
  const findData = await findRes.json() as {
    status: string;
    candidates: Array<{ place_id: string; name: string }>;
  };

  if (findData.status !== 'OK' || !findData.candidates?.length) {
    return NextResponse.json({ error: `Business not found (${findData.status}). Try copying the URL directly from Google Maps.` }, { status: 404 });
  }

  const placeId = findData.candidates[0].place_id;

  // Step 2: Fetch full details
  const fields = 'name,rating,user_ratings_total,formatted_address,formatted_phone_number,international_phone_number,website,opening_hours,photos,reviews';
  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${key}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json() as {
    status: string;
    result: {
      name?: string;
      rating?: number;
      user_ratings_total?: number;
      formatted_address?: string;
      formatted_phone_number?: string;
      international_phone_number?: string;
      website?: string;
      opening_hours?: {
        periods?: Array<{
          open: { day: number; time: string };
          close?: { day: number; time: string };
        }>;
      };
      photos?: Array<{ photo_reference: string; width: number; height: number }>;
      reviews?: Array<{
        author_name: string;
        rating: number;
        text: string;
        relative_time_description: string;
      }>;
    };
  };

  if (detailData.status !== 'OK') {
    return NextResponse.json({ error: `Details unavailable (${detailData.status})` }, { status: 404 });
  }

  const r = detailData.result;

  // Build weekly hours: day 0=Sun … 6=Sat
  let weeklyHours: Record<DayKey, { open: string; close: string; closed: boolean }> | undefined;
  if (r.opening_hours?.periods) {
    const base = Object.fromEntries(DAY_KEYS.map(k => [k, { open: '09:00', close: '17:00', closed: true }])) as Record<DayKey, { open: string; close: string; closed: boolean }>;
    for (const period of r.opening_hours.periods) {
      const key = DAY_KEYS[period.open.day];
      if (key) {
        base[key] = {
          open: fmtTime(period.open.time),
          close: period.close ? fmtTime(period.close.time) : '23:59',
          closed: false,
        };
      }
    }
    weeklyHours = base;
  }

  // Resolve first photo to a usable URL (follow the redirect server-side)
  let photoUrl: string | undefined;
  if (r.photos?.[0]?.photo_reference) {
    try {
      const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${r.photos[0].photo_reference}&key=${key}`;
      const photoRes = await fetch(photoApiUrl, { redirect: 'follow' });
      if (photoRes.ok) photoUrl = photoRes.url;
    } catch { /* skip */ }
  }

  return NextResponse.json({
    name: r.name,
    rating: r.rating,
    reviewCount: r.user_ratings_total,
    address: r.formatted_address,
    phone: r.formatted_phone_number ?? r.international_phone_number,
    website: r.website,
    weeklyHours,
    photoUrl,
    reviews: r.reviews?.slice(0, 5).map(rv => ({
      author: rv.author_name,
      rating: rv.rating,
      text: rv.text,
      time: rv.relative_time_description,
    })),
  });
}
