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
};

function pretty(t: string | null): string {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const mer = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? h + ' ' + mer : h + ':' + m + ' ' + mer;
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = getAdminClient();

  // Only the columns that are safe to show publicly. No email, no tokens.
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, tagline, avatar_url, header_url, links, timezone, instagram_handle')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();

  if (!business) notFound();

  const { data: hoursRows } = await admin
    .from('business_hours')
    .select('day_of_week, opens_at, closes_at, is_closed')
    .eq('business_id', business.id);

  const { data: updates } = await admin
    .from('status_updates')
    .select('kind, headline, detail, reason, closes_at')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  const hours: Hours[] = hoursRows ?? [];
  const live: Update | null = updates && updates.length > 0 ? updates[0] : null;

  const today = new Date().getDay();
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;

  const links: { label: string; url: string }[] = Array.isArray(business.links)
    ? business.links
    : [];

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#0B0B0B]">
      <div className="max-w-md mx-auto pb-16">
        <div className="h-28 bg-[#E1F5EE] overflow-hidden">
          {business.header_url ? (
            <img
              src={business.header_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        <div className="px-6">
          <div className="-mt-10 mb-4">
            {business.avatar_url ? (
              <img
                src={business.avatar_url}
                alt={business.name}
                className="w-20 h-20 rounded-2xl border-4 border-[#FBFAF7] object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-[#FBFAF7] bg-[#1D9E75]" />
            )}
          </div>

          <h1 className="text-2xl font-medium tracking-tight">
            {business.name}
          </h1>
          {business.tagline ? (
            <p className="mt-1 text-[#5F5E5A]">{business.tagline}</p>
          ) : null}

          <section className="mt-7 rounded-2xl bg-white border border-[#EAE7DF] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#EAE7DF]">
              <p className="text-xs tracking-wide text-[#5F5E5A]">Hours</p>
            </div>

            {live ? (
              <div className="px-5 py-4 bg-[#FAEEDA]">
                <p className="font-medium text-[#854F0B]">{live.headline}</p>
                {live.detail ? (
                  <p className="mt-0.5 text-sm text-[#854F0B]">{live.detail}</p>
                ) : null}
                {todayRow && !todayRow.is_closed && todayRow.closes_at ? (
                  <p className="mt-1.5 text-xs text-[#854F0B]">
                    Normally until {pretty(todayRow.closes_at)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <ul className="divide-y divide-[#EAE7DF]">
              {DAYS.map((label, idx) => {
                const row = hours.find((h) => h.day_of_week === idx);
                const isToday = idx === today;
                return (
                  <li
                    key={label}
                    className={
                      'flex items-center justify-between px-5 py-2.5 text-sm ' +
                      (isToday ? 'bg-[#FBFAF7]' : '')
                    }
                  >
                    <span className={isToday ? 'font-medium' : 'text-[#5F5E5A]'}>
                      {label}
                    </span>
                    <span className={isToday ? 'font-medium' : 'text-[#5F5E5A]'}>
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
          </section>

          {links.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center px-5 py-3.5 rounded-full bg-white border border-[#EAE7DF] font-medium hover:border-[#0B0B0B] transition"
                >
                  {l.label}
                </a>
              ))}
            </div>
          ) : null}

          <p className="mt-8 text-center text-xs text-[#9C9A93]">
            Kept current by OpenStatus
          </p>
        </div>
      </div>
    </div>
  );
}
