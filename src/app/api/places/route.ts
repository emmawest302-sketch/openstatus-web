import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  const type = req.nextUrl.searchParams.get('type') ?? 'info'; // 'info' | 'photos'

  if (!businessId) return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });

  const admin = getAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('place_id')
    .eq('id', businessId)
    .maybeSingle();

  const placeId = business?.place_id as string | null;
  if (!placeId) {
    return type === 'photos'
      ? NextResponse.json({ photos: [] })
      : NextResponse.json({ rating: null, reviewCount: 0 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  if (type === 'photos') {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json() as { result?: { photos?: Array<{ photo_reference: string }> } };
    const refs = (data.result?.photos ?? []).slice(0, 6).map((p) => p.photo_reference);
    return NextResponse.json({ photos: refs });
  }

  // Default: rating info
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json() as { result?: { rating?: number; user_ratings_total?: number } };
  return NextResponse.json({
    rating: data.result?.rating ?? null,
    reviewCount: data.result?.user_ratings_total ?? 0,
  });
}
