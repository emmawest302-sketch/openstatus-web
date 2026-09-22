'use client';

import { useState } from 'react';
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

type Props = { block: OpenStatusBlock; businessId: string; themeColor?: string };

export default function PublicLocationBlock({ block, businessId, themeColor }: Props) {
  const [hovered, setHovered] = useState(false);

  // `sub` is the block's caption ("Get directions"/"Tap for directions"), not an
  // address. Preferring it made the embed query that literal string, which
  // renders a zoom-1 map of the whole world with no marker.
  const CAPTION = /^(get|tap for)\s+directions$/i;
  const realAddress = [block.address, block.sub].find(v => !!v && !CAPTION.test(v.trim())) ?? '';

  const query = block.googleUrl
    ? extractMapQuery(block.googleUrl, realAddress || block.title)
    : realAddress;

  // No address and no map link means there is nothing to show. Rendering a
  // world map with a "Directions" CTA is worse than rendering nothing.
  if (!query && !block.googleUrl && !block.appleMapsUrl && !(block.lat && block.lng)) return null;

  const mapsHref = block.appleMapsUrl || block.googleUrl
    ? (block.appleMapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(query)}`)
    : `https://maps.google.com/?q=${encodeURIComponent(query)}`;

  const embedSrc = (block.lat && block.lng)
    ? `https://maps.google.com/maps?q=${block.lat},${block.lng}&output=embed&hl=en&z=16`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=en&z=15`;

  return (
    <div style={{
      overflow: 'hidden', borderRadius: 22,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(24px) saturate(130%)',
      WebkitBackdropFilter: 'blur(24px) saturate(130%)',
      border: '1px solid rgba(255,255,255,0.82)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
    }}>
      {/* Map */}
      <div style={{ position: 'relative', height: 190, width: '100%', overflow: 'hidden' }}>
        <iframe
          src={embedSrc}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Business location map"
          aria-label={`Map showing ${query}`}
        />
      </div>

      {/* Address footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '14px 18px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#111111" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
            </svg>
            <p style={{
              fontSize: 14, fontWeight: 600, color: '#151515',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {realAddress || query}
            </p>
          </div>
          <p style={{ fontSize: 12, color: '#8A8A86', paddingLeft: 19 }}>Tap for directions</p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
          style={{
            flexShrink: 0, borderRadius: 999,
            background: '#0A0A0A', color: '#FFFFFF',
            padding: '9px 18px', fontSize: 13, fontWeight: 700,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
            transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            opacity: hovered ? 0.9 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          Directions
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{
              transform: hovered ? 'translateX(2px)' : 'translateX(0)',
              transition: 'transform 0.15s ease',
            }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
