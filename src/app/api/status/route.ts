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

/** End of an arbitrary local date, so a closure can cover a range or a future day. */
function zonedEndOfDate(timeZone: string, y: number, m: number, d: number) {
  const desired = Date.UTC(y, m - 1, d, 23, 59, 59);
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
    // '*' on purpose: tolerates opens_at not existing yet, so deploying before
    // running the migration degrades to the old behaviour instead of 500ing.
    .select('*')
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

  // Mirrors a Google specialHours closure into OpenStatus, so the business's own
  // page goes closed too instead of only the Google listing.
  if (action === 'closed_dates') {
    const DATE = /^\d{4}-\d{2}-\d{2}$/;
    const startDate = typeof body?.startDate === 'string' && DATE.test(body.startDate) ? body.startDate : null;
    const endDate = typeof body?.endDate === 'string' && DATE.test(body.endDate) ? body.endDate : startDate;
    if (!startDate || !endDate) return NextResponse.json({ error: 'Need a start and end date' }, { status: 400 });
    if (endDate < startDate) return NextResponse.json({ error: 'End date is before the start date' }, { status: 400 });

    const headline = typeof body?.headline === 'string' && body.headline.trim()
      ? body.headline.trim().slice(0, 80)
      : 'Closed';

    const timezone = actor.timezone || 'America/Chicago';
    const [ey, em, ed] = endDate.split('-').map(Number);

    await actor.admin
      .from('status_updates')
      .delete()
      .eq('business_id', actor.businessId)
      .eq('source', 'owner')
      .eq('status', 'active');

    const { data, error } = await actor.admin
      .from('status_updates')
      .insert({
        business_id: actor.businessId,
        kind: 'closed',
        headline,
        detail: startDate === endDate ? null : `Closed ${startDate} to ${endDate}`,
        closes_at: null,
        reason: null,
        effective_date: startDate,
        expires_at: zonedEndOfDate(timezone, ey, em, ed),
        confidence: 1,
        status: 'active',
        source: 'owner',
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (action === 'publish') {
    const preset = body?.preset;
    if (preset !== 'closed_today' && preset !== 'early_close' && preset !== 'note_today' && preset !== 'custom_hours') {
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

    // Different hours for today only — both ends, not just an early close.
    const opensAt = typeof body?.opensAt === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.opensAt)
      ? body.opensAt
      : null;
    if (preset === 'custom_hours' && (!opensAt || !closesAt)) {
      return NextResponse.json({ error: 'Choose an opening and a closing time' }, { status: 400 });
    }
    if (preset === 'custom_hours' && opensAt && closesAt && closesAt <= opensAt) {
      return NextResponse.json({ error: 'Closing time has to be after the opening time' }, { status: 400 });
    }

    const timezone = actor.timezone || 'America/Chicago';
    const { year, month, day } = localDateParts(timezone);
    const effectiveDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const update = preset === 'closed_today'
      ? { kind: 'closed', headline: 'Closed today', detail: 'Closed for the rest of today', closes_at: null }
      : preset === 'early_close'
        // 'hours' rather than 'closed': the shop is still open, just not as late.
        // Marking it 'closed' made the public page treat an early close as shut.
        ? { kind: 'hours', headline: `Closing early at ${displayTime(closesAt!)}`, detail: null, closes_at: closesAt }
        : preset === 'custom_hours'
          ? {
              kind: 'hours',
              headline: `Today ${displayTime(opensAt!)} \u2013 ${displayTime(closesAt!)}`,
              detail: 'Different hours today',
              closes_at: closesAt,
              // Without this the page reads the opening time off the regular
              // schedule and can report the shop open before it opens.
              opens_at: opensAt,
            }
          : { kind: 'other', headline: note, detail: null, closes_at: null };

    const { error: clearError } = await actor.admin
      .from('status_updates')
      .delete()
      .eq('business_id', actor.businessId)
      .eq('source', 'owner')
      .eq('status', 'active');
    if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

    const row: Record<string, unknown> = {
      business_id: actor.businessId,
      ...update,
      reason: reason || null,
      effective_date: effectiveDate,
      expires_at: zonedEndOfDay(timezone),
      confidence: 1,
      status: 'active',
      source: 'owner',
    };

    let { data, error } = await actor.admin
      .from('status_updates')
      .insert(row)
      .select('id')
      .single();

    // If supabase_migration_status_opens_at.sql has not been run yet, retry
    // without that column rather than failing the owner's save outright. They
    // lose the custom opening time, not the whole update.
    if (error && 'opens_at' in row && /opens_at/i.test(error.message)) {
      delete row.opens_at;
      ({ data, error } = await actor.admin
        .from('status_updates')
        .insert(row)
        .select('id')
        .single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Nullable now that the insert can go through the retry path above.
    return NextResponse.json({ ok: true, id: data?.id ?? null });
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
