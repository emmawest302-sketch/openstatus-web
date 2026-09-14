import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const EVENT_TYPES = new Set(['page_view','block_click','directions_click','social_click']);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const businessId = typeof body?.businessId === 'string' ? body.businessId : '';
  const eventType = typeof body?.eventType === 'string' ? body.eventType : '';
  const blockId = typeof body?.blockId === 'string' ? body.blockId.slice(0, 80) : null;
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.slice(0, 80) : null;
  const path = typeof body?.path === 'string' ? body.path.slice(0, 240) : null;
  const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 500) : null;

  if (!businessId || !EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: business } = await admin.from('businesses').select('id').eq('id', businessId).maybeSingle();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const { error } = await admin.from('page_events').insert({
    business_id: businessId,
    event_type: eventType,
    block_id: blockId,
    visitor_id: visitorId,
    path,
    referrer,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
