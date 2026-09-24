import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { generateOwnerToken, ownerLinkUrl } from '@/lib/owner-link';
import { SITE_URL } from '@/lib/site';

/**
 * Hands the signed-in owner their own link, creating one the first time.
 *
 * Only reachable with a real Supabase session — the builder. The owner-link
 * cookie deliberately does NOT work here: a link should not be able to mint
 * or read itself, or a borrowed phone becomes permanent access.
 */

export const dynamic = 'force-dynamic';

/**
 * Three different failures, three different answers.
 *
 * This used to fold all of them into one null and a "Not signed in" message.
 * So when the owner_token column did not exist yet, the select failed, the
 * business came back null, and a perfectly signed-in owner was told they were
 * signed out. The real problem — an unrun migration — was invisible.
 */
type Resolved =
  | { ok: true; admin: ReturnType<typeof getAdminClient>; businessId: string; token: string | null }
  | { ok: false; error: string; status: 401 | 404 | 503 };

async function businessFor(req: NextRequest): Promise<Resolved> {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return { ok: false, error: 'Not signed in', status: 401 };

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return { ok: false, error: 'Not signed in', status: 401 };

  // Only columns that certainly exist, so a missing one cannot masquerade as
  // a missing business.
  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (bizErr) return { ok: false, error: bizErr.message, status: 503 };
  if (!business) return { ok: false, error: 'No business found on this account', status: 404 };

  // Now the column that may not be there yet.
  const { data: row, error: tokenErr } = await admin
    .from('businesses')
    .select('owner_token')
    .eq('id', business.id)
    .maybeSingle();

  if (tokenErr) {
    return {
      ok: false,
      status: 503,
      error: 'Phone links are not set up on the database yet. Run supabase_migration_owner_link.sql in the Supabase SQL editor, then reload.',
    };
  }

  return { ok: true, admin, businessId: business.id, token: (row?.owner_token as string | null) ?? null };
}

export async function GET(req: NextRequest) {
  const ctx = await businessFor(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let token = ctx.token;
  if (!token) {
    token = generateOwnerToken();
    const { error } = await ctx.admin
      .from('businesses')
      .update({ owner_token: token, owner_token_created_at: new Date().toISOString() })
      .eq('id', ctx.businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  }

  return NextResponse.json({ url: ownerLinkUrl(SITE_URL, token) });
}

/** Rotate. Every device holding the old link stops working immediately. */
export async function POST(req: NextRequest) {
  const ctx = await businessFor(req);
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const token = generateOwnerToken();
  const { error } = await ctx.admin
    .from('businesses')
    .update({ owner_token: token, owner_token_created_at: new Date().toISOString() })
    .eq('id', ctx.businessId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: ownerLinkUrl(SITE_URL, token) });
}
