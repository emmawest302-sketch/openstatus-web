import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const revalidate = 60;

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

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
  source: string | null;
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
  if (mins < 60) return mins + ' minutes ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : days + ' days ago';
}

function rowLabel(row: Hours | undefined): string {
  if (!row) return '-';
  if (row.is_closed) return 'Closed';
  return pretty(row.opens_at) + ' - ' + pretty(row.closes_at);
}

function sameAllWeek(hours: Hours[]): boolean {
  const vals = [0,1,2,3,4,5,6].map((d) => rowLabel(hours.find((h) => h.day_of_week === d)));
  return vals.every((v) => v === vals[0]);
}

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const p: Record<string,string> = {
    clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    calendarCheck: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16M9 15l2 2 4-4',
    cup: 'M4 8h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM17 9h2a2 2 0 010 4h-2',
    book: 'M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 3v18',
    bag: 'M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2',
    pin: 'M3 11l18-8-8 18-2-8-8-2z',
    calendar: 'M4 6h16v14H4zM8 3v4M16 3v4M4 10h16',
    users: 'M16 19v-1a4 4 0 00-8 0v1M12 11a3 3 0 100-6 3 3 0 000 6M20 19v-1a3 3 0 00-2-2.8',
    gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13',
    globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
    bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0',
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d={p[name] ?? p.globe} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function iconFor(label: string): string {
  const s = label.toLowerCase();
  if (s.includes('menu')) return 'book';
  if (s.includes('order')) return 'bag';
  if (s.includes('direction') || s.includes('map')) return 'pin';
  if (s.includes('reserv') || s.includes('table') || s.includes('book')) return 'calendar';
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
    .select('kind, headline, detail, reason, closes_at, created_at, source')
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
  const dot = closedAllDay ? '#C4453F' : changed ? '#E0921B' : '#2E7D5B';

  let big: string;
  let sub: string;
  let subAccent = '';
  if (closedAllDay) {
    big = 'Closed today';
    sub = lead?.detail ?? 'Back tomorrow';
  } else if (isOpen) {
    big = 'Open now';
    sub = 'Closes at ';
    subAccent = pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    big = 'Opens later';
    sub = 'Opens at ';
    subAccent = pretty(todayRow?.opens_at ?? null);
  } else {
    big = 'Closed now';
    sub = 'Back tomorrow';
  }

  // Say exactly what we know, and nothing more. An update the owner set is a
  // confirmation. Silence is not: it only means regular hours still apply.
  const ownerSet = lead?.source === 'owner';
  const confirmedFromInstagram = lead?.source === 'instagram_confirmed';
  const sourceLine = lead
    ? (ownerSet
        ? 'Updated by ' + business.name + ' '
        : confirmedFromInstagram
          ? 'Detected from Instagram · confirmed by ' + business.name + ' '
          : 'Detected from a post by ' + business.name + ' ') + ago(lead.created_at)
    : 'Based on regular ' + DAY_NAMES[today] + ' hours';
  const sourceNote = lead ? null : 'No temporary change is currently active';

  const uniform = sameAllWeek(hours);
  const glass = 'rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/70';

  return (
    <div className="min-h-screen bg-[#EDE9E2] text-[#1A1A18] flex justify-center" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="relative w-full max-w-[440px] min-h-screen overflow-hidden">
        {business.header_url ? (
          <img src={business.header_url} alt="" className="absolute inset-x-0 top-0 h-[420px] w-full object-cover" style={{ objectPosition: 'center 55%' }} />
        ) : (
          <div className="absolute inset-x-0 top-0 h-[420px] bg-[#2E4A3E]" />
        )}
        <div className="absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-black/45 via-black/25 to-[#EDE9E2]" />

        <div className="relative px-4 pb-10">
          <div className="pt-28 flex items-end gap-4">
            {business.avatar_url ? (
              <img src={business.avatar_url} alt="" className="w-[74px] h-[74px] rounded-[20px] object-cover bg-white p-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.18)] shrink-0" />
            ) : (
              <div className="w-[74px] h-[74px] rounded-[20px] bg-white shrink-0" />
            )}
            <div className="pb-1 min-w-0">
              <h1 className="text-[26px] font-bold tracking-[-0.02em] text-white leading-tight drop-shadow truncate">
                {business.name}
              </h1>
              {business.tagline ? (
                <p className="text-sm text-white/90 drop-shadow truncate">{business.tagline}</p>
              ) : null}
            </div>
          </div>

          <div className={'mt-5 p-4 ' + glass}>
            <div className="flex items-center gap-4">
              <span className="w-[68px] h-[68px] rounded-full bg-[#2E7D5B] text-white flex items-center justify-center shrink-0">
                <Icon name="cup" size={30} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />
                  <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: dot, fontFamily: 'var(--font-mono)' }}>
                    Live status
                  </span>
                </div>
                <p className="mt-0.5 text-[30px] font-bold tracking-[-0.02em] leading-none">{big}</p>
                <p className="mt-1 text-[#4A4842]">
                  {sub}
                  {subAccent ? <span style={{ color: dot }} className="font-medium">{subAccent}</span> : null}
                </p>
              </div>
            </div>

            {changed && lead ? (
              <div className="mt-4 rounded-[18px] bg-[#FBF0DC]/90 px-4 py-3.5">
                <p className="font-medium text-[#8A5A11]">{lead.headline}</p>
                {lead.detail ? <p className="text-sm text-[#9A7434]">{lead.detail}</p> : null}
                {todayRow?.closes_at && lead.closes_at ? (
                  <p className="text-sm text-[#9A7434]">Normally until {pretty(todayRow.closes_at)}</p>
                ) : null}
                {lead.reason ? <p className="text-sm text-[#9A7434]">{lead.reason}</p> : null}
                <p className="mt-1.5 text-[11px] text-[#AD8B50]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {sourceLine}
                </p>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-white/55 px-4 py-3.5">
                <span className="text-[#4A4842] shrink-0"><Icon name="calendarCheck" /></span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{sourceLine}</p>
                  {sourceNote ? <p className="text-sm text-[#6C6A62]">{sourceNote}</p> : null}
                </div>
              </div>
            )}

            {also.length > 0 ? (
              <ul className="mt-3 space-y-1.5 px-1">
                {also.map((u) => (
                  <li key={u.headline + u.created_at} className="text-sm text-[#4A4842]">
                    <span className="font-medium">{u.headline}</span>
                    {u.detail ? ' · ' + u.detail : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <details className={'mt-3 overflow-hidden ' + glass}>
            <summary className="list-none cursor-pointer px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Today&rsquo;s hours</span>
                <span className="text-sm text-[#6C6A62]">View all</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center text-[#4A4842] shrink-0">
                  <Icon name="clock" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[19px] font-medium">
                    {todayRow && !todayRow.is_closed
                      ? pretty(todayRow.opens_at) + ' - ' + pretty(todayRow.closes_at)
                      : 'Closed today'}
                  </span>
                  <span className="block text-sm text-[#6C6A62]">
                    {uniform ? 'Every day this week' : DAY_NAMES[today]}
                  </span>
                </span>
                <span className="text-xs px-3 py-2 rounded-full bg-white/70 text-[#4A4842] shrink-0">
                  {changed ? 'Changed today' : 'Regular hours'}
                </span>
              </div>
            </summary>
            <ul className="px-5 pb-4 space-y-1.5 border-t border-white/60 pt-3">
              {DAY_NAMES.map((d, i) => (
                <li key={d} className={'flex justify-between text-sm ' + (i === today ? 'font-medium' : 'text-[#6C6A62]')}>
                  <span>{d}</span>
                  <span>{rowLabel(hours.find((h) => h.day_of_week === i))}</span>
                </li>
              ))}
            </ul>
          </details>

          {links.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={'px-3 py-4 hover:bg-white/90 transition rounded-[20px] bg-white/75 backdrop-blur-xl border border-white/70'}>
                  <span className="text-[#C08A5E] block"><Icon name={iconFor(l.label)} /></span>
                  <span className="mt-2 block text-sm font-medium leading-tight">{l.label}</span>
                  {l.note ? <span className="block text-[11px] text-[#6C6A62] mt-0.5 leading-tight">{l.note}</span> : null}
                </a>
              ))}
            </div>
          ) : null}

          {business.instagram_handle ? (
            <p className="mt-6 text-center text-sm text-[#6C6A62]">
              Follow us{' '}
              <a href={'https://instagram.com/' + business.instagram_handle} target="_blank" rel="noreferrer" className="text-[#2E7D5B]">
                @{business.instagram_handle}
              </a>
            </p>
          ) : null}

          <Link href="/" className="mt-3 block text-center text-[10px] uppercase tracking-[0.18em] text-[#9B998F] hover:text-[#1A1A18] transition" style={{ fontFamily: 'var(--font-mono)' }}>
            Powered by OpenStatus
          </Link>
        </div>
      </div>
    </div>
  );
}
