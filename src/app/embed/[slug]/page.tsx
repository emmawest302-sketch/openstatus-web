import { getAdminClient } from '@/lib/supabaseAdmin';

// A tiny status strip a business drops onto their own website in an iframe.
// Deliberately transparent and unstyled around the edges so it sits inside
// whatever their site already looks like.
export const revalidate = 60;

type Hours = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

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

export default async function Embed({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = getAdminClient();

  const { data: business } = await admin
    .from('businesses')
    .select('id, name')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();

  if (!business) {
    return <div style={{ display: 'none' }} />;
  }

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
    .limit(1);

  const hours: Hours[] = hoursRows ?? [];
  const lead = updateRows && updateRows.length > 0 ? updateRows[0] : null;

  const now = new Date();
  const today = now.getDay();
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const override = lead?.closes_at ?? null;
  const effectiveClose = override ?? todayRow?.closes_at ?? null;
  const closedAllDay =
    !todayRow || todayRow.is_closed || lead?.kind === 'closed';

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
  const bg = closedAllDay ? '#FCEBEB' : amber ? '#FDF3E3' : '#E9F6F0';
  const ink = closedAllDay ? '#A32D2D' : amber ? '#B4741A' : '#0F6E56';

  let title: string;
  let big: string;
  if (closedAllDay) {
    title = 'Closed today';
    big = lead?.detail ?? '';
  } else if (lead) {
    title = lead.headline;
    big = lead.detail ?? '';
  } else if (isOpen) {
    title = 'Open as usual';
    big = 'Until ' + pretty(effectiveClose);
  } else if (openMins !== null && nowMins < openMins) {
    title = 'Closed right now';
    big = 'Opens ' + pretty(todayRow?.opens_at ?? null);
  } else {
    title = 'Closed for today';
    big = '';
  }

  return (
    <div
      style={{
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: bg,
        borderRadius: 14,
        padding: '14px 18px',
        margin: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: dot,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>
          {title}
        </span>
      </div>

      {big ? (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#0B2E22',
          }}
        >
          {big}
        </p>
      ) : null}

      {lead && lead.closes_at && todayRow?.closes_at ? (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#7A6A50' }}>
          Normally until {pretty(todayRow.closes_at)}
          {lead.reason ? ' · ' + lead.reason : ''}
        </p>
      ) : null}

      <a
        href={'/' + slug}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 10,
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8AA79B',
          textDecoration: 'none',
        }}
      >
        Kept current by OpenStatus
      </a>
    </div>
  );
}
