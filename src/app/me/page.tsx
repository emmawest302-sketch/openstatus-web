import Link from 'next/link';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { OWNER_COOKIE, readOwnerSession } from '@/lib/owner-link';
import OwnerControls from '@/components/owner-controls';
import AddToHomeScreen from '@/components/add-to-home-screen';
import { summarise, formatCount } from '@/lib/owner-stats';
import { getBusinessStatus, weeklyFromRows, applyOverride, type TodayOverride } from '@/lib/business-status';
import { SITE_DOMAIN } from '@/lib/site';

/**
 * The owner's own page — the thing that lives on their home screen.
 *
 * Deliberately not a builder. Three jobs: say what customers see right now and
 * let them change it, show whether the link is doing anything, and point at
 * the real editor. Editing a page wants a keyboard and a proper sign-in; a
 * cut-down editor here would be a second implementation of the builder that
 * drifts from it, which this codebase has paid for more than once already.
 *
 * The owner link is per business — it comes off that row's own owner_token —
 * so the QR on the desktop builder and this page are always one shop's.
 *
 * No secret in the URL, so the icon is safe to keep on a phone anyone might
 * pick up. Authentication comes from the cookie /s/<token> set once.
 */

export const dynamic = 'force-dynamic';

/**
 * iOS labels a home screen icon from apple-mobile-web-app-title, ahead of the
 * manifest's short_name on most versions — so without this the icon reads
 * "Your hours" no matter what the manifest says.
 */
export async function generateMetadata() {
  const jar = await cookies();
  const session = readOwnerSession(jar.get(OWNER_COOKIE)?.value);

  let label = 'OpenStatus';
  if (session) {
    const { data } = await getAdminClient()
      .from('businesses')
      .select('name')
      .eq('id', session.businessId)
      .maybeSingle();
    if (data?.name?.trim()) label = homeScreenLabel(data.name);
  }

  return {
    title: 'Your hours — OpenStatus',
    robots: { index: false, follow: false },
    other: {
      'apple-mobile-web-app-title': label,
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
    },
  };
}

/** Home screens truncate hard, so pick the cut rather than let iOS do it. */
function homeScreenLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 12) return trimmed;
  const first = trimmed.split(/\s+/)[0];
  return first.length <= 12 ? first : trimmed.slice(0, 12);
}

const ANALYTICS_DAYS = 30;

