import PublicRatingRow from '@/components/public-rating-row';
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
};

export default function PublicBioCard({
  businessName, businessId, address, tags, placeId,
  websiteUrl, directionsUrl, shareUrl, dark, accent, nameColor, pageFont,
  logo, initials,
}: Props) {
  const glass: React.CSSProperties = {
    background: dark ? 'rgba(22,22,24,0.62)' : 'rgba(255,255,255,0.74)',
    backdropFilter: 'blur(28px) saturate(140%)',
    WebkitBackdropFilter: 'blur(28px) saturate(140%)',
    border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.75)',
    boxShadow: dark ? '0 18px 50px rgba(0,0,0,0.38)' : '0 18px 50px rgba(0,0,0,0.10)',
    borderRadius: 26,
  };

  const muted = dark ? 'rgba(255,255,255,0.68)' : 'rgba(21,21,21,0.58)';

  return (
    <div style={{ ...glass, padding: '0 20px 20px', marginTop: -46, position: 'relative', zIndex: 2 }}>
      {/* Logo straddles the top edge, tying the card to the cover above it. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -38 }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={`${businessName} logo`} style={logoStyle(dark)}/>
        ) : (
          <div style={{ ...logoStyle(dark), display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800, color: accent }}>
            {initials}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', paddingTop: 12 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
          color: nameColor, lineHeight: 1.12, margin: 0, fontFamily: pageFont,
        }}>
          {businessName}
        </h1>

        {address && (
          <p style={{ fontSize: 12.5, color: muted, margin: '7px 0 0', lineHeight: 1.45 }}>
            {address}
          </p>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 11 }}>
            {tags.filter(Boolean).slice(0, 6).map((tag) => (
              <span key={tag} style={{
                fontSize: 11.5, fontWeight: 500, padding: '5px 11px', borderRadius: 999,
                color: dark ? 'rgba(255,255,255,0.80)' : 'rgba(21,21,21,0.68)',
                background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.05)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <PublicRatingRow businessId={businessId} placeId={placeId} dark={dark}/>

        {/* Website is the strongest of the three, because it is the one a
            customer is most often after. Directions and Share sit level. */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 8, marginTop: 16,
        }}>
          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noreferrer" style={primaryAction(dark)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Website
              <span style={{ opacity: 0.55, marginLeft: 1 }}>↗</span>
            </a>
          )}

          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noreferrer" style={secondaryAction(dark)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
          />
        </div>
      </div>
    </div>
  );
}

function logoStyle(dark: boolean): React.CSSProperties {
  return {
    width: 76, height: 76, borderRadius: '50%',
    objectFit: 'cover',
    border: dark ? '3px solid rgba(255,255,255,0.22)' : '3px solid rgba(255,255,255,0.92)',
    background: dark ? 'rgba(40,40,44,0.9)' : 'rgba(255,255,255,0.92)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
    display: 'block',
  };
}

const actionBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '10px 17px', borderRadius: 999,
  fontSize: 13.5, fontWeight: 650, letterSpacing: '-0.01em',
  textDecoration: 'none', whiteSpace: 'nowrap',
};

function primaryAction(dark: boolean): React.CSSProperties {
  return {
    ...actionBase,
    background: dark ? '#FFFFFF' : '#0A0A0A',
    color: dark ? '#0A0A0A' : '#FFFFFF',
    boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
  };
}

function secondaryAction(dark: boolean): React.CSSProperties {
  return {
    ...actionBase,
    background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.86)',
    color: dark ? '#FFFFFF' : '#151515',
    border: dark ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(10,10,10,0.09)',
  };
}
