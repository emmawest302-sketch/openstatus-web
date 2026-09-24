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

async function businessFor(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data: userData, error } = await admin.auth.getUser(jwt);
  if (error || !userData.user) return null;

  const { data: business } = await admin
    .from('businesses')
    .select('id, owner_token')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return business ? { admin, business } : null;
}

export async function GET(req: NextRequest) {
  const ctx = await businessFor(req);
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let token = ctx.business.owner_token as string | null;
  if (!token) {
    token = generateOwnerToken();
    const { error } = await ctx.admin
      .from('businesses')
      .update({ owner_token: token, owner_token_created_at: new Date().toISOString() })
      .eq('id', ctx.business.id);
    if (error) {
      // Most likely the column does not exist yet, i.e. the migration has not
      // been run. Say so plainly rather than returning a broken link.
      return NextResponse.json(
        { error: 'Owner links are not set up yet. Run the owner link migration.' },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({ url: ownerLinkUrl(SITE_URL, token) });
}

/** Rotate. Every device holding the old link stops working immediately. */
export async function POST(req: NextRequest) {
  const ctx = await businessFor(req);
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const token = generateOwnerToken();
  const { error } = await ctx.admin
    .from('businesses')
    .update({ owner_token: token, owner_token_created_at: new Date().toISOString() })
    .eq('id', ctx.business.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: ownerLinkUrl(SITE_URL, token) });
}
