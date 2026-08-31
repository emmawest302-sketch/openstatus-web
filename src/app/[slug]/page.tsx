import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const revalidate = 60;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Hours = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type Update = {
  kind: string;
  headline: string;
  detail: string | null;
  reason: string | null;
  closes_at: string | null;
  created_at: string;
};

type Link = { label: string; url: string };

function pretty(t: string | null): string {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const mer = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? h + ':00 ' + mer : h + ':' + m + ' ' + mer;
}

function minutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function label(row: Hours | undefined): string {
  if (!row) return '-';
  if (row.is_closed) return 'Closed';
  return pretty(row.opens_at) + ' - ' + pretty(row.closes_at);
}

// Collapse consecutive days that share the same hours into one row,
// so a normal week reads as three lines instead of seven.
function groupHours(hours: Hours[]) {
  const ordered = [1, 2, 3, 4, 5, 6, 0];
  const out: { label: string; value: string; days: number[] }[] = [];

  for (const dow of ordered) {
    const value = label(hours.find((h) => h.day_of_week === dow));
    const last = out[out.length - 1];
    if (last && last.value === value) {
      last.days.push(dow);
      last.label =
        DAY_SHORT[last.days[0]] + ' - ' + DAY_SHORT[last.days[last.days.length - 1]];
    } else {
      out.push({ label: DAY_NAMES[dow], value, days: [dow] });
    }
  }
  return out;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    directions: 'M3 11l18-8-8 18-2-8-8-2z',
    menu: 'M4 5h16M4 12h16M4 19h10',
    call: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
    website:
      'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18',
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d={paths[name] ?? paths.website}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconFor(l: string): string {
  const s = l.toLowerCase();
  if (s.includes('direction') || s.includes('map')) return 'directions';
  if (s.includes('menu')) return 'menu';
  if (s.includes('call') || s.includes('phone')) return 'call';
  return 'website';
}

export default async function BeforeYouGo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = getAdminClient();

  const { data: business } = await admin
    .from('businesses')
    .select('id, name, tagline, avatar_url, header_url, links, instagram_handle')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();

  if (!business) notFound();

  const { data: hoursRows } = await admin
    .from('business_hours')
    .select('day_of_week, opens_at, closes_at, is_closed')
    .eq('business_id', business.id);

  const { data: updateRows } = await admin
    .from('status_updates')
    .select('kind, headline, detail, reason, closes_at, created_at')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(4);

  const hours: Hours[] = hoursRows ?? [];
  const updates: Update[] = updateRows ?? [];
  const links: Link[] = Array.isArray(business.links) ? business.links : [];

  const now = new Date();
  const today = now.getDay();
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const lead = updates[0] ?? null;
  const also = updates.slice(1);

  const override = updates.find((u) => u.closes_at)?.closes_at ?? null;
  const effectiveClose = override ?? todayRow?.closes_at ?? null;
  const closedAllDay =
    !todayRow || todayRow.is_closed || updates.some((u) => u.kind === 'closed');

  const openMins = minutes(todayRow?.opens_at ?? null);
  const closeMins = minutes(effectiveClose);
  const isOpen =
    !closedAllDay &&
    openMins !== null &&
    closeMins !== null &&
    nowMins >= openMins &&
    nowMins < closeMins;

  const amber = Boolean(lead) && !closedAllDay;
  const dot = closedAllDay ? '#A32D2D' : lead ? '#EF9F27' : '#1D9E75';

  let title: string;
  let big: string;
  if (closedAllDay) {
    title = 'Closed today';
    big = lead?.detail ?? 'Back tomorrow';
  } else if (lead) {
    title = lead.headline;
    big = lead.detail ?? '';
  } else if (isOpen) {
    title = 'Business as usual';
    big = 'Open until ' + pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    title = 'Closed right now';
    big = 'Opens ' + pretty(todayRow?.opens_at ?? null);
  } else {
    title = 'Closed for today';
    big = 'No changes announced';
  }

  const grouped = groupHours(hours);

  return (
    <div
      className="min-h-screen bg-[#EFF7F2] text-[#0B2E22] flex justify-center sm:items-center sm:p-6"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="w-full max-w-[420px] bg-white sm:rounded-[32px] overflow-hidden sm:shadow-[0_16px_60px_rgba(11,46,34,0.16)]">
        <div className="relative h-56">
          {business.header_url ? (
            <img
              src={business.header_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center 60%' }}
            />
          ) : (
            <div className="absolute inset-0 bg-[#0B2E22]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="relative h-full flex items-end gap-4 px-5 pb-5">
            {business.avatar_url ? (
              <img
                src={business.avatar_url}
                alt=""
                className="w-[86px] h-[86px] rounded-full object-cover bg-white shrink-0"
              />
            ) : (
              <div className="w-[86px] h-[86px] rounded-full bg-[#0B2E22] shrink-0" />
            )}
            <div className="pb-1 min-w-0">
              <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white leading-tight truncate">
                {business.name}
              </h1>
              {business.tagline ? (
                <p className="text-sm text-white/80 truncate">
                  {business.tagline}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-5 pt-5 pb-6">
          <p
            className="text-[11px] uppercase tracking-[0.22em] text-[#4E7A69]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Before you go
          </p>

          <div
            className={
              'mt-3 rounded-2xl px-5 py-4 ' +
              (amber
                ? 'bg-[#FDF3E3]'
                : closedAllDay
                ? 'bg-[#FCEBEB]'
                : 'bg-[#E9F6F0]')
            }
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: dot }}
              />
              <p
                className="text-lg font-medium"
                style={{
                  color: amber ? '#B4741A' : closedAllDay ? '#A32D2D' : '#0F6E56',
                }}
              >
                {title}
              </p>
            </div>
            {big ? (
              <p className="mt-2 text-[26px] font-bold tracking-[-0.02em] leading-tight">
                {big}
              </p>
            ) : null}
            {lead && lead.closes_at && todayRow?.closes_at ? (
              <p className="mt-1.5 text-sm text-[#7A6A50]">
                Normally until {pretty(todayRow.closes_at)}
              </p>
            ) : null}
            {lead?.reason ? (
              <p className="text-sm text-[#7A6A50]">{lead.reason}</p>
            ) : null}
          </div>

          {lead ? (
            <p
              className="mt-3 text-[11px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated {ago(lead.created_at)}
              {business.instagram_handle
                ? ' · @' + business.instagram_handle
                : ''}
            </p>
          ) : null}

          {also.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {also.map((u) => (
                <li
                  key={u.headline + u.created_at}
                  className="flex gap-2 text-sm text-[#2C5648]"
                >
                  <span className="text-[#8AA79B]">·</span>
                  <span>
                    <span className="font-medium">{u.headline}</span>
                    {u.detail ? ' — ' + u.detail : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 rounded-2xl bg-[#F5F7F5] px-5 py-4">
            <p
              className="text-[11px] uppercase tracking-[0.22em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Regular hours
            </p>
            <ul className="mt-2.5 space-y-2">
              {grouped.map((g) => {
                const isToday = g.days.includes(today);
                return (
                  <li
                    key={g.label + g.value}
                    className={
                      'flex items-center justify-between text-sm ' +
                      (isToday ? 'font-medium' : 'text-[#78907F]')
                    }
                  >
                    <span>{g.label}</span>
                    <span>{g.value}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {links.length > 0 ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {links.slice(0, 4).map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#0B2E22]/12 py-3 hover:border-[#1D9E75] hover:text-[#0F6E56] transition"
                >
                  <Icon name={iconFor(l.label)} />
                  <span className="text-[11px]">{l.label}</span>
                </a>
              ))}
            </div>
          ) : null}

          <a
            href="/"
            className="mt-5 block text-center text-[10px] uppercase tracking-[0.2em] text-[#8AA79B] hover:text-[#1D9E75] transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Kept current by OpenStatus
          </a>
        </div>
      </div>
    </div>
  );
}
