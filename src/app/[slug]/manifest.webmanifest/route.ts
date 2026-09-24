import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * A business page's own manifest.
 *
 * Every page in the app used to inherit the root manifest, whose start_url is
 * the owner's app. So a customer who added a shop to their home screen got a
 * shortcut that opened OpenStatus asking them to sign in — someone else's
 * product, for a button they thought said "Emma's Coffee".
 *
 * This is the shop: named after it, opening on it, scoped to it.
 */

export const dynamic = 'force-dynamic';

const ICONS = [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

/** Home screens have very little room. Anything longer gets an ellipsis. */
function shortName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.length <= 12 ? firstWord : trimmed.slice(0, 12);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clean = slug.toLowerCase();

  let name = 'OpenStatus';
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from('businesses')
      .select('name')
      .eq('slug', clean)
      .maybeSingle();
    if (data?.name?.trim()) name = data.name.trim();
  } catch {/* an unnamed shortcut still beats a broken one */}

  return NextResponse.json(
    {
      name,
      short_name: shortName(name),
      description: `Open, closed and today's hours for ${name}.`,
      start_url: `/${clean}`,
      // The page is one screen with outbound links; scoping to the whole site
      // would swallow every tap on the owner's website into this shortcut.
      scope: `/${clean}`,
      id: `/${clean}`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F4F5F6',
      theme_color: '#F4F5F6',
      icons: ICONS,
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    },
  );
}
