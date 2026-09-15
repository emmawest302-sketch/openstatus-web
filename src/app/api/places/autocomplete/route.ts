import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')?.trim();
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ predictions: [] });
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('types', 'address');
    url.searchParams.set('key', key);
    const res = await fetch(url.toString());
    const data = await res.json() as { predictions?: { description: string; place_id: string }[]; status?: string };
    if (!res.ok || !data.predictions) return NextResponse.json({ predictions: [] });
    return NextResponse.json({
      predictions: data.predictions.slice(0, 5).map(p => ({
        description: p.description,
        place_id: p.place_id,
      })),
    });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
