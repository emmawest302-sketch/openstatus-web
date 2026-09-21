import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabaseAdmin';
import OwnerQuickStatus from '@/components/owner-quick-status';
import PublishedBusinessBlocks from '@/components/published-business-blocks';
import PublicSocialLinks from '@/components/public-social-links';
import PublicRatingRow from '@/components/public-rating-row';
import AnalyticsTracker from '@/components/analytics-tracker';
import PublicLocationBlock from '@/components/public-location-block';
import { loadPublishedPageConfig } from '@/lib/published-page-config';

export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Hours = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
type Update = { kind: string; headline: string; detail: string | null; reason: string | null; closes_at: string | null; created_at: string; source: string | null };

function pretty(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  let n = parseInt(h, 10);
  const mer = n >= 12 ? 'PM' : 'AM';
  if (n === 0) n = 12; else if (n > 12) n -= 12;
  return `${n}:${m} ${mer}`;
}
function mins(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}
function rowLabel(r: Hours | undefined) {
  return !r ? '-' : r.is_closed ? 'Closed' : `${pretty(r.opens_at)} – ${pretty(r.closes_at)}`;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 247, g: 247, b: 245 };
}

export default async function LiveStatus({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = getAdminClient();
  // Try full query; fall back gracefully if optional columns (timezone, place_id) don't exist yet
  type BizRow = { id: string; user_id: string; name: string; tagline: string | null; avatar_url: string | null; header_url: string | null; timezone: string | null; place_id: string | null };
  let business: BizRow | null = null;
  const { data: fullData, error: fullError } = await admin
    .from('businesses')
    .select('id,user_id,name,tagline,avatar_url,header_url,timezone,place_id')
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (fullError) {
    // Column may not exist — retry without optional fields
    const { data: basicData } = await admin
      .from('businesses')
      .select('id,user_id,name,tagline,avatar_url,header_url')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();
    if (!basicData) notFound();
    business = { ...(basicData as Omit<BizRow, 'timezone'|'place_id'>), timezone: null, place_id: null };
  } else {
    business = fullData as BizRow | null;
  }
  if (!business) notFound();

  // Fetch Google Places website for menu/reviews auto-linking
  async function fetchPlaceWebsite(placeId: string): Promise<string | null> {
    const key = process.env.GOOGLE_PLACES_API_KEY ?? '';
    if (!key || !placeId) return null;
    try {
      const r = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website&key=${key}`,
        { next: { revalidate: 86400 } }
      );
      const d = await r.json() as { result?: { website?: string } };
      return d.result?.website ?? null;
    } catch { return null; }
  }

  const [{ data: hoursRows }, { data: updateRows }, pageConfig, placeWebsite] = await Promise.all([
    admin.from('business_hours').select('day_of_week,opens_at,closes_at,is_closed').eq('business_id', business.id),
    admin.from('status_updates').select('kind,headline,detail,reason,closes_at,created_at,source').eq('business_id', business.id).eq('status', 'active').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(4),
    loadPublishedPageConfig(business.user_id),
    business.place_id ? fetchPlaceWebsite(business.place_id as string) : Promise.resolve(null),
  ]);

  // Auto-fill block URLs from Google Places when owner hasn't set them
  const googleMapsReviewUrl = business.place_id
    ? `https://search.google.com/local/reviews?placeid=${business.place_id}`
    : null;
  const enrichedConfig = {
    ...pageConfig,
    blocks: pageConfig.blocks.map(b => {
      if (b.id === 'menu' && !b.url && placeWebsite) return { ...b, url: placeWebsite };
      if (b.id === 'reviews' && !b.url && googleMapsReviewUrl) return { ...b, url: googleMapsReviewUrl };
      if (b.id === 'website' && !b.url && placeWebsite) return { ...b, url: placeWebsite };
      return b;
    }),
  };

  const hours: Hours[] = hoursRows ?? [];
  const updates: Update[] = updateRows ?? [];

  // Image URLs
  const avatar = typeof business.avatar_url === 'string' && business.avatar_url.startsWith('storage:')
    ? `/api/assets?businessId=${business.id}&kind=avatar` : business.avatar_url;
  const headerFromDb = typeof business.header_url === 'string' && business.header_url.startsWith('storage:')
    ? `/api/assets?businessId=${business.id}&kind=header` : business.header_url;
  const coverPhoto = enrichedConfig.bgImage || headerFromDb;

  // Theme color
  const themeColor = enrichedConfig.themeColor || '#DB6B8F';

  // Page background
  const bg = typeof enrichedConfig.bg === 'string' && enrichedConfig.bg.startsWith('#')
    ? pageConfig.bg
    : '#F7F7F5';
  const { r: bgR, g: bgG, b: bgB } = hexToRgb(bg);
  const fadeGradient = `linear-gradient(to bottom, rgba(${bgR},${bgG},${bgB},0) 0%, rgba(${bgR},${bgG},${bgB},0.08) 22%, rgba(${bgR},${bgG},${bgB},0.35) 48%, rgba(${bgR},${bgG},${bgB},0.72) 72%, ${bg} 100%)`;

  // Hours / open status
  const timezone = business.timezone || 'America/Chicago';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const today = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(weekday);
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;
  const nowMins = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) * 60 + Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const lead = updates[0] ?? null;
  const effectiveClose = updates.find((u) => u.closes_at)?.closes_at ?? todayRow?.closes_at ?? null;
  const closedAllDay = !todayRow || todayRow.is_closed || updates.some((u) => u.kind === 'closed');
  const openMins = mins(todayRow?.opens_at ?? null);
  const closeMins = mins(effectiveClose);
  const isOpen = !closedAllDay && openMins !== null && closeMins !== null && nowMins >= openMins && nowMins < closeMins;

  // Status
  const dot = closedAllDay ? '#8A8A86' : isOpen ? '#22C55E' : '#E0921B';
  let bigText = 'Closed now', subText = 'Back tomorrow', accentText = '';
  if (closedAllDay) { bigText = 'Closed today'; subText = lead?.detail ?? 'Not open today'; }
  else if (isOpen) { bigText = 'Open now'; subText = 'Closes at '; accentText = pretty(effectiveClose); }
  else if (openMins !== null && nowMins < openMins) { bigText = 'Opens later'; subText = 'Opens at '; accentText = pretty(todayRow?.opens_at ?? null); }

  // Block visibility
  const hoursBlock = enrichedConfig.blocks.find((b) => b.id === 'hours');
  const hoursBlockOn = hoursBlock?.on !== false;
  const locationBlock = enrichedConfig.blocks.find((b) => b.id === 'location');
  const locationBlockOn = locationBlock?.on !== false && locationBlock && (locationBlock.googleUrl || locationBlock.appleMapsUrl || locationBlock.sub || locationBlock.address);

  // Initials fallback
  const initials = business.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();

  // Glass card style
  const glass = {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: '1px solid rgba(255,255,255,0.82)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
  } as React.CSSProperties;

  return (
    <>
      {enrichedConfig.font && (() => {
        const GOOGLE_FONTS: Record<string,string> = {
          '"Playfair Display", Georgia, serif':      'Playfair+Display:wght@700;800',
          '"Poppins", system-ui, sans-serif':        'Poppins:wght@700;800',
          '"DM Serif Display", Georgia, serif':      'DM+Serif+Display',
          '"Space Grotesk", system-ui, sans-serif':  'Space+Grotesk:wght@600;700',
          '"Bebas Neue", Impact, sans-serif':        'Bebas+Neue',
          '"Cormorant Garamond", Georgia, serif':    'Cormorant+Garamond:wght@600;700',
          '"Pacifico", cursive':                     'Pacifico',
          '"Oswald", Impact, sans-serif':            'Oswald:wght@600;700',
          '"Lobster", cursive':                      'Lobster',
        };
        const gf = GOOGLE_FONTS[enrichedConfig.font ?? ''];
        if (!gf) return null;
        return <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${gf}&display=swap`}/>;
      })()}
    <div style={{ minHeight: '100dvh', background: bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AnalyticsTracker businessId={business.id}/>

      {/* ── Outer page centering wrapper ── */}
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>

        {/* ── Cover photo ── */}
        {coverPhoto ? (
          <div style={{ position: 'relative', height: 220, overflow: 'hidden', borderRadius: '0 0 0 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPhoto}
              alt={`${business.name} cover`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 60%', display: 'block' }}
            />
            {/* Editorial gradient fade into page bg */}
            <div style={{
              position: 'absolute', inset: 0,
              background: fadeGradient,
            }}/>
          </div>
        ) : (
          <div style={{ height: 80, background: 'rgba(0,0,0,0.04)' }}/>
        )}

        {/* ── Logo ── */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginTop: coverPhoto ? -52 : 0,
          position: 'relative', zIndex: 10,
        }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar} alt={`${business.name} logo`}
              style={{
                width: 104, height: 104, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.90)',
                background: 'rgba(255,255,255,0.80)',
                objectFit: 'cover',
                boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                display: 'block',
                backdropFilter: 'blur(20px)',
              }}
            />
          ) : (
            <div style={{
              width: 104, height: 104, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.90)',
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(20px)',
              display: 'grid', placeItems: 'center',
              fontSize: 32, fontWeight: 800, color: themeColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            }}>
              {initials}
            </div>
          )}
        </div>

        {/* ── Business name ── */}
        <div style={{ textAlign: 'center', padding: '10px 20px 4px' }}>
          <h1 style={{
            fontSize: 48, fontWeight: 800, letterSpacing: '-0.035em',
            color: '#151515', lineHeight: 1, margin: 0,
            fontFamily: enrichedConfig.font ?? 'Georgia, "Times New Roman", serif',
          }}>
            {business.name}
          </h1>
          {business.tagline && (
            <p style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#4B4B4B', marginTop: 8,
            }}>
              {business.tagline}
            </p>
          )}
        </div>

        {/* ── Rating row ── */}
        <div style={{ padding: '10px 16px 0' }}>
          <PublicRatingRow businessId={business.id} placeId={business.place_id}/>
        </div>

        {/* ── Blocks ── */}
        <div style={{ padding: '10px 14px 48px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Hours card */}
          {hoursBlockOn && (
            <details style={{
              ...glass,
              borderRadius: 22,
              overflow: 'hidden',
            }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: isOpen ? 'rgba(34,197,94,0.10)' : 'rgba(0,0,0,0.05)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke={isOpen ? '#22C55E' : '#8A8A86'}
                      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: dot, display: 'inline-block', flexShrink: 0,
                      }}/>
                      <span style={{ fontSize: 17, fontWeight: 700, color: '#151515', letterSpacing: '-0.02em' }}>
                        {bigText}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#8A8A86', marginTop: 2 }}>
                      {subText}
                      {accentText && <strong style={{ color: dot, fontWeight: 700 }}>{accentText}</strong>}
                    </p>
                  </div>
                  {/* Chevron */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="rgba(0,0,0,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                {/* Lead update pill */}
                {lead && (
                  <div style={{
                    marginTop: 10, borderRadius: 12,
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    padding: '8px 12px', fontSize: 12, color: '#292929',
                  }}>
                    <strong>{lead.headline}</strong>
                    {lead.detail && <p style={{ marginTop: 2, color: '#8A8A86' }}>{lead.detail}</p>}
                  </div>
                )}
              </summary>

              {/* Weekly hours table */}
              <ul style={{
                borderTop: '1px solid rgba(0,0,0,0.06)',
                margin: 0, padding: '12px 18px',
                listStyle: 'none',
              }}>
                {DAY_NAMES.map((d, i) => (
                  <li key={d} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0', fontSize: 13,
                    color: i === today ? '#151515' : '#8A8A86',
                    fontWeight: i === today ? 600 : 400,
                  }}>
                    <span>{d}</span>
                    <span>{rowLabel(hours.find((h) => h.day_of_week === i))}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Location block */}
          {locationBlockOn && locationBlock && (
            <PublicLocationBlock block={locationBlock} businessId={business.id} themeColor={themeColor}/>
          )}

          {/* All other blocks */}
          <PublishedBusinessBlocks
            businessId={business.id}
            businessName={business.name}
            location={enrichedConfig.location || business.tagline || business.name}
            config={enrichedConfig}
            themeColor={themeColor}
            placeId={business.place_id}
          />

        </div>

        {/* ── Social icons ── */}
        <PublicSocialLinks businessId={business.id} socials={enrichedConfig.socials}/>

        {/* Footer */}
        <Link
          href="/"
          style={{
            display: 'block', textAlign: 'center',
            fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.22)', paddingBottom: 'calc(32px + env(safe-area-inset-bottom))', textDecoration: 'none',
          }}
        >
          Powered by OpenStatus
        </Link>
      </div>

      <OwnerQuickStatus businessId={business.id} businessName={business.name}/>
    </div>
    </>
  );
}