export default async function OwnerHome({
  searchParams,
}: {
  searchParams: Promise<{ do?: string }>;
}) {
  const jar = await cookies();
  const session = readOwnerSession(jar.get(OWNER_COOKIE)?.value);
  const { do: shortcut } = await searchParams;

  if (!session) {
    return (
      <main style={shell}>
        <Manifest/>
        <div style={card}>
          <h1 style={title}>Open your link</h1>
          <p style={body}>
            To change your hours from this phone, tap the OpenStatus link we sent you.
            It signs you in once and you will not need it again.
          </p>
          <p style={{ ...body, marginTop: 14 }}>
            Can&apos;t find it? Open OpenStatus on a computer, go to Business, and scan
            the code shown there.
          </p>
        </div>
      </main>
    );
  }

  const admin = getAdminClient();
  const { data: business } = await admin
    .from('businesses')
    .select('id, name, timezone, slug')
    .eq('id', session.businessId)
    .maybeSingle();

  if (!business) {
    return (
      <main style={shell}>
        <Manifest/>
        <div style={card}>
          <h1 style={title}>Link no longer works</h1>
          <p style={body}>This link has been replaced. Open OpenStatus on a computer to get a new one.</p>
        </div>
      </main>
    );
  }

  const timeZone = business.timezone || 'America/Chicago';

  // Server render, force-dynamic: the window is relative to request time by
  // design, so reading the clock here is the correct behaviour, not a bug.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - ANALYTICS_DAYS * 86400000).toISOString();
  const [{ data: hourRows }, { data: updates }, { data: events }] = await Promise.all([
    admin.from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', business.id),
    admin.from('status_updates')
      .select('kind, closes_at, opens_at')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .eq('source', 'owner')
      .limit(1),
    // Read straight from the table rather than through /api/analytics: that
    // endpoint takes a Supabase JWT, and loosening it to accept the owner
    // cookie would give a borrowed phone the whole dashboard.
    admin.from('page_events')
      .select('event_type, block_id, visitor_id')
      .eq('business_id', business.id)
      .gte('created_at', since),
  ]);

  const override: TodayOverride = updates?.[0]
    ? { kind: updates[0].kind, opensAt: updates[0].opens_at, closesAt: updates[0].closes_at }
    : null;

  const schedule = weeklyFromRows(hourRows ?? []);
  const status = applyOverride(getBusinessStatus(new Date(), timeZone, schedule), override);
  // A missing page_events table is not something to put in front of an owner
  // holding a phone — the zeroes read the same as a quiet month.
  const stats = summarise(events ?? []);

  return (
    <main style={shell}>
      <Manifest/>
      <OwnerControls
        businessName={business.name}
        slug={business.slug}
        state={status.state}
        closesAt={status.closesAt}
        opensAt={status.opensAt}
        hasOverride={!!override}
        initialPick={shortcut === 'close' ? 'close' : shortcut === 'open' ? 'open' : null}
      />

      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={sectionTitle}>Last {ANALYTICS_DAYS} days</h2>
          {business.slug && (
            <a href={`/${business.slug}`} target="_blank" rel="noreferrer" style={quietLink}>
              {SITE_DOMAIN}/{business.slug} ↗
            </a>
          )}
        </div>
        <div style={statGrid}>
          <Stat label="Page views" value={stats.views}/>
          <Stat label="Visitors" value={stats.visitors}/>
          <Stat label="Directions" value={stats.directions}/>
          <Stat label="Link taps" value={stats.taps}/>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Change your page</h2>
        <p style={{ ...body, margin: '6px 0 0' }}>
          Photos, links, colours and your weekly hours live in the editor. It asks for
          your email and password, because this phone link isn&apos;t enough to
          rebuild a page with.
        </p>
        <Link href="/builder" style={editorBtn}>Open the editor</Link>
      </section>

      <AddToHomeScreen businessName={business.name}/>
    </main>
  );
}

/**
 * Per-owner manifest, so the home screen icon reads the business's name
 * instead of "OpenStatus".
 *
 * crossOrigin is not optional here: a manifest is fetched *without* cookies by
 * default, so without it every owner would silently get the anonymous
 * fallback and the icon would be wrong for all of them.
 */
function Manifest() {
  return (
    <>
      <link rel="manifest" href="/me/manifest.webmanifest" crossOrigin="use-credentials"/>
      <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p style={statValue}>{formatCount(value)}</p>
      <p style={statLabel}>{label}</p>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#F4F5F6',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '24px 16px calc(32px + env(safe-area-inset-bottom))',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: '#FFFFFF',
  border: '1px solid #E9E9E7',
  borderRadius: 20,
  padding: '18px 20px 20px',
  marginTop: 14,
  boxSizing: 'border-box',
};

const title: React.CSSProperties = {
  fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A0A0A', margin: 0,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0A', margin: 0,
};

const body: React.CSSProperties = {
  fontSize: 13, lineHeight: 1.5, color: '#777777', margin: '10px 0 0',
};

const quietLink: React.CSSProperties = {
  fontSize: 11.5, color: '#9A9A97', textDecoration: 'none', fontWeight: 500,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%',
};

const statGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 12px', marginTop: 14,
};

const statValue: React.CSSProperties = {
  fontSize: 24, fontWeight: 750, letterSpacing: '-0.03em', color: '#0A0A0A',
  margin: 0, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
};

const statLabel: React.CSSProperties = {
  fontSize: 11.5, color: '#9A9A97', margin: '4px 0 0', fontWeight: 500,
};

const editorBtn: React.CSSProperties = {
  display: 'block', textAlign: 'center', marginTop: 14,
  padding: '13px', borderRadius: 14,
  border: '1px solid #E9E9E7', background: '#F7F7F6',
  fontSize: 13.5, fontWeight: 650, color: '#0A0A0A', textDecoration: 'none',
};
