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
    bigLine = 'CLOSED TODAY';
    smallLine = lead?.detail ?? 'Back tomorrow';
  } else if (lead) {
    bigLine = lead.headline.toUpperCase();
    smallLine = lead.detail ?? '';
  } else if (isOpen) {
    bigLine = 'BUSINESS AS USUAL';
    smallLine = 'Open until ' + pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    bigLine = 'OPENS ' + pretty(todayRow?.opens_at ?? null).toUpperCase();
    smallLine = 'No changes announced';
  } else {
    bigLine = 'CLOSED FOR TODAY';
    smallLine = 'No changes announced';
  }

  return (
    <div
      className="min-h-screen bg-[#EFF7F2] text-[#0B2E22] flex items-center justify-center p-3 sm:p-6"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="w-full max-w-[400px] bg-white rounded-[26px] overflow-hidden shadow-[0_8px_40px_rgba(11,46,34,0.10)]">
        {business.header_url ? (
          <div className="h-16 overflow-hidden">
            <img
              src={business.header_url}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 68%' }}
            />
          </div>
        ) : null}

        <div className="px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            {business.avatar_url ? (
              <img
                src={business.avatar_url}
                alt=""
                className="w-11 h-11 rounded-full bg-white object-cover border border-[#0B2E22]/10"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#0B2E22]" />
            )}
            <div className="min-w-0">
              <p className="font-bold tracking-tight leading-tight truncate">
                {business.name}
              </p>
              {business.tagline ? (
                <p className="text-xs text-[#4E7A69] truncate">
                  {business.tagline}
                </p>
              ) : null}
            </div>
          </div>

          <p
            className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Before you go
          </p>

          <div className="mt-2.5 flex items-start gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full mt-2.5 shrink-0"
              style={{ backgroundColor: dot }}
            />
            <div className="min-w-0">
              <p className="text-[30px] font-bold tracking-[-0.03em] leading-[1.02]">
                {bigLine}
              </p>
              {smallLine ? (
                <p className="mt-1 text-lg text-[#2C5648] leading-snug">
                  {smallLine}
                </p>
              ) : null}
              {lead && lead.closes_at && todayRow?.closes_at ? (
                <p className="mt-1 text-sm text-[#8AA79B]">
                  Normally until {pretty(todayRow.closes_at)}
                  {lead.reason ? ' · ' + lead.reason : ''}
                </p>
              ) : null}
            </div>
          </div>

          {lead ? (
            <p
              className="mt-3 text-[11px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated {ago(lead.created_at)}
              {business.instagram_handle
                ? ' · from @' + business.instagram_handle
                : ''}
            </p>
          ) : null}

          {also.length > 0 ? (
            <div className="mt-4 rounded-2xl bg-[#F5F7F5] px-4 py-3">
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Also today
              </p>
              <ul className="mt-2 space-y-1.5">
                {also.map((u) => (
                  <li key={u.headline + u.created_at} className="text-sm">
                    <span className="font-medium">{u.headline}</span>
                    {u.detail ? (
                      <span className="text-[#4E7A69]"> &middot; {u.detail}</span>
                    ) : null}
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
                  className="text-center text-sm rounded-full border border-[#0B2E22]/15 py-2.5 hover:border-[#1D9E75] hover:text-[#0F6E56] transition"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}

          <details className="mt-4">
            <summary className="text-xs text-[#4E7A69] cursor-pointer list-none select-none">
              Regular hours &darr;
            </summary>
            <ul className="mt-2.5 space-y-1">
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
                        ? '\u2014'
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
