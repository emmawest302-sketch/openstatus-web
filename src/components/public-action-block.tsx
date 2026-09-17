'use client';

import { useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type Props = { block: OpenStatusBlock; businessId: string };

function safeUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) return raw;
  return `https://${raw}`;
}

const ICONS: Record<string, string> = {
  order:   'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
  menu:    'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  book:    'M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18',
  website: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.5 3.5 3.5 7 3.5 10S14.5 18.5 12 22m0-20C9.5 5.5 8.5 9 8.5 12s1 6.5 3.5 10M2.5 12h19',
  gallery: 'M3 3h18v18H3V3z M3 9h18 M9 21V9',
  reviews: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  call:    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8 9c1.72 3.11 4.47 5.68 7.5 7l.91-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  email:   'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  location:'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  share:   'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98',
};

function BlockIcon({ id, color }: { id: string; color: string }) {
  const base = id.split('-')[0];
  const d = ICONS[base] ?? 'M5 12h14M14 7l5 5-5 5';
  const paths = d.split(' M ').map((p, i) => i === 0 ? p : 'M ' + p);
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      {paths.map((p, i) => (
        <path key={i} d={p} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      ))}
    </svg>
  );
}

export default function PublicActionBlock({ block, businessId }: Props) {
  const href = safeUrl(block.url);
  const [hovered, setHovered] = useState(false);

  // Icon: very subtle tint if block has a color, neutral otherwise
  const iconColor = '#111111';
  const iconBg = 'rgba(0,0,0,0.05)';

  const card = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px) saturate(130%)',
        WebkitBackdropFilter: 'blur(24px) saturate(130%)',
        border: '1px solid rgba(255,255,255,0.82)',
        borderRadius: 20, padding: '15px 18px',
        boxShadow: hovered
          ? '0 12px 36px rgba(0,0,0,0.10)'
          : '0 8px 30px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: href ? 'pointer' : 'default',
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: iconBg, display: 'grid', placeItems: 'center',
      }}>
        <BlockIcon id={block.id} color={iconColor}/>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#151515', lineHeight: 1.3 }}>
          {block.title}
        </div>
        {block.sub && (
          <div style={{ fontSize: 12, color: '#8A8A86', marginTop: 2, lineHeight: 1.3 }}>
            {block.sub}
          </div>
        )}
      </div>

      {/* Chevron */}
      {href && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="rgba(0,0,0,0.28)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: hovered ? 'translateX(2px)' : 'translateX(0)',
            transition: 'transform 0.15s ease',
          }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </div>
  );

  if (!href) return card;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{ display: 'block', textDecoration: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
    >
      {card}
    </a>
  );
}
