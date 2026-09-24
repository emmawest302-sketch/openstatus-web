'use client';

import { useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';
import { liftColor } from '@/lib/page-theme';

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  dark?: boolean;
  /** Icon tint, matching the rows in public-row.tsx. */
  accent?: string;
};

function safeUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) return raw;
  return `https://${raw}`;
}

const ICONS: Record<string, string> = {
  // Core
  order:       'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
  menu:        'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  book:        'M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18',
  website:     'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.5 3.5 3.5 7 3.5 10S14.5 18.5 12 22m0-20C9.5 5.5 8.5 9 8.5 12s1 6.5 3.5 10M2.5 12h19',
  gallery:     'M3 3h18v18H3V3z M3 9h18 M9 21V9',
  reviews:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  call:        'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8 9c1.72 3.11 4.47 5.68 7.5 7l.91-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  email:       'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  location:    'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  share:       'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8.59 13.51l6.83 3.98 M15.41 6.51l-6.82 3.98',
  // Shopping & store
  shop:        'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  arrivals:    'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
  bestsellers: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2z',
  promo:       'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01',
  track:       'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  // Team & services
  services:    'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  team:        'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  // Food & specials
  special:     'M12 3c-4.97 0-9 3.185-9 7.115 0 2.557 1.522 4.82 3.889 6.204L6 19l3.692-1.231C10.462 18.077 11.231 18.308 12 18.308c4.97 0 9-3.186 9-7.115C21 6.185 16.97 3 12 3z M9 11h.01 M12 11h.01 M15 11h.01',
  stops:       'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  // Fitness
  classes:     'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  membership:  'M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 11H8 M12 11v4',
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

export default function PublicActionBlock({ block, businessId, dark = false, accent }: Props) {
  // Card fill was a fixed 72% white, which turns into a glaring slab on a dark
  // page. Derive it so the card is always visible against whatever is behind it.
  const CARD = dark ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.72)';
  const CARD_BORDER = dark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.82)';
  const TEXT = dark ? '#FFFFFF' : '#151515';
  const TEXT_MUTED = dark ? 'rgba(255,255,255,0.64)' : '#8A8A86';
  // A Reviews row keeps its destination in googleUrl, a listing might only
  // have Yelp. Reading block.url alone made those rows tappable-looking and
  // inert.
  const href = safeUrl(block.url || block.googleUrl || block.yelpUrl || block.tripAdvisorUrl || block.appleMapsUrl);
  const [hovered, setHovered] = useState(false);

  // Blocks used to be able to carry their own cover photo, which rendered the
  // row as a 16:10 or 1:1 photo tile. Three of those in a row is most of a
  // phone screen, and it made every page a different height and shape. The
  // page has one row now; the photo lives on the cover or in the gallery.

  // ── Standard card (no photo) ─────────────────────────────────────
  // These were hardcoded black on a light grey, which on a dark page put a
  // black glyph inside a nearly-black circle. The accent keeps this row's
  // icon the same colour as the Photos, Menu and Reviews rows beside it.
  const iconColor = liftColor(accent, dark) ?? (dark ? '#FFFFFF' : '#111111');
  const iconBg = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';
  const chevron = dark ? 'rgba(255,255,255,0.42)' : 'rgba(10,10,10,0.28)';

  const card = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3.4cqw, 12px)',
        // Every row is the same height, so a list of them reads as a list
        // rather than a pile of differently-sized cards.
        minHeight: 'var(--os-row-min, 78px)', boxSizing: 'border-box',
        background: CARD,
        border: `1px solid ${CARD_BORDER}`,
        backdropFilter: 'blur(24px) saturate(130%)',
        WebkitBackdropFilter: 'blur(24px) saturate(130%)',
        borderRadius: 'var(--os-radius, 16px)', padding: 'clamp(11px, 3.6cqw, 13px) var(--os-card-pad, 15px)',
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
        width: 'var(--os-icon, 40px)', height: 'var(--os-icon, 40px)', borderRadius: '50%', flexShrink: 0,
        background: iconBg, display: 'grid', placeItems: 'center',
      }}>
        <BlockIcon id={block.id} color={iconColor}/>
      </div>

      {/* Text */}
      {/* `break-word` was letting a narrow block split a word across lines, so
          "Reviews" rendered as "Revi / ews". A title that doesn't fit should be
          cut with an ellipsis, never broken mid-word. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--os-row-title, 14.5px)', color: TEXT, lineHeight: 1.3,
          fontWeight: block.titleBold ? 800 : 600,
          fontStyle: block.titleItalic ? 'italic' : 'normal',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {block.title}
        </div>
        {block.sub && (
          <div style={{
            fontSize: 'var(--os-row-sub, 12px)', color: TEXT_MUTED, marginTop: 2, lineHeight: 1.35,
            fontWeight: block.subBold ? 700 : 400,
            fontStyle: block.subItalic ? 'italic' : 'normal',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden', overflowWrap: 'anywhere' as const,
          }}>
            {block.sub}
          </div>
        )}
      </div>

      {/* One glyph, one meaning. A right chevron said "opens here" on a row
          that always navigates away; every row that leaves the page now shows
          the same outbound arrow the Menu and Photos rows use. */}
      {href && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={chevron} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: hovered ? 'translate(1.5px,-1.5px)' : 'none',
            transition: 'transform 0.15s ease',
          }}>
          <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
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
