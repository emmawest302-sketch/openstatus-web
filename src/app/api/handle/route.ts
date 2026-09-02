import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { normaliseHandle, validateHandle } from '@/lib/handles';

// Checks whether a page address is free. Runs server side because the
// businesses table is not readable without a session.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('handle') ?? '';
  const handle = normaliseHandle(raw);

  const shape = validateHandle(handle);
  if (!shape.ok) {
    return NextResponse.json({ handle, available: false, reason: shape.reason });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('businesses')
    .select('id')
    .eq('slug', handle)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { handle, available: false, reason: 'Could not check right now' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    handle,
    available: !data,
    reason: data ? 'Already taken' : undefined,
  });
}
