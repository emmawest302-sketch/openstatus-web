import PublicRatingRow from '@/components/public-rating-row';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';
import type { ButtonStyle } from '@/lib/openstatus-page-config';
import PublicShareButton from '@/components/public-share-button';

/**
 * The business identity, on a surface that protects it.
 *
 * An owner can put any photo behind this — a dark interior, a bright window,
 * a busy street. Their name and address have to stay readable through all of
 * them, and asking the owner to fix the contrast themselves is asking them to
 * be a designer. So the bio sits on frosted glass that adapts to the page
 * rather than on the photo directly.
 *
 * Website and Directions live here rather than in the block list. Every
 * business has one, the other, or neither, and they are the two things a
 * customer reaches for first — too important to be something an owner can
 * forget to switch on or bury under a custom link.
 *
 * Sizing note: this card is read on a phone, in one hand, usually from an
 * Instagram bio tap. The sizes come from the --os-* scale in lib/page-metrics,
 * which is driven by the width of the column the page is in rather than fixed
 * pixels — the builder preview is a 340px box and the live page runs from 320
 * to 560, and numbers tuned at one of those looked oversized at another. The
 * literals in the var() fallbacks are the 390px values, so this still renders
 * sensibly if the stylesheet ever fails to land.
 *
 * Tags scroll sideways instead of wrapping onto a third line — a fourth tag is
 * not worth 30px of the only screen the customer will ever see.
 */

type Props = {
  businessName: string;
  businessId: string;
  slug: string;
  address: string | null;
  tags: string[];
  placeId?: string | null;
  websiteUrl: string | null;
  directionsUrl: string | null;
  shareUrl: string;
  dark: boolean;
  accent: string;
  nameColor: string;
  pageFont: string;
  logo: string | null;
  initials: string;
  /**
   * How the three header buttons are drawn. One decision for the page: a
   * header with a filled Website, an outlined Directions and a glass Share is
   * three shapes in a row and reads as a mistake.
   */
  buttonStyle?: ButtonStyle;
};

export default function PublicBioCard({
  businessName, businessId, address, tags, placeId,
  websiteUrl, directionsUrl, shareUrl, dark, accent, nameColor, pageFont,
  logo, initials, buttonStyle = 'filled',
}: Props) {
  const glass: React.CSSProperties = {
    background: dark ? 'rgba(22,22,24,0.62)' : 'rgba(255,255,255,0.74)',
    backdropFilter: 'blur(28px) saturate(140%)',
    WebkitBackdropFilter: 'blur(28px) saturate(140%)',
    border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.75)',
    boxShadow: dark ? '0 14px 40px rgba(0,0,0,0.34)' : '0 14px 40px rgba(0,0,0,0.09)',
    borderRadius: 'var(--os-radius, 22px)',
  };

  const muted = dark ? 'rgba(255,255,255,0.68)' : 'rgba(21,21,21,0.58)';

  return (
    <div style={{ ...glass, padding: '0 var(--os-card-pad, 16px) var(--os-card-pad, 16px)', marginTop: 'calc(var(--os-logo, 68px) * -0.53)', position: 'relative', zIndex: 2 }}>
      {/* Logo straddles the top edge, tying the card to the cover above it. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'calc(var(--os-logo, 68px) * -0.5)' }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={`${businessName} logo`} style={logoStyle(dark)}/>
        ) : (
          <div style={{ ...logoStyle(dark), display: 'grid', placeItems: 'center', fontSize: 'calc(var(--os-logo, 68px) * 0.32)', fontWeight: 800, color: accent }}>
            {initials}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', paddingTop: 'clamp(7px, 2.4cqw, 10px)' }}>
        <h1 style={{
          fontSize: 'var(--os-name, 28px)', fontWeight: 800, letterSpacing: '-0.035em',
          color: nameColor, lineHeight: 1.08, margin: 0, fontFamily: pageFont,
        }}>
          {businessName}
        </h1>

        {address && (
          <p style={{ fontSize: 'var(--os-addr, 15px)', color: muted, margin: '5px 0 0', lineHeight: 1.3 }}>
            {address}
          </p>
        )}

        {tags.length > 0 && (
          // One row that scrolls, not a block that grows. Wrapping tags were
          // adding a second and third line of height to the most valuable
          // part of the page for information nobody scrolled back up to read.
          <div
            className="os-tag-strip"
            style={{ marginTop: 9, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            <style>{'.os-tag-strip::-webkit-scrollbar{display:none}'}</style>
            {/* width:max-content + margin auto centres a short list and, once
                the list is wider than the card, collapses to zero so the
                overflow actually scrolls instead of clipping the first tag. */}
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 5, width: 'max-content', margin: '0 auto' }}>
              {tags.filter(Boolean).slice(0, 6).map((tag) => (
                <span key={tag} style={{
                  fontSize: 'var(--os-tag, 11px)', fontWeight: 500, padding: '4px 9px', borderRadius: 999,
                  whiteSpace: 'nowrap', flexShrink: 0,
                  color: dark ? 'rgba(255,255,255,0.80)' : 'rgba(21,21,21,0.68)',
                  background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.05)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <PublicRatingRow businessId={businessId} placeId={placeId} dark={dark}/>

        {/* All three on one row. Share used to wrap onto a line of its own on
            a narrow screen, which read as a separate, more important thing
            than the two actions it sits beside. */}
        <div style={{
          display: 'flex', flexWrap: 'nowrap', justifyContent: 'center',
          alignItems: 'center', gap: 5, marginTop: 'clamp(10px, 3.4cqw, 13px)',
        }}>
          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noreferrer" style={primaryAction(dark, buttonStyle)}
              onClick={() => trackOpenStatusEvent(businessId, 'block_click', 'website')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Website
            </a>
          )}

          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noreferrer" style={secondaryAction(dark, buttonStyle)}
              onClick={() => trackOpenStatusEvent(businessId, 'directions_click', 'directions')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              Directions
            </a>
          )}

          <PublicShareButton
            businessName={businessName}
            url={shareUrl}
            businessId={businessId}
            dark={dark}
            accent={accent}
            buttonStyle={buttonStyle}
          />
        </div>
      </div>
    </div>
  );
}

