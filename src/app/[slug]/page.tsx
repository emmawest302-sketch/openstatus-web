import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabaseAdmin';
import PublishedBusinessBlocks from '@/components/published-business-blocks';
import { shortAddress } from '@/lib/address';
import { shareImageUrl } from '@/lib/share-image';
import { externalUrl } from '@/lib/url';
import { PAGE_METRICS_CSS, PAGE_CONTAINER_CLASS } from '@/lib/page-metrics';
import PublicSocialLinks from '@/components/public-social-links';
import PublicBanner from '@/components/public-banner';
import PublicBioCard from '@/components/public-bio-card';
import PublicHoursRow from '@/components/public-hours-row';
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
      .select('id,user_id,name,tagline,address,avatar_url,header_url')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (!biz) return { title: 'Page not found — OpenStatus' };

    const b = biz as {
      id: string; user_id: string; name: string;
      tagline: string | null; address: string | null;
      avatar_url: string | null; header_url: string | null;
    };

    // The cover lives in the page config, not on the businesses row. Reading
    // the row alone is what put owners' logos into their text previews.
    const config = await loadPublishedPageConfig(b.user_id, b.id).catch(() => null);

    // "Columbia, TN" — not "Columbia, TN 38401", which is what slicing the
    // raw Google string gave. shortAddress already knows where the postcode is.
    const place = shortAddress(b.address).split(',').slice(1).map(p => p.trim()).filter(Boolean).join(', ');
    const title = place ? `${b.name} — ${place}` : b.name;
    const description = b.tagline?.trim()
      || (b.address ? `${b.name} · ${b.address}. Live hours and status.` : `${b.name} — live hours, status and links.`);

    const ogImage = shareImageUrl({
      siteUrl: SITE_URL,
      businessId: b.id,
      bgImage: config?.bgImage,
      headerUrl: b.header_url,
      avatarUrl: b.avatar_url,
    });

    return {
      title,
      description,
      metadataBase: new URL(SITE_URL),
      alternates: { canonical: pageUrl(slug) },
      openGraph: {
        type: 'website',
        url: pageUrl(slug),
        title,
        description,
        // The shop's name, not ours. Several clients print site_name above the
        // title, and "OpenStatus" there reads as though the link is to us.
        siteName: b.name,
        ...(ogImage ? { images: [{ url: ogImage, alt: `${b.name}` }] } : {}),
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  } catch {
    // Returning {} here inherits the root layout's title, so a page that hits
    // this path is shared as "OpenStatus — the link in bio for small
    // businesses". The business's own name is the one thing we can still be
    // sure of, so say that much.
    return { title: slug, openGraph: { title: slug, siteName: slug } };
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
  type BizRow = { id: string; user_id: string; name: string; tagline: string | null; avatar_url: string | null; header_url: string | null; timezone: string | null; place_id: string | null; address: string | null; website: string | null };
  let business: BizRow | null = null;
  const { data: fullData, error: fullError } = await admin
    .from('businesses')
    .select('id,user_id,name,tagline,avatar_url,header_url,timezone,place_id,address,website')
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
    business = { ...(basicData as Omit<BizRow, 'timezone'|'place_id'|'address'|'website'>), timezone: null, place_id: null, address: null, website: null };
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

  /** One line of the hours table, labelled for how a customer thinks about it. */
  const dayRow = (dayIndex: number, label: string) => {
    const row = hours.find((h) => h.day_of_week === dayIndex);
    return {
      label,
      hours: rowLabel(row),
      isToday: dayIndex === today,
      closed: !!row?.is_closed,
    };
  };

  // Block visibility
  const hoursBlock = enrichedConfig.blocks.find((b) => b.id === 'hours');
  const hoursBlockOn = hoursBlock?.on !== false;
  const locationBlock = enrichedConfig.blocks.find((b) => b.id === 'location');
  // A map is only meaningful with a real address. `sub` is the block's caption
  // ("Get directions"), never an address — using it made every page render a
  // zoom-1 map of the whole world.
  const mapAddress = (business.address || locationBlock?.address || '').trim();

  // Street and town only — the postcode and the country are noise to a local
  // customer and wrap the line onto a second row. See lib/address.
  const shortAddr = shortAddress(mapAddress);

  const locationBlockOn = locationBlock?.on !== false && !!locationBlock && (!!mapAddress || !!locationBlock.googleUrl || !!locationBlock.appleMapsUrl);

  // Initials fallback
  // Website and Directions are header actions now, not rows. Read them from
  // the blocks so an owner's existing setup still feeds them, and fall back to
  // the address when no location block has a link of its own.
  //
  // The business's own Website field is the source of truth. It used to read
  // the retired `website` block only, so an owner could fill Website in under
  // Business, see it saved, and get no Website button on their page — the two
  // fields looked like the same thing and were not. The block is still read as
  // a fallback for pages configured before Website left the row list.
  const websiteBlock = enrichedConfig.blocks.find((b) => b.id === 'website');
  const headerWebsiteUrl = externalUrl(business.website) || externalUrl(websiteBlock?.url) || null;
  //
  // Directions is a button and a link, nothing more. An owner who wants their
  // exact Google or Apple listing pastes it; everyone else leaves it blank and
  // gets a maps search for their address, which opens whichever maps app the
  // visitor actually uses.
  const directionsTarget = (business.address || locationBlock?.address || '').trim();
  const headerDirectionsUrl = externalUrl(enrichedConfig.directionsUrl)
    || (directionsTarget ? `https://maps.google.com/?q=${encodeURIComponent(directionsTarget)}` : null);

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
      <style>{PAGE_METRICS_CSS}</style>

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
      {/* The --os-* scale is a container query, so it reads this column's
          width rather than the window's. That is what lets the builder's
          340px preview and a 390px phone render identically. */}
      <div className={PAGE_CONTAINER_CLASS} style={{ maxWidth: 560, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Owner's notice ── above the cover, because the whole point is
             that it is read before anything else on the page. */}
        {enrichedConfig.bannerOn !== false && (
          <PublicBanner text={enrichedConfig.banner}/>
        )}

        {/* ── Cover photo ── */}
        {coverPhoto ? (
          // 280px was a desktop hero on a phone: it pushed the name, the
          // address and the hours below the fold on a 390px screen. The cover
          // is scene-setting, not the content.
          <div style={{ position: 'relative', height: 'var(--os-cover-h, 214px)', overflow: 'hidden' }}>
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
            height: 'var(--os-cover-h-bare, 84px)',
            width: '100vw', marginLeft: 'calc(50% - 50vw)',
            background: bgIsDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.022)',
            backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${themeColor} 18%, transparent) 0%, transparent 100%)`,
          }}/>
        )}

        {/* ── Protected business bio ──
             Identity on frosted glass rather than straight onto the cover
             photo, so a dark interior shot or a bright window doesn't decide
             whether the shop's own name is readable. Website and Directions
             live in here too: every business has one, the other or neither,
             and they're what a customer reaches for first — too important to
             be blocks an owner can switch off or bury. */}
        <PublicBioCard
          businessName={business.name}
          businessId={business.id}
          slug={slug}
          address={shortAddr || business.address}
          tags={enrichedConfig.tags ?? []}
          placeId={business.place_id}
          websiteUrl={headerWebsiteUrl}
          directionsUrl={headerDirectionsUrl}
          shareUrl={pageUrl(slug)}
          dark={bgIsDark}
          accent={themeColor}
          nameColor={nameColor}
          pageFont={pageFont}
          logo={avatar}
          initials={initials}
        />

        {/* ── Live hours ──
             The one question a customer arrives with, answered before
             anything else. The old version was a card the same weight as
             Website and Menu; this one is allowed to dominate, because it is
             the only thing on the page they cannot get from a Google result. */}
        {hoursBlockOn && (
          <div style={{ padding: 'clamp(12px, 4cqw, 18px) clamp(9px, 3.2cqw, 12px) 0' }}>
            <PublicHoursRow
              state={hoursUnknown ? 'unknown' : isOpen ? 'open' : 'closed'}
              headline={bigText}
              detail={subText}
              accent={accentText || null}
              note={lead ? { headline: lead.headline, detail: lead.detail } : null}
              today={dayRow(today, 'Today')}
              tomorrow={dayRow((today + 1) % 7, 'Tomorrow')}
              week={DAY_NAMES.map((name, i) => ({
                label: name,
                hours: rowLabel(hours.find((h) => h.day_of_week === i)),
                isToday: i === today,
                closed: !!hours.find((h) => h.day_of_week === i)?.is_closed,
              }))}
              dark={bgIsDark}
            />
          </div>
        )}

        {/* ── Blocks ── */}
        <div style={{ padding: 'var(--os-gap, 8px) clamp(9px, 3.2cqw, 12px) 36px', display: 'flex', flexDirection: 'column', gap: 'var(--os-gap, 8px)' }}>

          {/* Location and Website used to be rows here. They are permanent
              header actions now, so PublishedBusinessBlocks filters them out
              and the map, when there is one, renders under the address. */}

          {/* All other blocks */}
          <PublishedBusinessBlocks
          dark={bgIsDark}
            today={localToday}
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

      {/* The owner bar used to live here. It checked for a Supabase session
          and rendered nothing without one — and an owner almost always reaches
          their own page by tapping the link in their Instagram bio, which
          opens in Instagram's own webview with a separate cookie jar and no
          session. So it was invisible in the one place it was most needed,
          while still being a floating bar over a page meant to look clean.
          Owner controls move to a private link instead. */}
    </div>
    </>
  );
}
