'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type PublicActionBlockProps = { block: OpenStatusBlock; businessId: string; hasBgImage?: boolean };

function safeUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) return raw;
  return `https://${raw}`;
}

function detectProvider(url = ''): string | null {
  const v = url.toLowerCase();
  if (v.includes('doordash')) return 'DoorDash';
  if (v.includes('ubereats')) return 'Uber Eats';
  if (v.includes('grubhub')) return 'Grubhub';
  if (v.includes('squareup') || v.includes('square.site')) return 'Square';
  if (v.includes('toasttab')) return 'Toast';
  if (v.includes('calendly')) return 'Calendly';
  if (v.includes('opentable')) return 'OpenTable';
  if (v.includes('resy.com')) return 'Resy';
  return null;
}

function BlockIcon({ id }: { id: string }) {
  const base = id.split('-')[0];
  const paths: Record<string, string> = {
    order: 'M7 8h10l-1 11H8L7 8zm2-3h6l1 3H8l1-3z',
    menu: 'M6 7h12M6 12h12M6 17h12',
    book: 'M7 4v3M17 4v3M5 9h14M6 6h12a1 1 0 011 1v12H5V7a1 1 0 011-1z',
    website: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21m0-18C9.8 5.5 8.7 8.5 8.7 12s1.1 6.5 3.3 9M3.5 12h17',
    call: 'M7 4l3 4-2 2c1.5 3 3 4.5 6 6l2-2 4 3-2 3c-1 1-3 .5-5-.5C8 17 5 14 3.5 9 3 7 3 5.5 4 5l3-1z',
    email: 'M4 6h16v12H4V6zm0 1l8 6 8-6',
    hours: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    location: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
    share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 12a3 3 0 100-6 3 3 0 000 6zM18 20a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98',
    updates: 'M17 2H7a2 2 0 00-2 2v18l7-3 7 3V4a2 2 0 00-2-2z',
    socials: 'M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M16 11V7',
  };
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d={paths[base] ?? 'M5 12h14M14 7l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PublicActionBlock({ block, businessId, hasBgImage }: PublicActionBlockProps) {
  const href = safeUrl(block.url);
  const provider = detectProvider(block.url ?? '');
  const blockColor = block.color;

  // Mirror the builder's color logic exactly
  const cardBg = hasBgImage
    ? (blockColor ? `${blockColor}28` : 'rgba(255,255,255,0.14)')
    : (blockColor ? `${blockColor}18` : 'rgba(0,0,0,0.05)');
  const borderColor = hasBgImage
    ? (blockColor ? `${blockColor}55` : 'rgba(255,255,255,0.25)')
    : (blockColor ? `${blockColor}40` : 'rgba(0,0,0,0.09)');
  const textColor = hasBgImage ? 'rgba(255,255,255,0.95)' : '#0A0A0A';
  const subColor = hasBgImage ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

  const iconBg = blockColor ? `${blockColor}22` : (hasBgImage ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)');
  const iconColor = blockColor ?? (hasBgImage ? 'rgba(255,255,255,0.85)' : '#333');

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    borderColor,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 20,
    padding: '14px 16px',
    minHeight: 100,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 10,
    transition: 'transform 0.15s, opacity 0.15s',
    backdropFilter: hasBgImage ? 'blur(12px)' : undefined,
    WebkitBackdropFilter: hasBgImage ? 'blur(12px)' : undefined,
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    cursor: href ? 'pointer' : 'default',
    textDecoration: 'none',
    color: textColor,
  };

  const content = (
    <>
      {/* Top: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: subColor }}>
          {block.title}
        </span>
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center', flexShrink: 0, color: iconColor }}>
          <BlockIcon id={block.id} />
        </span>
      </div>
      {/* Bottom: title + sub + badge */}
      <div>
        <strong style={{ display: 'block', fontSize: 17, lineHeight: 1.2, letterSpacing: '-0.04em', color: textColor }}>
          {block.title}
        </strong>
        {block.sub && (
          <span style={{ display: 'block', fontSize: 10, marginTop: 3, color: subColor }}>
            {block.sub}
          </span>
        )}
        {provider && (
          <span style={{ display: 'inline-block', marginTop: 6, fontSize: 9, fontWeight: 700, background: blockColor ?? '#1A1A1A', color: 'white', borderRadius: 99, padding: '2px 8px' }}>
            {provider}
          </span>
        )}
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={cardStyle}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
      onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
    >
      {content}
    </a>
  ) : (
    <div style={cardStyle}>{content}</div>
  );
}