function logoStyle(dark: boolean): React.CSSProperties {
  return {
    width: 'var(--os-logo, 68px)', height: 'var(--os-logo, 68px)', borderRadius: '50%',
    objectFit: 'cover',
    border: dark ? '3px solid rgba(255,255,255,0.22)' : '3px solid rgba(255,255,255,0.92)',
    background: dark ? 'rgba(40,40,44,0.9)' : 'rgba(255,255,255,0.92)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
    display: 'block',
  };
}

const actionBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  // 12px of side padding made the three pills 297px wide, which bleeds
  // past the card's own padding on a 320px screen.
  padding: 'var(--os-action-pad-y, 9px) var(--os-action-pad-x, 10px)', borderRadius: 999,
  fontSize: 'var(--os-action-fs, 12.5px)', fontWeight: 650, letterSpacing: '-0.01em',
  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
};

/**
 * Three ways to draw the same button.
 *
 * `filled` is the default and what the page has always looked like: a solid
 * primary, a soft secondary. `outline` drops the fills so the cover photo
 * carries the header. `glass` leans on the same frosted material as the card
 * itself. The primary stays visibly primary in all three — a style choice
 * should not flatten the hierarchy of what to tap first.
 */
function primaryAction(dark: boolean, style: ButtonStyle): React.CSSProperties {
  const ink = dark ? '#FFFFFF' : '#0A0A0A';
  if (style === 'outline') return {
    ...actionBase,
    background: 'transparent',
    color: ink,
    border: `1.5px solid ${ink}`,
  };
  if (style === 'glass') return {
    ...actionBase,
    background: dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.94)',
    color: dark ? '#FFFFFF' : '#0A0A0A',
    border: dark ? '1px solid rgba(255,255,255,0.32)' : '1px solid rgba(10,10,10,0.10)',
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  };
  return {
    ...actionBase,
    background: dark ? '#FFFFFF' : '#0A0A0A',
    color: dark ? '#0A0A0A' : '#FFFFFF',
    boxShadow: '0 5px 14px rgba(0,0,0,0.13)',
  };
}

function secondaryAction(dark: boolean, style: ButtonStyle): React.CSSProperties {
  const ink = dark ? '#FFFFFF' : '#151515';
  if (style === 'outline') return {
    ...actionBase,
    background: 'transparent',
    color: ink,
    border: dark ? '1px solid rgba(255,255,255,0.32)' : '1px solid rgba(10,10,10,0.22)',
  };
  if (style === 'glass') return {
    ...actionBase,
    background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.62)',
    color: ink,
    border: dark ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.80)',
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
  };
  return {
    ...actionBase,
    background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.86)',
    color: ink,
    border: dark ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(10,10,10,0.09)',
  };
}
