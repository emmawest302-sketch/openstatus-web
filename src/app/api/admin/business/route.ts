import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'emeline@forothers.com,emmawest302@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());

async function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  // Accept simple passcode auth
  if (auth === 'Passcode 6869959799') return getAdminClient();
  // Fall back to JWT email check
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;
  const admin = getAdminClient();
  const { data: userData, error } = await admin.auth.getUser(jwt);
  if (error || !userData.user) return null;
  const email = (userData.user.email ?? '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;
  return admin;
}

// PATCH /api/admin/business — edit a business
export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 });

  const updates: Record<string, string | null> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 100) || null;
  if (typeof body.slug === 'string') updates.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60) || null;
  if (typeof body.tagline === 'string') updates.tagline = body.tagline.trim().slice(0, 200) || null;
  if (typeof body.phone === 'string') updates.phone = body.phone.trim().slice(0, 30) || null;
  if (typeof body.address === 'string') updates.address = body.address.trim().slice(0, 300) || null;
  if (typeof body.website === 'string') updates.website = body.website.trim().slice(0, 200) || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { error } = await admin.from('businesses').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/business — delete a business
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 });

  // Delete related data first (cascade-safe order)
  await admin.from('status_updates').delete().eq('business_id', id);
  await admin.from('page_events').delete().eq('business_id', id);
  await admin.from('business_hours').delete().eq('business_id', id);

  const { error } = await admin.from('businesses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
