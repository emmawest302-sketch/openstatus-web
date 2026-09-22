import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * DELETE /api/account/delete
 *
 * Self-service account deletion. The caller can ONLY ever delete themselves:
 * the user id is taken from the verified JWT, never from the request body, so
 * there is no way to pass someone else's id and have it honoured.
 *
 * Requires the caller to send `confirm: "DELETE"` in the body so a stray
 * request can't wipe an account by accident.
 */
export async function DELETE(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => null) as { confirm?: string } | null;
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Missing confirmation' }, { status: 400 });
  }

  const admin = getAdminClient();

  // Identity comes from the token, not the client.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  const userId = userData.user.id;

  // Remove owned data first, scoped to this user's own businesses.
  const { data: businesses } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userId);

  for (const b of businesses ?? []) {
    await admin.from('status_updates').delete().eq('business_id', b.id);
    await admin.from('page_events').delete().eq('business_id', b.id);
    await admin.from('business_hours').delete().eq('business_id', b.id);
  }
  await admin.from('businesses').delete().eq('user_id', userId);

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
