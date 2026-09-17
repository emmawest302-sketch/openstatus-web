import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function extractSearchQuery(url: string): string | null {
  try {
    if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) return null;
    const decoded = decodeURIComponent(url);
    const placeMatch = decoded.match(/\/maps\/place\/([^/@?]+)/);
    if (placeMatch) return placeMatch[1].replace(/\+/g, ' ');
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
      { error: 'Could not read business name from URL. Use the full Google Maps URL, not a short link.' },
      { status: 422 }
    );
  }

  const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,rating,user_ratings_total&key=${key}`;
  const findRes = await fetch(findUrl);
  const findData = await findRes.json() as {
    status: string;
    candidates: Array<{ place_id: string; name: string; rating?: number; user_ratings_total?: number }>;
  };

  if (findData.status !== 'OK' || !findData.candidates?.length) {
    return NextResponse.json({ error: `Business not found (${findData.status})` }, { status: 404 });
  }

  const place = findData.candidates[0];

  if (place.rating !== undefined) {
    return NextResponse.json({ name: place.name, rating: place.rating, reviewCount: place.user_ratings_total ?? 0 });
  }

  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total&key=${key}`;
  const detailRes = await fetch(detailUrl);
  const detailData = await detailRes.json() as {
    status: string;
    result: { name: string; rating?: number; user_ratings_total?: number };
  };

  if (detailData.status !== 'OK') {
    return NextResponse.json({ error: `Details unavailable (${detailData.status})` }, { status: 404 });
  }

  return NextResponse.json({
    name: detailData.result.name,
    rating: detailData.result.rating ?? 0,
    reviewCount: detailData.result.user_ratings_total ?? 0,
  });
}
