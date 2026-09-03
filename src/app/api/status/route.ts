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
    .select('id, timezone')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return business ? { admin, businessId: business.id, timezone: business.timezone } : null;
}

function localDateParts(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { year: Number(value('year')), month: Number(value('month')), day: Number(value('day')) };
}

function zonedEndOfDay(timeZone: string) {
  const { year, month, day } = localDateParts(timeZone);
  const desired = Date.UTC(year, month - 1, day, 23, 59, 59);
  let guess = desired;

  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(guess));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
    guess += desired - represented;
  }

  return new Date(guess).toISOString();
}

function displayTime(value: string) {
  const [hourText, minute] = value.split(':');
  let hour = Number(hourText);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${meridiem}`;
}

export async function GET(req: NextRequest) {
  const actor = await getBusiness(req);
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const requestedBusinessId = req.nextUrl.searchParams.get('businessId');
  const isOwner = !requestedBusinessId || requestedBusinessId === actor.businessId;
  if (!isOwner) return NextResponse.json({ isOwner: false, updates: [] });

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

  return NextResponse.json({ isOwner: true, updates: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await getBusiness(req);
  if (!actor) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const action = body?.action;

  if (action === 'clear') {
    const { error } = await actor.admin
      .from('status_updates')
      .delete()
      .eq('business_id', actor.businessId)
      .eq('source', 'owner')
      .eq('status', 'active');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === 'publish') {
    const preset = body?.preset;
    if (preset !== 'closed_today' && preset !== 'early_close' && preset !== 'note_today') {
      return NextResponse.json({ error: 'Choose a valid status update' }, { status: 400 });
    }

    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 120) : '';
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 100) : '';
    const closesAt = typeof body?.closesAt === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.closesAt)
      ? body.closesAt
      : null;
    if (preset === 'early_close' && !closesAt) {
      return NextResponse.json({ error: 'Choose today’s closing time' }, { status: 400 });
    }
    if (preset === 'note_today' && !note) {
      return NextResponse.json({ error: 'Write the update customers should see' }, { status: 400 });
    }

    const timezone = actor.timezone || 'America/Chicago';
    const { year, month, day } = localDateParts(timezone);
    const effectiveDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const update = preset === 'closed_today'
      ? { kind: 'closed', headline: 'Closed today', detail: 'Closed for the rest of today', closes_at: null }
      : preset === 'early_close'
        ? { kind: 'early_close', headline: `Closing early at ${displayTime(closesAt!)}`, detail: null, closes_at: closesAt }
        : { kind: 'other', headline: note, detail: null, closes_at: null };

    const { error: clearError } = await actor.admin
      .from('status_updates')
      .delete()
      .eq('business_id', actor.businessId)
      .eq('source', 'owner')
      .eq('status', 'active');
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

    const { data, error } = await actor.admin
      .from('status_updates')
      .insert({
        business_id: actor.businessId,
        ...update,
        reason: reason || null,
        effective_date: effectiveDate,
        expires_at: zonedEndOfDay(timezone),
        confidence: 1,
        status: 'active',
        source: 'owner',
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

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
