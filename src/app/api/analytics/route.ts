import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

const EVENT_TYPES = new Set(['page_view','block_click','directions_click','social_click']);

function sourceLabel(referrer: string | null) {
  if (!referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('facebook')) return 'Facebook';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('google')) return 'Google';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('linkedin')) return 'LinkedIn';
    return host || 'Direct';
  } catch {
    return 'Direct';
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const daysParam = Number(req.nextUrl.searchParams.get('days') || 30);
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const admin = getAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { data: business } = await admin.from('businesses').select('id').eq('user_id', userData.user.id).maybeSingle();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data: rows, error } = await admin
    .from('page_events')
    .select('event_type, block_id, visitor_id, referrer, created_at')
    .eq('business_id', business.id)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    const missing = /page_events|relation.*does not exist/i.test(error.message);
    return NextResponse.json({ error: missing ? 'Analytics storage is not set up yet.' : error.message, needsSetup: missing }, { status: missing ? 503 : 500 });
  }

  const events = rows ?? [];
  const pageViews = events.filter((e) => e.event_type === 'page_view');
  const uniqueVisitors = new Set(pageViews.map((e) => e.visitor_id).filter(Boolean)).size;
  const blockCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const daily: Record<string, { views: number; clicks: number }> = {};

  for (const event of events) {
    const day = event.created_at.slice(0, 10);
    daily[day] ??= { views: 0, clicks: 0 };
    if (event.event_type === 'page_view') {
      daily[day].views += 1;
      const source = sourceLabel(event.referrer);
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    } else {
      daily[day].clicks += 1;
    }
    if (event.block_id) blockCounts[event.block_id] = (blockCounts[event.block_id] || 0) + 1;
  }

  const metric = (id: string) => blockCounts[id] || 0;
  const directions = metric('map') || events.filter((e) => e.event_type === 'directions_click').length;
  const menu = metric('menu');
  const orders = metric('order');
  const topActions = Object.entries(blockCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, count]) => ({ id, count }));
  const trafficSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => ({ source, count }));
  const trend = Object.entries(daily).map(([date, values]) => ({ date, ...values }));

  return NextResponse.json({
    days,
    metrics: { views: pageViews.length, uniqueVisitors, directions, menu, orders, clicks: events.length - pageViews.length },
    topActions,
    trafficSources,
    trend,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const businessId = typeof body?.businessId === 'string' ? body.businessId : '';
  const eventType = typeof body?.eventType === 'string' ? body.eventType : '';
  const blockId = typeof body?.blockId === 'string' ? body.blockId.slice(0, 80) : null;
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.slice(0, 80) : null;
  const path = typeof body?.path === 'string' ? body.path.slice(0, 240) : null;
  const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 500) : null;

  if (!businessId || !EVENT_TYPES.has(eventType)) return NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 });

  const admin = getAdminClient();
  const { data: business } = await admin.from('businesses').select('id').eq('id', businessId).maybeSingle();
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const { error } = await admin.from('page_events').insert({ business_id: businessId, event_type: eventType, block_id: blockId, visitor_id: visitorId, path, referrer });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
