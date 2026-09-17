'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

function extractMapQuery(googleUrl: string, fallback: string): string {
  try {
    const decoded = decodeURIComponent(googleUrl);
    const match = decoded.match(/\/maps\/place\/([^/@?]+)/);
    if (match) return match[1].replace(/\+/g, ' ');
  } catch { /* ignore */ }
  return fallback;
}

type Props = { block: OpenStatusBlock; businessId: string; hasBgImage?: boolean };

export default function PublicLocationBlock({ block, businessId, hasBgImage }: Props) {
  const query = block.googleUrl
    ? extractMapQuery(block.googleUrl, block.sub || block.title)
    : block.sub || block.title;

  const mapsHref = block.appleMapsUrl || (block.googleUrl ?? `https://maps.google.com/?q=${encodeURIComponent(query)}`);
  const embedSrc = (block.lat && block.lng)
    ? `https://maps.google.com/maps?q=${block.lat},${block.lng}&output=embed&hl=en&z=16`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=en`;

  const blockColor = block.color;
  const cardBg = hasBgImage
    ? (blockColor ? `${blockColor}28` : 'rgba(255,255,255,0.14)')
    : (blockColor ? `${blockColor}18` : 'rgba(255,255,255,0.9)');
  const borderColor = hasBgImage
    ? (blockColor ? `${blockColor}55` : 'rgba(255,255,255,0.25)')
    : (blockColor ? `${blockColor}40` : 'rgba(0,0,0,0.09)');
  const textColor = hasBgImage ? 'rgba(255,255,255,0.95)' : '#1A1A18';
  const subColor = hasBgImage ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';
  const btnBg = blockColor ?? (hasBgImage ? 'rgba(255,255,255,0.2)' : '#1A1A18');
  const btnText = hasBgImage && !blockColor ? 'rgba(255,255,255,0.9)' : 'white';

  return (
    <div style={{ overflow: 'hidden', borderRadius: 20, border: `1px solid ${borderColor}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backdropFilter: hasBgImage ? 'blur(12px)' : undefined }}>
      {/* Map iframe */}
      <div style={{ position: 'relative', height: 180, width: '100%', overflow: 'hidden' }}>
        <iframe
          src={embedSrc}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Business location map"
          aria-label={`Map showing ${query}`}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: cardBg }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.sub || query}
          </p>
          <p style={{ fontSize: 11, color: subColor, marginTop: 1 }}>Tap for directions</p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
          style={{ flexShrink: 0, borderRadius: 99, background: btnBg, padding: '8px 16px', fontSize: 11, fontWeight: 700, color: btnText, textDecoration: 'none', transition: 'transform 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          Get directions →
        </a>
      </div>
    </div>
  );
}
