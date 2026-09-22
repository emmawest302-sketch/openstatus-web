import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'emeline@forothers.com,emmawest302@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());

const ADMIN_PASSCODE = '6869959799';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const admin = getAdminClient();

  // Accept passcode auth
  if (auth !== `Passcode ${ADMIN_PASSCODE}`) {
    // Fall back to JWT email check
    const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const userEmail = (userData.user.email ?? '').toLowerCase();
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  // Fetch all businesses with user info
  const { data: businesses, error: bizErr } = await admin
    .from('businesses')
    .select('id, name, slug, tagline, avatar_url, created_at, user_id, instagram_handle')
    .order('created_at', { ascending: false });

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });

  // Fetch hours counts per business
  const { data: hoursCounts } = await admin
    .from('business_hours')
    .select('business_id')
    .in('business_id', (businesses ?? []).map(b => b.id));

  const hoursSet = new Set((hoursCounts ?? []).map(h => h.business_id));

  // Get user emails by fetching auth users — batch by listing
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailByUserId: Record<string, string> = {};
  for (const u of authUsers ?? []) {
    emailByUserId[u.id] = u.email ?? '';
  }

  const rows = (businesses ?? []).map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    tagline: b.tagline,
    avatar_url: b.avatar_url,
    created_at: b.created_at,
    user_id: b.user_id,
    email: emailByUserId[b.user_id] ?? '',
    instagram_handle: b.instagram_handle,
    has_hours: hoursSet.has(b.id),
    completion: calcCompletion(b, hoursSet.has(b.id)),
  }));

  return NextResponse.json({ rows, total: rows.length });
}

function calcCompletion(b: { slug?: string | null; avatar_url?: string | null; instagram_handle?: string | null }, hasHours: boolean): number {
  let score = 0;
  if (b.slug) score++;
  if (b.avatar_url) score++;
  if (hasHours) score++;
  if (b.instagram_handle) score++;
  return Math.round((score / 4) * 100);
}
