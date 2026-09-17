import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('businessId');
  if (!businessId) return NextResponse.json({ up: 0, down: 0 });

  const admin = getAdminClient();
  const { data } = await admin
    .from('business_votes')
    .select('vote')
    .eq('business_id', businessId);

  const up = data?.filter((v) => v.vote === 'up').length ?? 0;
  const down = data?.filter((v) => v.vote === 'down').length ?? 0;
  return NextResponse.json({ up, down });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { businessId, vote, fingerprint } = body ?? {};
  if (!businessId || !vote || !fingerprint) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (vote !== 'up' && vote !== 'down') {
    return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: existing } = await admin
    .from('business_votes')
    .select('id, vote')
    .eq('business_id', businessId)
    .eq('fingerprint', fingerprint)
    .maybeSingle();

  if (existing) {
    if (existing.vote === vote) {
      // Toggle off — remove the vote
      await admin.from('business_votes').delete().eq('id', existing.id);
      return NextResponse.json({ action: 'removed' });
    }
    // Switch vote direction
    await admin.from('business_votes').update({ vote }).eq('id', existing.id);
    return NextResponse.json({ action: 'changed' });
  }

  await admin.from('business_votes').insert({ business_id: businessId, fingerprint, vote });
  return NextResponse.json({ action: 'added' });
}
