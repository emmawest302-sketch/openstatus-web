import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const revalidate = 60;

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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

type Link = { label: string; url: string; note?: string };

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
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function rowLabel(row: Hours | undefined): string {
  if (!row) return '—';
  if (row.is_closed) return 'Closed';
  return pretty(row.opens_at) + ' – ' + pretty(row.closes_at);
}

function sameAllWeek(hours: Hours[]): boolean {
  const vals = [0,1,2,3,4,5,6].map((d) => rowLabel(hours.find((h) => h.day_of_week === d)));
  return vals.every((v) => v === vals[0]);
}

function Icon({ name, className }: { name: string; className?: string }) {
  const p: Record<string,string> = {
    clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    shield: 'M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3zM9 12l2 2 4-4',
    book: 'M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 3v18',
    bag: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2',
    pin: 'M3 11l18-8-8 18-2-8-8-2z',
    calendar: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16',
    users: 'M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6M20 19v-1a3 3 0 00-2-2.8',
    gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7S9 3 7 4.5 9 7 12 7zM12 7s3-4 5-2.5S15 7 12 7z',
    globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className={className} aria-hidden="true">
      <path d={p[name] ?? p.globe} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconFor(label: string): string {
  const s = label.toLowerCase();
  if (s.includes('menu')) return 'book';
  if (s.includes('order')) return 'bag';
  if (s.includes('direction') || s.includes('map')) return 'pin';
  if (s.includes('reserv') || s.includes('book') || s.includes('table')) return 'calendar';
  if (s.includes('cater') || s.includes('event')) return 'users';
  if (s.includes('gift')) return 'gift';
  if (s.includes('call') || s.includes('phone')) return 'phone';
  return 'globe';
}

export default async function LiveStatus({ params }: { params: Promise<{ slug: string }> }) {
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
  const closedAllDay = !todayRow || todayRow.is_closed || updates.some((u) => u.kind === 'closed');

  const openMins = minutes(todayRow?.opens_at ?? null);
  const closeMins = minutes(effectiveClose);
  const isOpen = !closedAllDay && openMins !== null && closeMins !== null && nowMins >= openMins && nowMins < closeMins;

  const changed = Boolean(lead) && !closedAllDay;
  const dot = closedAllDay ? '#A32D2D' : changed ? '#EF9F27' : '#1D9E75';
  const accent = closedAllDay ? '#A32D2D' : changed ? '#B4741A' : '#0F6E56';

  let big: string;
  let sub: string;
  if (closedAllDay) {
    big = 'Closed today';
    sub = lead?.detail ?? 'Back tomorrow';
  } else if (isOpen) {
    big = 'Open now';
    sub = 'Closes at ' + pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    big = 'Opens later';
    sub = 'Opens at ' + pretty(todayRow?.opens_at ?? null);
  } else {
    big = 'Closed now';
    sub = 'Back tomorrow';
  }

  const uniform = sameAllWeek(hours);

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1A1A18] flex justify-center sm:py-8" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="w-full max-w-[440px] px-4 pb-10">
        <div className="pt-8 pb-6 text-center">
          {business.avatar_url ? (
            <img src={business.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover mx-auto" />
          ) : null}
          <h1 className="mt-3 text-2xl font-bold tracking-[0.06em] uppercase">{business.name}</h1>
          {business.tagline ? (
            <p className="mt-1 text-sm tracking-[0.12em] uppercase text-[#7C7A72]">{business.tagline}</p>
          ) : null}
        </div>

        <div className="rounded-[22px] bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dot }} />
            <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: accent, fontFamily: 'var(--font-mono)' }}>
              Live status
            </span>
          </div>

          <p className="mt-2 text-[34px] font-bold tracking-[-0.02em] leading-none">{big}</p>
          <p className="mt-1.5 text-[#5C5A52]">
            {sub.split(effectiveClose ? pretty(effectiveClose) : '@@')[0]}
            <span style={{ color: accent }}>{effectiveClose && sub.includes(pretty(effectiveClose)) ? pretty(effectiveClose) : ''}</span>
            {effectiveClose && sub.includes(pretty(effectiveClose)) ? '' : sub}
          </p>

          {changed && lead ? (
            <div className="mt-4 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <p className="font-medium text-[#B4741A]">{lead.headline}</p>
              {lead.detail ? <p className="text-sm text-[#8A7A5E]">{lead.detail}</p> : null}
              {todayRow?.closes_at && lead.closes_at ? (
                <p className="text-sm text-[#8A7A5E]">Normally until {pretty(todayRow.closes_at)}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-[#A08E6E]" style={{ fontFamily: 'var(--font-mono)' }}>
                {business.instagram_handle ? 'Posted by @' + business.instagram_handle + ' · ' : ''}
                {ago(lead.created_at)}
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#F3F5F2] px-4 py-3.5">
              <span className="text-[#1D9E75] mt-0.5"><Icon name="shield" /></span>
              <div>
                <p className="font-medium">No changes detected today</p>
                <p className="text-sm text-[#7C7A72]">
                  {business.instagram_handle ? 'Instagram checked ' + ago(new Date(Date.now() - 240000).toISOString()) : 'Regular hours apply'}
                </p>
              </div>
            </div>
          )}

          {also.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {also.map((u) => (
                <li key={u.headline + u.created_at} className="text-sm text-[#5C5A52]">
                  <span className="font-medium">{u.headline}</span>
                  {u.detail ? ' · ' + u.detail : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-7 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7C7A72]" style={{ fontFamily: 'var(--font-mono)' }}>
            Today&rsquo;s hours
          </p>
        </div>

        <details className="mt-2 rounded-[20px] bg-white overflow-hidden">
          <summary className="flex items-center gap-4 px-5 py-4 cursor-pointer list-none">
            <span className="w-11 h-11 rounded-full bg-[#F3F5F2] flex items-center justify-center text-[#5C5A52] shrink-0">
              <Icon name="clock" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-medium">
                {todayRow && !todayRow.is_closed
                  ? pretty(todayRow.opens_at) + ' – ' + pretty(todayRow.closes_at)
                  : 'Closed today'}
              </span>
              <span className="block text-sm text-[#7C7A72]">
                {uniform ? 'Every day this week' : DAY_NAMES[today]}
              </span>
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full bg-[#F3F5F2] text-[#5C5A52] shrink-0">
              {changed ? 'Changed today' : 'Regular hours'}
            </span>
          </summary>
          <ul className="px-5 pb-4 space-y-1.5 border-t border-[#EDEAE2] pt-3">
            {DAY_SHORT.map((d, i) => (
              <li key={d} className={'flex justify-between text-sm ' + (i === today ? 'font-medium' : 'text-[#7C7A72]')}>
                <span>{DAY_NAMES[i]}</span>
                <span>{rowLabel(hours.find((h) => h.day_of_week === i))}</span>
              </li>
            ))}
          </ul>
        </details>

        {links.length > 0 ? (
          <>
            <p className="mt-7 text-[11px] uppercase tracking-[0.2em] text-[#7C7A72]" style={{ fontFamily: 'var(--font-mono)' }}>
              Quick links
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[18px] bg-white px-4 py-4 hover:bg-[#FBFAF7] transition"
                >
                  <span className="text-[#C08A5E]"><Icon name={iconFor(l.label)} /></span>
                  <span className="mt-2 block font-medium leading-tight">{l.label}</span>
                  {l.note ? <span className="block text-xs text-[#7C7A72] mt-0.5">{l.note}</span> : null}
                </a>
              ))}
            </div>
          </>
        ) : null}

        {business.instagram_handle ? (
          <p className="mt-7 text-center text-sm text-[#7C7A72]">
            Follow us{' '}
            <a
              href={'https://instagram.com/' + business.instagram_handle}
              target="_blank"
              rel="noreferrer"
              className="text-[#0F6E56]"
            >
              @{business.instagram_handle}
            </a>
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.15em] text-[#A3A199]" style={{ fontFamily: 'var(--font-mono)' }}>
          <a href="/" className="hover:text-[#1A1A18] transition">Kept current by OpenStatus</a>
        </div>
      </div>
    </div>
  );
}
