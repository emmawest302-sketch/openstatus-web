import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

/**
 * Writes the owner's weekly hours into business_hours, the table the public page
 * actually reads. This lives server-side on purpose: the browser client is subject
 * to row level security, and a missing DELETE/UPDATE policy there made the old
 * client-side delete-then-insert collide on business_id+day_of_week, which left
 * pages stuck reporting "closed" with no way to undo it.
 */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

type DayInput = { open?: unknown; close?: unknown; closed?: unknown };

const KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function time(value: unknown, fallback: string) {
  return typeof value === 'string' && TIME.test(value) ? value : fallback;
}

async function getBusinessId(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData.user) return null;

  // The business id always comes from the verified token, never from the body,
  // so one owner can never write another owner's hours.
  const { data: business } = await admin
    .from('businesses')
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return business ? { admin, businessId: business.id as string } : null;
}

export async function POST(req: NextRequest) {
  const actor = await getBusinessId(req);
  if (!actor) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const weekly = body?.weeklyHours;
  if (!weekly || typeof weekly !== 'object') {
    return NextResponse.json({ error: 'Missing weeklyHours' }, { status: 400 });
  }

  const rows = KEYS.map((key, index) => {
    const day = (weekly as Record<string, DayInput | undefined>)[key];
    const isClosed = !!day?.closed;
    return {
      business_id: actor.businessId,
      day_of_week: index,
      opens_at: isClosed ? null : `${time(day?.open, '09:00')}:00`,
      closes_at: isClosed ? null : `${time(day?.close, '17:00')}:00`,
      is_closed: isClosed,
    };
  });

  const { error } = await actor.admin
    .from('business_hours')
    .upsert(rows, { onConflict: 'business_id,day_of_week' });

  if (error) {
    return NextResponse.json(
      { error: 'Hours did not save to your live page: ' + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, days: rows.length });
}
