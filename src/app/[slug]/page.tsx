import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const revalidate = 60;

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

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

type Link = { label: string; url: string; icon?: string };

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
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : days + ' days ago';
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = getAdminClient();

  const { data: business } = await admin
    .from('businesses')
    .select(
      'id, name, tagline, avatar_url, header_url, links, timezone, instagram_handle'
    )
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

  // An override closing time from a post beats the stored hours.
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

  let pill: string;
  if (closedAllDay) pill = 'Closed today';
  else if (isOpen) pill = 'Open · closes ' + pretty(effectiveClose);
  else if (openMins !== null && nowMins < openMins)
    pill = 'Closed · opens ' + pretty(todayRow?.opens_at ?? null);
  else pill = 'Closed now';

  return (
    <div
      className="min-h-screen bg-[#EFF7F2] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="max-w-md mx-auto sm:py-8">
        <div className="bg-white sm:rounded-[24px] overflow-hidden">
          <div className="h-44 bg-[#D6E9E0] overflow-hidden">
            {business.header_url ? (
              <img
                src={business.header_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          <div className="px-5 pb-6">
            <div className="flex items-end gap-3 -mt-9">
              {business.avatar_url ? (
                <img
                  src={business.avatar_url}
                  alt={business.name}
                  className="w-[74px] h-[74px] rounded-[18px] border-4 border-white bg-white object-cover"
                />
              ) : (
                <div className="w-[74px] h-[74px] rounded-[18px] border-4 border-white bg-[#0B2E22]" />
              )}
              <span
                className={
                  'inline-flex items-center gap-2 mb-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full ' +
                  (isOpen
                    ? 'bg-[#E1F5EE] text-[#0F6E56]'
                    : 'bg-[#F1EFE8] text-[#5F5E5A]')
                }
              >
                <span
                  className={
                    'w-[7px] h-[7px] rounded-full ' +
                    (isOpen ? 'bg-[#1D9E75]' : 'bg-[#9C9A93]')
                  }
                />
                {pill}
              </span>
            </div>

            <h1 className="mt-3.5 text-2xl font-bold tracking-tight">
              {business.name}
            </h1>
            {business.tagline ? (
              <p className="text-sm text-[#4E7A69]">{business.tagline}</p>
            ) : null}

            {updates.length > 0 ? (
              <>
                <p
                  className="mt-6 mb-2 text-[11px] uppercase tracking-[0.2em] text-[#4E7A69]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Today
                </p>
                <div className="space-y-2">
                  {updates.map((u, i) => {
                    const fresh =
                      Date.now() - new Date(u.created_at).getTime() < 5400000;
                    const alert = i === 0;
                    return (
                      <div
                        key={u.headline + u.created_at}
                        className={
                          'rounded-2xl px-4 py-3.5 border ' +
                          (alert
                            ? 'bg-[#FAEEDA] border-[#FAC775]'
                            : 'bg-white border-[#0B2E22]/12')
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={
                              'font-medium ' +
                              (alert ? 'text-[#854F0B]' : 'text-[#0B2E22]')
                            }
                          >
                            {u.headline}
                          </p>
                          {fresh ? (
                            <span
                              className={
                                'text-[10px] px-2 py-0.5 rounded-full shrink-0 ' +
                                (alert
                                  ? 'bg-[#854F0B] text-white'
                                  : 'bg-[#1D9E75] text-white')
                              }
                            >
                              New
                            </span>
                          ) : null}
                        </div>
                        {u.detail ? (
                          <p
                            className={
                              'text-sm ' +
                              (alert ? 'text-[#854F0B]' : 'text-[#4E7A69]')
                            }
                          >
                            {u.detail}
                            {u.reason ? ' · ' + u.reason : ''}
                          </p>
                        ) : null}
                        <p
                          className={
                            'mt-1.5 text-[11px] ' +
                            (alert ? 'text-[#9E7328]' : 'text-[#8AA79B]')
                          }
                        >
                          {alert && u.closes_at && todayRow?.closes_at
                            ? 'Normally until ' +
                              pretty(todayRow.closes_at) +
                              ' · '
                            : ''}
                          {ago(u.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl bg-[#E1F5EE] px-4 py-3.5">
                <p className="text-sm text-[#0F6E56]">
                  Nothing unusual announced today.
                </p>
              </div>
            )}

            {links.length > 0 ? (
              <div className="mt-5 space-y-2">
                {links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-full border border-[#0B2E22]/12 px-5 py-3.5 hover:border-[#1D9E75] transition"
                  >
                    <span className="flex-1">{l.label}</span>
                    <span className="text-[#8AA79B]">
                      <Chevron />
                    </span>
                  </a>
                ))}
              </div>
            ) : null}

            <details className="mt-5 border-t border-[#0B2E22]/10 pt-4">
              <summary className="text-sm text-[#4E7A69] cursor-pointer list-none">
                All hours
              </summary>
              <ul className="mt-3 space-y-1.5">
                {DAYS.map((label, idx) => {
                  const row = hours.find((h) => h.day_of_week === idx);
                  const isToday = idx === today;
                  return (
                    <li
                      key={label}
                      className={
                        'flex items-center justify-between text-sm ' +
                        (isToday ? 'font-medium' : 'text-[#4E7A69]')
                      }
                    >
                      <span>{label}</span>
                      <span>
                        {!row
                          ? '—'
                          : row.is_closed
                          ? 'Closed'
                          : pretty(row.opens_at) + ' – ' + pretty(row.closes_at)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>

            <p
              className="mt-6 text-center text-[10px] uppercase tracking-[0.15em] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Kept current by OpenStatus
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
