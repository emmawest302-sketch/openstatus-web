import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

/**
 * Everything about one customer, on one screen.
 *
 * This exists because of a specific, repeated support problem: the builder saves
 * the owner's weekly hours into their Supabase user_metadata, while the public
 * page reads the `business_hours` table. When a write to that table fails, the
 * owner sees correct hours in the builder and customers see "closed" — and there
 * was no way to see the mismatch without opening the database by hand.
 *
 * So the route does not just dump rows: it compares the two sources of truth and
 * returns named checks. Anything in `checks` with ok:false is the answer to
 * "why is my page wrong?".
 */

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

type DayHours = { open?: string; close?: string; closed?: boolean };
type HoursRow = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };

type Check = { id: string; label: string; ok: boolean; detail: string };

/** "09:00:00" | "09:00" -> "09:00" */
function hhmm(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const businessId = req.nextUrl.searchParams.get('id');
  if (!businessId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data: business, error: bizErr } = await admin
    .from('businesses')
    .select('id, user_id, name, slug, tagline, address, phone, website, timezone, avatar_url, header_url, instagram_handle, google_location_id, place_id, created_at, onboarded_at')
    .eq('id', businessId)
    .maybeSingle();

  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 });
  if (!business) return NextResponse.json({ error: 'No such business' }, { status: 404 });

  const [owner, hoursRes, statusRes, tokenRes, eventsRes, votesRes] = await Promise.all([
    admin.auth.admin.getUserById(business.user_id as string),
    admin.from('business_hours').select('day_of_week, opens_at, closes_at, is_closed').eq('business_id', businessId).order('day_of_week'),
    admin.from('status_updates').select('id, kind, headline, detail, status, source, created_at, expires_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(10),
    admin.from('oauth_tokens').select('provider, expires_at, updated_at').eq('business_id', businessId),
    admin.from('page_events').select('event_type, created_at').eq('business_id', businessId).gte('created_at', new Date(Date.now() - 30 * 864e5).toISOString()),
    admin.from('business_votes').select('vote').eq('business_id', businessId),
  ]);

  const user = owner.data?.user ?? null;
  const savedConfig = (user?.user_metadata?.openstatus_page ?? null) as { weeklyHours?: Record<string, DayHours> } | null;
  const builderHours = savedConfig?.weeklyHours ?? null;
  const dbHours = (hoursRes.data ?? []) as HoursRow[];

  // ── The comparison that matters ──────────────────────────────────────────
  const mismatches: string[] = [];
  if (builderHours) {
    DAY_KEYS.forEach((key, index) => {
      const fromBuilder = builderHours[key];
      const fromDb = dbHours.find((r) => r.day_of_week === index);
      if (!fromDb) { mismatches.push(`${key}: missing from the live table`); return; }
      const builderClosed = !!fromBuilder?.closed;
      if (builderClosed !== fromDb.is_closed) {
        mismatches.push(`${key}: builder says ${builderClosed ? 'closed' : 'open'}, live page says ${fromDb.is_closed ? 'closed' : 'open'}`);
        return;
      }
      if (builderClosed) return;
      const bOpen = fromBuilder?.open ?? '09:00';
      const bClose = fromBuilder?.close ?? '17:00';
      if (bOpen !== hhmm(fromDb.opens_at) || bClose !== hhmm(fromDb.closes_at)) {
        mismatches.push(`${key}: builder ${bOpen}–${bClose}, live page ${hhmm(fromDb.opens_at)}–${hhmm(fromDb.closes_at)}`);
      }
    });
  }

  const now = Date.now();
  const activeOverrides = (statusRes.data ?? []).filter(
    (u) => u.status === 'active' && (!u.expires_at || new Date(u.expires_at).getTime() > now)
  );
  const googleToken = (tokenRes.data ?? []).find((t) => t.provider === 'google') ?? null;
  const events = eventsRes.data ?? [];

  const checks: Check[] = [
    {
      id: 'hours_published',
      label: 'Hours reached the live page',
      ok: dbHours.length === 7,
      detail: dbHours.length === 7
        ? 'All 7 days present in business_hours.'
        : dbHours.length === 0
          ? 'No rows in business_hours — the public page will show "Hours not set" no matter what the builder shows.'
          : `Only ${dbHours.length} of 7 days are in business_hours.`,
    },
    {
      id: 'hours_match',
      label: 'Builder and live page agree',
      ok: mismatches.length === 0,
      detail: !builderHours
        ? 'This owner has not saved hours in the builder yet.'
        : mismatches.length === 0
          ? 'What they see in the builder is what customers see.'
          : mismatches.join(' · '),
    },
    {
      id: 'slug',
      label: 'Has a live link',
      ok: !!business.slug,
      detail: business.slug ? `/${business.slug}` : 'No slug set — their page is unreachable.',
    },
    {
      id: 'google',
      label: 'Google Business connected',
      ok: !!business.google_location_id && !!googleToken,
      detail: !business.google_location_id
        ? 'No location linked.'
        : !googleToken
          ? 'Location linked but no OAuth token — syncing will fail. They need to reconnect.'
          : `Linked. Token last refreshed ${googleToken.updated_at ? new Date(googleToken.updated_at).toLocaleDateString() : 'unknown'}.`,
    },
    {
      id: 'override',
      label: 'No stale closure',
      ok: activeOverrides.length === 0,
      detail: activeOverrides.length === 0
        ? 'Showing regular hours.'
        : activeOverrides.map((u) => `"${u.headline}"${u.expires_at ? ` until ${new Date(u.expires_at).toLocaleString()}` : ' (no expiry)'}`).join(' · '),
    },
    {
      id: 'onboarded',
      label: 'Finished setup',
      ok: !!business.onboarded_at,
      detail: business.onboarded_at
        ? `First published ${new Date(business.onboarded_at).toLocaleDateString()}.`
        : 'Never published — signed up but never completed the builder.',
    },
  ];

  return NextResponse.json({
    business,
    owner: user ? { email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at } : null,
    checks,
    health: { failing: checks.filter((c) => !c.ok).length, total: checks.length },
    hours: {
      live: DAY_KEYS.map((key, index) => {
        const row = dbHours.find((r) => r.day_of_week === index);
        return { day: key, closed: row ? row.is_closed : null, open: hhmm(row?.opens_at ?? null), close: hhmm(row?.closes_at ?? null) };
      }),
      builder: builderHours,
    },
    statusUpdates: statusRes.data ?? [],
    traffic: {
      days: 30,
      total: events.length,
      byType: events.reduce<Record<string, number>>((acc, e) => {
        const k = (e.event_type as string) ?? 'unknown';
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {}),
    },
    votes: (votesRes.data ?? []).length,
  });
}
