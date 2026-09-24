import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { OWNER_COOKIE, readOwnerSession } from '@/lib/owner-link';

/**
 * The owner's own manifest.
 *
 * The global one at /manifest.webmanifest names the app "OpenStatus", which is
 * the wrong name for the thing an owner is installing. What goes next to
 * Instagram on their phone is *their shop* — so this serves a manifest named
 * after the business, and the icon on the home screen reads "Herban Market".
 *
 * start_url stays /me with no token in it. The session cookie is good for 400
 * days and carries into the installed app, so the shortcut does not need to
 * hold a secret that would then live in a bookmark forever.
 *
 * Note the caller has to fetch this with credentials — a <link rel="manifest">
 * is fetched *without* cookies by default, which would make every owner get
 * the anonymous fallback below. The tag on /me sets crossOrigin="use-credentials".
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

export async function GET() {
  const jar = await cookies();
  const session = readOwnerSession(jar.get(OWNER_COOKIE)?.value);

  let name = 'OpenStatus';
  let description = 'Change your hours everywhere, in one tap.';

  if (session) {
    const admin = getAdminClient();
    const { data } = await admin
      .from('businesses')
      .select('name')
      .eq('id', session.businessId)
      .maybeSingle();
    if (data?.name?.trim()) {
      name = data.name.trim();
      description = `Open, closed and today's hours for ${name}.`;
    }
  }

  return NextResponse.json(
    {
      name,
      short_name: shortName(name),
      description,
      start_url: '/me',
      scope: '/me',
      id: '/me',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#F4F5F6',
      theme_color: '#F4F5F6',
      icons: ICONS,
      // Long-press the icon. Both land on /me, which reads the parameter and
      // opens straight into that control rather than making the owner find it
      // again on a morning when they are already late.
      shortcuts: [
        { name: 'Closing early today', short_name: 'Close early', url: '/me?do=close' },
        { name: "We're open", short_name: 'Open now', url: '/me?do=open' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        // Per-owner, and it carries their business name. Never let a CDN or a
        // shared proxy hand one owner's manifest to another.
        'Cache-Control': 'private, no-store',
      },
    }
  );
}
