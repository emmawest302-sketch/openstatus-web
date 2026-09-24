import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  const type = req.nextUrl.searchParams.get('type') ?? 'info'; // 'info' | 'photos' | 'reviews'

  if (!businessId) return NextResponse.json({ error: 'Missing businessId' }, { status: 400 });

  const admin = getAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('place_id')
    .eq('id', businessId)
    .maybeSingle();

  const placeId = business?.place_id as string | null;
  if (!placeId) {
    if (type === 'photos') return NextResponse.json({ photos: [] });
    if (type === 'reviews') return NextResponse.json({ reviews: [], rating: null, reviewCount: 0, url: null });
    return NextResponse.json({ rating: null, reviewCount: 0 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  if (type === 'reviews') {
    // The legacy Details endpoint caps reviews at five and gives no control
    // over which five; the v1 endpoint is what /api/places/details already
    // uses for this place, so the key and the quota are known to work.
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews,rating,userRatingCount,googleMapsUri' },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return NextResponse.json({ reviews: [], rating: null, reviewCount: 0, url: null });

    const data = await res.json() as {
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      reviews?: Array<{
        rating?: number;
        relativePublishTimeDescription?: string;
        text?: { text?: string };
        originalText?: { text?: string };
        authorAttribution?: { displayName?: string; photoUri?: string };
      }>;
    };

    // Reviews are other people's words about someone's livelihood. Pass them
    // through as written or not at all — no trimming to fit, no paraphrase.
    const reviews = (data.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? 'Google user',
        photo: r.authorAttribution?.photoUri ?? null,
        rating: typeof r.rating === 'number' ? r.rating : null,
        when: r.relativePublishTimeDescription ?? '',
        text: (r.text?.text ?? r.originalText?.text ?? '').trim(),
      }))
      .filter((r) => r.text.length > 0)
      .slice(0, 5);

    return NextResponse.json({
      reviews,
      rating: data.rating ?? null,
      reviewCount: data.userRatingCount ?? 0,
      url: data.googleMapsUri ?? null,
    });
  }

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
