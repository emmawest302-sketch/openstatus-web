import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabaseAdmin';
import { OWNER_COOKIE, readOwnerSession } from '@/lib/owner-link';
import OwnerControls from '@/components/owner-controls';
import { getBusinessStatus, weeklyFromRows, applyOverride, type TodayOverride } from '@/lib/business-status';

/**
 * The owner's own page.
 *
 * Deliberately almost nothing on it: what customers see right now, and four
 * buttons. No builder, no style editor — those want a keyboard. This is the
 * thing that gets added to a home screen and tapped on a snowy morning with
 * one hand.
 *
 * No secret in the URL, so the icon is safe to keep on a phone anyone might
 * pick up. Authentication comes from the cookie /s/<token> set once.
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your hours — OpenStatus',
  robots: { index: false, follow: false },
};

export default async function OwnerHome() {
  const jar = await cookies();
  const session = readOwnerSession(jar.get(OWNER_COOKIE)?.value);

  if (!session) {
    return (
      <main style={shell}>
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
        <div style={card}>
          <h1 style={title}>Link no longer works</h1>
          <p style={body}>This link has been replaced. Open OpenStatus on a computer to get a new one.</p>
        </div>
      </main>
    );
  }

  const timeZone = business.timezone || 'America/Chicago';

  const { data: hourRows } = await admin
    .from('business_hours')
    .select('day_of_week, opens_at, closes_at, is_closed')
    .eq('business_id', business.id);

  const { data: updates } = await admin
    .from('status_updates')
    .select('kind, closes_at, opens_at')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .eq('source', 'owner')
    .limit(1);

  const override: TodayOverride = updates?.[0]
    ? { kind: updates[0].kind, opensAt: updates[0].opens_at, closesAt: updates[0].closes_at }
    : null;

  const schedule = weeklyFromRows(hourRows ?? []);
  const status = applyOverride(getBusinessStatus(new Date(), timeZone, schedule), override);

  return (
    <main style={shell}>
      <OwnerControls
        businessName={business.name}
        slug={business.slug}
        state={status.state}
        closesAt={status.closesAt}
        opensAt={status.opensAt}
        hasOverride={!!override}
      />
    </main>
  );
}

const shell: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#F4F5F6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px calc(24px + env(safe-area-inset-bottom))',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: '#FFFFFF',
  border: '1px solid #E9E9E7',
  borderRadius: 20,
  padding: '26px 22px',
};

const title: React.CSSProperties = {
  fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A0A0A', margin: 0,
};

const body: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.55, color: '#777777', margin: '10px 0 0',
};
