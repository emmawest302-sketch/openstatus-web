import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { OWNER_COOKIE, readOwnerSession } from '@/lib/owner-link';

/**
 * Sets the notice at the top of the public page, from the owner's phone.
 *
 * Deliberately its own endpoint rather than "save the page config with the
 * owner cookie". The phone link is a convenience key kept on a device that
 * gets lent, lost and left on counters — it should be able to say "snow day,
 * delivery only" and change today's hours, and nothing else. A general config
 * write would let whoever holds that phone replace the whole page.
 *
 * Read-modify-write on the jsonb blob, touching two keys and leaving every
 * other field exactly as saved.
 */

export const dynamic = 'force-dynamic';

const MAX = 160;

export async function POST(req: NextRequest) {
  const session = readOwnerSession(req.cookies.get(OWNER_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => null) as { text?: unknown; on?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX) : '';
  const on = typeof body.on === 'boolean' ? body.on : text.length > 0;

  const admin = getAdminClient();
  const { data: row, error: readErr } = await admin
    .from('business_page_config')
    .select('config')
    .eq('business_id', session.businessId)
    .maybeSingle();

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 503 });

  const current = (row?.config && typeof row.config === 'object')
    ? row.config as Record<string, unknown>
    : {};

  const next = { ...current, banner: text || undefined, bannerOn: on };

  const { error } = await admin
    .from('business_page_config')
    .upsert(
      { business_id: session.businessId, config: next },
      { onConflict: 'business_id' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  return NextResponse.json({ ok: true, text, on });
}
