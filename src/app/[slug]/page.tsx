import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const revalidate = 60;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  return m === '00' ? h + ' ' + mer : h + ':' + m + ' ' + mer;
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

  const dot = closedAllDay ? '#A32D2D' : lead ? '#EF9F27' : '#1D9E75';

  let bigLine: string;
  let smallLine: string;
  if (closedAllDay) {
    bigLine = 'Closed today';
    smallLine = lead?.detail ?? 'Back tomorrow';
  } else if (lead) {
    bigLine = lead.headline;
    smallLine = lead.detail ?? '';
  } else if (isOpen) {
    bigLine = 'Business as usual';
    smallLine = 'Open until ' + pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    bigLine = 'Opens ' + pretty(todayRow?.opens_at ?? null);
    smallLine = 'No changes announced';
  } else {
    bigLine = 'Closed for today';
    smallLine = 'No changes announced';
  }

  return (
    <div
      className="min-h-screen bg-[#EFF7F2] text-[#0B2E22] flex justify-center sm:items-center sm:p-6"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="w-full max-w-[400px] min-h-screen sm:min-h-[740px] bg-white sm:rounded-[34px] overflow-hidden flex flex-col sm:shadow-[0_16px_60px_rgba(11,46,34,0.14)]">
        <div className="relative h-40 shrink-0">
          {business.header_url ? (
            <img
              src={business.header_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-[3px]"
              style={{ objectPosition: 'center 62%' }}
            />
          ) : (
            <div className="absolute inset-0 bg-[#D6E9E0]" />
          )}
          <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white" />

          <div className="relative h-full flex items-center justify-center">
            {business.avatar_url ? (
              <img
                src={business.avatar_url}
                alt=""
                className="w-24 h-24 rounded-full object-cover bg-white ring-4 ring-white/80 shadow-[0_6px_24px_rgba(11,46,34,0.16)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#0B2E22] ring-4 ring-white/80" />
            )}
          </div>
        </div>

        <div className="px-6 pt-1 pb-7 flex-1 flex flex-col">
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">{business.name}</h1>
            {business.tagline ? (
              <p className="mt-0.5 text-sm text-[#4E7A69]">{business.tagline}</p>
            ) : null}
          </div>

          <div className="mt-8 rounded-[24px] bg-[#F5F9F6] border border-[#0B2E22]/8 px-6 py-7 text-center">
            <p
              className="text-[10px] uppercase tracking-[0.3em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-4 flex items-center justify-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: dot }}
              />
              <p className="text-[27px] font-medium tracking-[-0.02em] leading-tight">
                {bigLine}
              </p>
            </div>

            {smallLine ? (
              <p className="mt-2 text-[19px] text-[#2C5648] leading-snug">
                {smallLine}
              </p>
            ) : null}

            {lead && lead.closes_at && todayRow?.closes_at ? (
              <p className="mt-2 text-sm text-[#8AA79B]">
                Normally until {pretty(todayRow.closes_at)}
                {lead.reason ? ' · ' + lead.reason : ''}
              </p>
            ) : null}

            {lead ? (
              <p
                className="mt-4 text-[11px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Updated {ago(lead.created_at)}
                {business.instagram_handle
                  ? ' · @' + business.instagram_handle
                  : ''}
              </p>
            ) : null}
          </div>

          {also.length > 0 ? (
            <div className="mt-3 rounded-[20px] bg-[#FAEEDA] px-5 py-4">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#854F0B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Also today
              </p>
              <ul className="mt-2 space-y-1.5">
                {also.map((u) => (
                  <li key={u.headline + u.created_at} className="text-sm text-[#854F0B]">
                    <span className="font-medium">{u.headline}</span>
                    {u.detail ? <span> &middot; {u.detail}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {links.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {links.slice(0, 3).map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center text-sm rounded-2xl border border-[#0B2E22]/12 py-3 hover:border-[#1D9E75] hover:text-[#0F6E56] transition"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}

          <details className="mt-5">
            <summary className="text-xs text-[#4E7A69] cursor-pointer list-none select-none text-center">
              Regular hours &darr;
            </summary>
            <ul className="mt-3 space-y-1.5">
              {DAYS.map((label, idx) => {
                const row = hours.find((h) => h.day_of_week === idx);
                return (
                  <li
                    key={label}
                    className={
                      'flex items-center justify-between text-xs ' +
                      (idx === today ? 'font-medium' : 'text-[#8AA79B]')
                    }
                  >
                    <span>{label}</span>
                    <span>
                      {!row
                        ? '-'
                        : row.is_closed
                        ? 'Closed'
                        : pretty(row.opens_at) + ' - ' + pretty(row.closes_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>

          <a
            href="/"
            className="mt-auto pt-8 block text-center text-[10px] uppercase tracking-[0.2em] text-[#8AA79B] hover:text-[#1D9E75] transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Kept current by OpenStatus
          </a>
        </div>
      </div>
    </div>
  );
}
