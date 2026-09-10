import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

type Period = {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
};

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// Places returns opening periods as day/hour/minute. Turn that into the
// seven rows we store, so a business never has to type their hours in.
function toRows(periods: Period[]) {
  const rows = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    day_of_week: d,
    opens_at: null as string | null,
    closes_at: null as string | null,
    is_closed: true,
  }));

  for (const p of periods) {
    const d = p.open?.day;
    if (d === undefined || d < 0 || d > 6) continue;
    const oh = p.open?.hour ?? 0;
    const om = p.open?.minute ?? 0;
    const ch = p.close?.hour;
    const cm = p.close?.minute ?? 0;

    rows[d].opens_at = pad(oh) + ':' + pad(om);
    // No close time means open 24 hours on that day.
    rows[d].closes_at = ch === undefined ? '23:59' : pad(ch) + ':' + pad(cm);
    rows[d].is_closed = false;
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'Place search is not configured yet' },
      { status: 500 }
    );
  }

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

  const body = await req.json().catch(() => ({}));
  const query: string = (body.query ?? '').toString().trim();
  const placeId: string | undefined = body.placeId;

  // Second call: the owner picked a place, so store its hours.
  if (placeId) {
    const res = await fetch(
      'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId),
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'id,displayName,formattedAddress,regularOpeningHours',
        },
      }
    );
    const place = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: place?.error?.message ?? 'Could not read that place' },
        { status: 502 }
      );
    }

    const periods: Period[] = place.regularOpeningHours?.periods ?? [];
    if (periods.length === 0) {
      return NextResponse.json({
        imported: false,
        reason: 'Google has no opening hours listed for that place',
      });
    }

    const rows = toRows(periods).map((r) => ({ ...r, business_id: business.id }));
    const { error: e } = await admin
      .from('business_hours')
      .upsert(rows, { onConflict: 'business_id,day_of_week' });

    if (e) return NextResponse.json({ error: e.message }, { status: 500 });

    return NextResponse.json({
      imported: true,
      name: place.displayName?.text ?? null,
      address: place.formattedAddress ?? null,
      rows: rows.map((r) => ({
        day: r.day_of_week,
        opens: r.opens_at,
        closes: r.closes_at,
        closed: r.is_closed,
      })),
    });
  }

  // First call: search by name so the owner can pick the right listing.
  if (query.length < 3) {
    return NextResponse.json({ error: 'Type at least three characters' }, { status: 400 });
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
  });
  const found = await res.json();

  if (!res.ok) {
    return NextResponse.json(
      { error: found?.error?.message ?? 'Search failed' },
      { status: 502 }
    );
  }

  const places = (found.places ?? []).map(
    (p: { id: string; displayName?: { text?: string }; formattedAddress?: string }) => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unnamed',
      address: p.formattedAddress ?? '',
    })
  );

  return NextResponse.json({ places });
}
