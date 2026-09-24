import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabaseAdmin';
import OwnerQuickStatus from '@/components/owner-quick-status';
import PublishedBusinessBlocks from '@/components/published-business-blocks';
import PublicSocialLinks from '@/components/public-social-links';
import { imageTreatment } from '@/lib/image-treatment';
import PublicRatingRow from '@/components/public-rating-row';
import AnalyticsTracker from '@/components/analytics-tracker';
import PublicShareButton from '@/components/public-share-button';
import PublicLocationBlock from '@/components/public-location-block';
import { loadPublishedPageConfig } from '@/lib/published-page-config';
import { SITE_URL, pageUrl } from '@/lib/site';
import { bgAnimationStyle, BG_KEYFRAMES } from '@/lib/page-theme';
import type { Metadata } from 'next';
import { getBusinessStatus, applyOverride, weeklyFromRows } from '@/lib/business-status';

export const dynamic = 'force-dynamic';

/**
 * Per-business metadata. Without this every page inherited the app's own title
 * and description, so pasting a business link into iMessage, WhatsApp or Slack
 * produced a bare URL with no name, photo or description — for a link-in-bio
 * product that is a core-feature failure, not an SEO nicety.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const admin = getAdminClient();
    const { data: biz } = await admin
      .from('businesses')
      .select('id,name,tagline,address,avatar_url,header_url')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (!biz) return { title: 'Page not found — OpenStatus' };

    const b = biz as { id: string; name: string; tagline: string | null; address: string | null; avatar_url: string | null; header_url: string | null };
    const place = (b.address ?? '').split(',').slice(1, 3).join(',').trim();
    const title = place ? `${b.name} — ${place}` : b.name;
    const description = b.tagline?.trim()
      || (b.address ? `${b.name} · ${b.address}. Live hours and status.` : `${b.name} — live hours, status and links.`);

    const img = b.header_url || b.avatar_url;
    const ogImage = img
      ? (img.startsWith('http') ? img : `${SITE_URL}/api/assets?businessId=${b.id}&kind=${b.header_url ? 'header' : 'avatar'}`)
      : undefined;

    return {
      title,
      description,
      alternates: { canonical: pageUrl(slug) },
      openGraph: {
        type: 'website',
        url: pageUrl(slug),
        title,
        description,
        siteName: 'OpenStatus',
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    return {};
  }
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Hours = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
type Update = { kind: string; headline: string; detail: string | null; reason: string | null; closes_at: string | null; opens_at?: string | null; created_at: string; source: string | null; effective_date?: string | null };

function pretty(t: string | null) {
  if (!t) return '';
  const [h, m] = t.split(':');
  let n = parseInt(h, 10);
  const mer = n >= 12 ? 'PM' : 'AM';
  if (n === 0) n = 12; else if (n > 12) n -= 12;
  return `${n}:${m} ${mer}`;
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
  type BizRow = { id: string; user_id: string; name: string; tagline: string | null; avatar_url: string | null; header_url: string | null; timezone: string | null; place_id: string | null; address: string | null };
  let business: BizRow | null = null;
  const { data: fullData, error: fullError } = await admin
    .from('businesses')
    .select('id,user_id,name,tagline,avatar_url,header_url,timezone,place_id,address')
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
    business = { ...(basicData as Omit<BizRow, 'timezone'|'place_id'|'address'>), timezone: null, place_id: null, address: null };
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
    admin.from('status_updates').select('*').eq('business_id', business.id).eq('status', 'active').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(4),
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
      // A Menu block must never fall back to the website: tapping "Menu" then
      // silently lands the customer on the homepage with no menu and no
      // explanation. A block with no destination is filtered out instead.
      if (b.id === 'reviews' && !b.url && googleMapsReviewUrl) return { ...b, url: googleMapsReviewUrl };
      if (b.id === 'website' && !b.url && placeWebsite) return { ...b, url: placeWebsite };
      return b;
    }),
  };

  const hours: Hours[] = hoursRows ?? [];
  // A dated closure (a holiday booked in advance) has a future effective_date and
  // a far-future expires_at. Without this check it would read as "closed" the
  // moment it was created, days before the business actually shuts.
  const allUpdates: Update[] = updateRows ?? [];

  // Image URLs
  const avatar = typeof business.avatar_url === 'string' && business.avatar_url.startsWith('storage:')
    ? `/api/assets?businessId=${business.id}&kind=avatar` : business.avatar_url;
  const headerFromDb = typeof business.header_url === 'string' && business.header_url.startsWith('storage:')
    ? `/api/assets?businessId=${business.id}&kind=header` : business.header_url;
  const coverPhoto = enrichedConfig.bgImage || headerFromDb;

  // Theme color
  const themeColor = enrichedConfig.themeColor || '#DB6B8F';

  // Page background. `bg` may be any CSS background — a hex, a gradient, or a
  // multi-layer pattern from the curated designs — so it is used verbatim.
  // The photo fade needs a SOLID colour to fade into, which a gradient can't
  // provide, so pull the last hex out of the value for that purpose only.
  // (Previously anything not starting with '#' was thrown away here, which is
  //  why the curated gradient/pattern backgrounds never reached the live page.)
  const bg = typeof enrichedConfig.bg === 'string' && enrichedConfig.bg.trim()
    ? enrichedConfig.bg.trim()
    : '#F7F7F5';
  const bgSolid = /^#[0-9a-fA-F]{6}$/.test(bg)
    ? bg
    : (bg.match(/#[0-9a-fA-F]{6}/g)?.slice(-1)[0] ?? '#F7F7F5');
  const { r: bgR, g: bgG, b: bgB } = hexToRgb(bgSolid);
  // Light text when the page background is dark. Without this a dark background
  // rendered the business name in near-black and it disappeared.
  const bgIsDark = (0.2126*bgR + 0.7152*bgG + 0.0722*bgB) < 140;
  const nameColor = enrichedConfig.nameColor ?? (bgIsDark ? '#FFFFFF' : '#151515');
  const pageFont = enrichedConfig.font ?? 'Inter, system-ui, sans-serif';
  // Cover photo treatment: how present, how blurred, how washed. Applied to
  // the image layer only — putting opacity on the container would fade the
  // page's own text and cards along with the photo.
  const cover = imageTreatment({
    intensity: enrichedConfig.imageIntensity,
    blur: enrichedConfig.imageBlur,
    overlay: enrichedConfig.imageOverlay,
    pageIsDark: bgIsDark,
  });
  const fadeGradient = `linear-gradient(to bottom, rgba(${bgR},${bgG},${bgB},0) 0%, rgba(${bgR},${bgG},${bgB},0.08) 22%, rgba(${bgR},${bgG},${bgB},0.35) 48%, rgba(${bgR},${bgG},${bgB},0.72) 72%, ${bgSolid} 100%)`;

  // Hours / open status — one shared engine, see lib/business-status.ts.
  // The builder preview calls the same function, so the owner and their
  // customers can no longer be told different things.
  const timezone = business.timezone || 'America/Chicago';
  const localToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const updates: Update[] = allUpdates.filter(
    (u) => !u.effective_date || u.effective_date <= localToday
  );

  const status = getBusinessStatus(new Date(), timezone, weeklyFromRows(hours));
  const today = status.dayIndex;
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;

  const lead = updates[0] ?? null;
  const ownerClosed = updates.some((u) => u.kind === 'closed');
  // Today's override, folded on by the same function the builder preview uses,
  // so the two cannot disagree. opens_at matters: a "different hours today" of
  // 12:00-16:00 must not be read as opening at the regular 09:00.
  const hoursOverride = updates.find((u) => u.closes_at || u.opens_at) ?? null;
  const effective = applyOverride(status, ownerClosed
    ? { kind: 'closed' }
    : hoursOverride
      ? { closesAt: hoursOverride.closes_at, opensAt: hoursOverride.opens_at ?? null }
      : null);

  // Explicit hours for today beat the weekly schedule. Without this, a shop
  // that is normally closed on Monday but opened 12-4 this Monday still showed
  // "Closed today", because closedAllDay was read straight off the schedule
  // and checked before the override.
  const hasCustomHours = !!hoursOverride?.opens_at && !!hoursOverride?.closes_at;
  const hoursUnknown = effective.state === 'unknown';
  const closedAllDay = !hoursUnknown && (ownerClosed || (!hasCustomHours && !!todayRow && todayRow.is_closed && !status.overnight));
  const isOpen = effective.state === 'open';
  const effectiveClose = hoursOverride?.closes_at
    ?? (effective.closesAt ? `${effective.closesAt}:00` : todayRow?.closes_at ?? null);

  // Status. Absence of hours data must never be rendered as a factual claim
  // that the business is closed — that is how a page tells customers a shop is
  // shut while it is actually open.
  const dot = hoursUnknown ? '#8A8A86' : closedAllDay ? '#8A8A86' : isOpen ? '#22C55E' : '#E0921B';
  let bigText = 'Closed now', subText = 'Back tomorrow', accentText = '';
  if (hoursUnknown) { bigText = 'Hours not set'; subText = 'Check with the business'; }
  else if (closedAllDay) { bigText = 'Closed today'; subText = lead?.detail ?? 'Not open today'; }
  else if (isOpen) { bigText = 'Open now'; subText = 'Closes at '; accentText = pretty(effectiveClose); }
  else if (effective.opensAt) { bigText = 'Opens later'; subText = 'Opens at '; accentText = pretty(`${effective.opensAt}:00`); }

  // Block visibility
  const hoursBlock = enrichedConfig.blocks.find((b) => b.id === 'hours');
  const hoursBlockOn = hoursBlock?.on !== false;
  const locationBlock = enrichedConfig.blocks.find((b) => b.id === 'location');
  // A map is only meaningful with a real address. `sub` is the block's caption
  // ("Get directions"), never an address — using it made every page render a
  // zoom-1 map of the whole world.
  const mapAddress = (locationBlock?.address || business.address || '').trim();

  // Google returns "2716 Wind Gap Dr, Columbia, TN 38401, USA". The country and
  // postcode are noise to a local customer and compete with the business name
  // for attention, so the header shows street and town only. The full address
  // is still what the map and directions use.
  const shortAddress = (() => {
    const parts = mapAddress.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 2) return mapAddress;
    const [street, town, region] = parts;
    const state = (region ?? '').replace(/\s*\d{4,}.*$/, '').trim(); // drop the postcode
    return [street, town, state].filter(Boolean).join(', ');
  })();
  const locationBlockOn = locationBlock?.on !== false && !!locationBlock && (!!mapAddress || !!locationBlock.googleUrl || !!locationBlock.appleMapsUrl);

  // Initials fallback
  const initials = business.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();

  // Glass card style
  const glass = {
    background: bgIsDark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.72)',
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
    <div
      data-os-bg-anim={enrichedConfig.bgAnim ? '' : undefined}
      style={{
        minHeight: '100dvh',
        background: bg,
        fontFamily: pageFont,
        animation: bgAnimationStyle(enrichedConfig.bgAnim, enrichedConfig.bgAnimSpeed),
      }}
    >
      <style>{BG_KEYFRAMES}</style>

      {/* Background veil. Softens whatever the owner picked so the cards on
          top stay readable and a saturated colour stops shouting. Fixed, so
          it covers the full viewport rather than just the content column. */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: bgIsDark ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.26)',
        backdropFilter: 'saturate(0.86)',
        WebkitBackdropFilter: 'saturate(0.86)',
      }}/>
      {/* Structured data — this is what surfaces hours directly in Google results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: business.name,
          url: pageUrl(slug),
          ...(business.address ? { address: business.address } : {}),
          ...(business.tagline ? { description: business.tagline } : {}),
          ...(avatar ? { image: avatar.startsWith('http') ? avatar : `${SITE_URL}${avatar}` } : {}),
          ...(hours.length > 0 ? {
            openingHoursSpecification: hours
              .filter(h => !h.is_closed && h.opens_at && h.closes_at)
              .map(h => ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][h.day_of_week],
                opens: h.opens_at,
                closes: h.closes_at,
              })),
          } : {}),
        }) }}
      />
      <AnalyticsTracker businessId={business.id} ownerUserId={business.user_id}/>

      {/* ── Outer page centering wrapper ── */}
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Cover photo ── */}
        {coverPhoto ? (
          <div style={{ position: 'relative', height: 280, overflow: 'hidden', borderRadius: '0 0 0 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverPhoto}
              alt={`${business.name} cover`}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                objectPosition: enrichedConfig.bgImagePosition ?? '50% 60%', display: 'block',
                opacity: cover.opacity,
                filter: cover.blur ? `blur(${cover.blur}px)` : undefined,
                // Blur samples past the edges and leaves a soft transparent
                // band; scaling up hides it behind the clipped container.
                transform: cover.scale !== 1 ? `scale(${cover.scale})` : undefined,
              }}
            />
            {/* Readability wash, before the fade so the fade still wins at the bottom */}
            {cover.overlay && (
              <div style={{ position: 'absolute', inset: 0, background: cover.overlay }}/>
            )}
            {/* Editorial gradient fade into page bg */}
            <div style={{
              position: 'absolute', inset: 0,
              background: fadeGradient,
            }}/>
          </div>
        ) : (
          // No cover photo. A flat grey band looked like an image that had
          // failed to load; a soft wash of the page's own theme colour reads
          // as a deliberate header instead. The solid base is the fallback if
          // color-mix isn't supported.
          <div style={{
            height: 96,
            width: '100vw', marginLeft: 'calc(50% - 50vw)',
            background: bgIsDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.022)',
            backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${themeColor} 18%, transparent) 0%, transparent 100%)`,
          }}/>
        )}

        {/* ── Logo ── */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginTop: coverPhoto ? -38 : 0,
          position: 'relative', zIndex: 10,
        }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar} alt={`${business.name} logo`}
              style={{
                width: 80, height: 80, borderRadius: '50%',
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
              width: 80, height: 80, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.90)',
              background: 'rgba(255,255,255,0.80)',
              backdropFilter: 'blur(20px)',
              display: 'grid', placeItems: 'center',
              fontSize: 22, fontWeight: 800, color: themeColor,
              boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            }}>
              {initials}
            </div>
          )}
        </div>

        {/* ── Business name ── */}
        <div style={{ textAlign: 'center', padding: '6px 16px 2px' }}>
          <h1 style={{
            fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
            color: nameColor, lineHeight: 1, margin: 0,
            fontFamily: pageFont,
          }}>
            {business.name}
          </h1>
          {shortAddress && (
            <p style={{
              // Address, tags and tagline used to sit at near-identical size
              // and colour, so they blurred into one grey paragraph. Each now
              // steps down in weight so the eye can tell them apart.
              fontSize: 12.5, fontWeight: 500,
              color: bgIsDark ? 'rgba(255,255,255,0.74)' : '#5A5A57',
              marginTop: 7, lineHeight: 1.4,
            }}>
              {shortAddress}
            </p>
          )}
          {(enrichedConfig.tags ?? []).length > 0 && (
            <p style={{
              maxWidth:440, margin:'6px auto 0', padding:'0 8px',
              fontSize:12, fontWeight:400, lineHeight:1.55,
              color:bgIsDark ? 'rgba(255,255,255,0.58)' : 'rgba(21,21,21,0.48)',
            }}>
              {(enrichedConfig.tags ?? []).filter(Boolean).join(' · ')}
            </p>
          )}
          {business.tagline && (
            <p style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.16em',
              textTransform: 'uppercase', marginTop: 7,
              color: bgIsDark ? 'rgba(255,255,255,0.52)' : 'rgba(21,21,21,0.42)',
            }}>
              {business.tagline}
            </p>
          )}
          {/* Credibility sits with the identity it belongs to, not in a bar
              of its own further down the page. */}
          <PublicRatingRow businessId={business.id} placeId={business.place_id} dark={bgIsDark}/>

          {/* The one thing we want a visitor to do. */}
          <div style={{ marginTop: 15, display: 'flex', justifyContent: 'center' }}>
            <PublicShareButton
              businessName={business.name}
              url={pageUrl(slug)}
              businessId={business.id}
              dark={bgIsDark}
              accent={themeColor}
            />
          </div>
        </div>

        {/* ── Status: the reason this page exists, so it leads ──
             This used to sit third — below the name, the share button and the
             star rating — styled identically to Reviews and Website. Whether a
             shop is open right now is the one thing this page knows that a
             plain link list doesn't, so it goes first and it is allowed to be
             loud. */}
        <div style={{ padding: '22px 12px 0' }}>
        {/* Hours card */}
        {hoursBlockOn && (
          <details style={{
            ...glass,
            borderRadius: 24,
            overflow: 'hidden',
          }}>
            <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '15px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: isOpen ? 'rgba(34,197,94,0.12)' : 'rgba(0,0,0,0.05)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
                    stroke={isOpen ? '#22C55E' : '#8A8A86'}
                    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: dot, display: 'inline-block', flexShrink: 0,
                    }}/>
                    <span style={{
                      fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
                      color: bgIsDark ? '#FFFFFF' : '#151515',
                    }}>
                      {bigText}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13.5, marginTop: 3,
                    color: bgIsDark ? 'rgba(255,255,255,0.68)' : '#6B6B68',
                  }}>
                    {subText}
                    {accentText && <strong style={{ color: dot, fontWeight: 800 }}>{accentText}</strong>}
                  </p>
                </div>
                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={bgIsDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.28)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {/* Lead update pill */}
              {lead && (
                <div style={{
                  marginTop: 10, borderRadius: 12,
                  background: bgIsDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.04)',
                  border: bgIsDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.06)',
                  padding: '8px 12px', fontSize: 12,
                  color: bgIsDark ? 'rgba(255,255,255,0.92)' : '#292929',
                }}>
                  <strong>{lead.headline}</strong>
                  {lead.detail && <p style={{ marginTop: 2, color: bgIsDark ? 'rgba(255,255,255,0.64)' : '#8A8A86' }}>{lead.detail}</p>}
                </div>
              )}
            </summary>

            {/* Weekly hours table */}
            <ul style={{
              borderTop: bgIsDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.06)',
              margin: 0, padding: '12px 18px',
              listStyle: 'none',
            }}>
              {DAY_NAMES.map((d, i) => (
                <li key={d} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '5px 0', fontSize: 13,
                  color: i === today
                    ? (bgIsDark ? '#FFFFFF' : '#151515')
                    : (bgIsDark ? 'rgba(255,255,255,0.62)' : '#8A8A86'),
                  fontWeight: i === today ? 600 : 400,
                }}>
                  <span>{d}</span>
                  <span>{rowLabel(hours.find((h) => h.day_of_week === i))}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        </div>

        {/* ── Blocks ── */}
        <div style={{ padding: '8px 12px 36px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Location block */}
          {locationBlockOn && locationBlock && (
            <PublicLocationBlock block={locationBlock} businessId={business.id} themeColor={themeColor} dark={bgIsDark}/>
          )}

          {/* All other blocks */}
          <PublishedBusinessBlocks
          dark={bgIsDark}
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
            // Was 10px at 22% black, which on a light background is all but
            // invisible — and on a dark one it disappeared completely, since
            // the colour never looked at bgIsDark. This mark sits on every
            // customer's page, so it should be readable without shouting.
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: bgIsDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.42)',
            paddingBottom: 'calc(32px + env(safe-area-inset-bottom))', textDecoration: 'none',
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
