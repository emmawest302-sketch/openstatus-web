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

type Props = { block: OpenStatusBlock; businessId: string; themeColor: string };

export default function PublicLocationBlock({ block, businessId, themeColor }: Props) {
  const query = block.googleUrl
    ? extractMapQuery(block.googleUrl, block.sub || block.title)
    : block.sub || block.address || block.title;

  const mapsHref = block.appleMapsUrl || block.googleUrl
    ? (block.appleMapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(query)}`)
    : `https://maps.google.com/?q=${encodeURIComponent(query)}`;

  const embedSrc = (block.lat && block.lng)
    ? `https://maps.google.com/maps?q=${block.lat},${block.lng}&output=embed&hl=en&z=16`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=en`;

  return (
    <div style={{
      overflow: 'hidden', borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      background: '#FFFFFF',
    }}>
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
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '14px 16px',
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
            {block.address || block.sub || query}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>Tap for directions</p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
          style={{
            flexShrink: 0, borderRadius: 99,
            background: themeColor, color: '#FFFFFF',
            padding: '9px 18px', fontSize: 12, fontWeight: 700,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'transform 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
          </svg>
          Directions
        </a>
      </div>
    </div>
  );
}
