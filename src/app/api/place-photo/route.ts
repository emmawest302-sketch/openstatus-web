import { NextRequest, NextResponse } from 'next/server';

// Proxy Google Place photos so the API key stays server-side
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref');
  if (!ref) return new NextResponse('Missing ref', { status: 400 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? '';
  if (!apiKey) return new NextResponse('No API key', { status: 500 });

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${ref}&key=${apiKey}`;

  const upstream = await fetch(url);
  if (!upstream.ok) return new NextResponse('Photo not found', { status: 404 });

  const blob = await upstream.blob();
  return new NextResponse(blob, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
