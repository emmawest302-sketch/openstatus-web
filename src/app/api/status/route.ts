import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

async function getBusiness(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return null;

  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return business ? { admin, businessId: business.id } : null;
}

export async function GET(req: NextRequest) {
  const actor = await getBusiness(req);
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const { data, error } = await actor.admin
    .from('status_updates')
    .select('id, kind, headline, detail, reason, closes_at, confidence, status, source, created_at, expires_at')
    .eq('business_id', actor.businessId)
    .in('status', ['needs_review', 'active'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await getBusiness(req);
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const action = body?.action;

  if (!id || (action !== 'approve' && action !== 'dismiss')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (action === 'dismiss') {
    const { error } = await actor.admin
      .from('status_updates')
      .delete()
      .eq('id', id)
      .eq('business_id', actor.businessId)
      .eq('status', 'needs_review');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await actor.admin
    .from('status_updates')
    .update({
      status: 'active',
    })
    .eq('id', id)
    .eq('business_id', actor.businessId)
    .eq('status', 'needs_review')
    .select('id')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Update not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
