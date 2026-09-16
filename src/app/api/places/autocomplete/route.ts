import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')?.trim();
  if (!input || input.length < 2) return NextResponse.json({ places: [] });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ places: [] });
  try {
    // Use Places API (New) Text Search for business listings
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: input, maxResultCount: 6 }),
    });
    const data = await res.json() as { places?: { id: string; displayName?: { text?: string }; formattedAddress?: string }[] };
    if (!res.ok || !data.places) return NextResponse.json({ places: [] });
    return NextResponse.json({
      places: data.places.map(p => ({
        id: p.id,
        name: p.displayName?.text ?? 'Unnamed',
        address: p.formattedAddress ?? '',
      })),
    });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
