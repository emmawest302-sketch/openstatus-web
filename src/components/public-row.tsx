'use client';

import { useState } from 'react';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

/**
 * One row. Every feature on the page is one of these, at one width.
 *
 * The old page let an owner pick a size per block, which produced holes where
 * a half sat alone and mismatched heights where two halves disagreed. A
 * customer gains nothing from that choice, so it is gone: the page has a
 * shape, and the owner chooses the feel instead.
 *
 * The chevron carries one meaning. Down means the row opens here; an arrow
 * means the tap leaves the page. Both used to be a right-facing chevron, so
 * the glyph told a customer nothing about what would happen.
 */

type Props = {
  id: string;
  businessId: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  /** Small text on the right of the title, e.g. a provider or a state. */
  badge?: string | null;
  /** A strip of thumbnails or similar, shown collapsed. */
  preview?: React.ReactNode;
  /** Present when the row opens in place. */
  children?: React.ReactNode;
  /** Present when the row sends the customer somewhere. */
  href?: string | null;
  dark?: boolean;
  accent?: string;
  /** Hours is the one row allowed to look more important than the others. */
  emphasis?: boolean;
  defaultOpen?: boolean;
};

export default function PublicRow({
  id, businessId, icon, title, subtitle, badge, preview, children, href,
  dark = false, accent = '#0A0A0A', emphasis = false, defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = !!children;

  const surface: React.CSSProperties = {
    background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px) saturate(130%)',
    WebkitBackdropFilter: 'blur(20px) saturate(130%)',
    border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(10,10,10,0.05)',
    boxShadow: dark ? '0 6px 20px rgba(0,0,0,0.22)' : '0 6px 20px rgba(10,10,10,0.05)',
    borderRadius: 20,
    overflow: 'hidden',
  };

  const ink = dark ? '#FFFFFF' : '#0A0A0A';
  const muted = dark ? 'rgba(255,255,255,0.60)' : 'rgba(21,21,21,0.52)';

  const head = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: emphasis ? '16px 16px' : '14px 16px' }}>
      <span style={{
        width: emphasis ? 42 : 38, height: emphasis ? 42 : 38, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(10,10,10,0.04)',
        color: accent,
      }}>
        {icon}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: emphasis ? 17 : 15, fontWeight: 700, color: ink,
            letterSpacing: '-0.02em', lineHeight: 1.25,
          }}>
            {title}
          </span>
          {badge && (
            <span style={{
              fontSize: 10.5, fontWeight: 650, padding: '3px 8px', borderRadius: 999,
              background: dark ? 'rgba(255,255,255,0.12)' : 'rgba(10,10,10,0.05)',
              color: muted, whiteSpace: 'nowrap',
            }}>
              {badge}
            </span>
          )}
        </span>
        {subtitle && (
          <span style={{ display: 'block', fontSize: 12.5, color: muted, marginTop: 2, lineHeight: 1.35 }}>
            {subtitle}
          </span>
        )}
      </span>

      {preview && <span style={{ flexShrink: 0, display: 'flex', gap: 4 }}>{preview}</span>}

      <span style={{ flexShrink: 0, color: dark ? 'rgba(255,255,255,0.42)' : 'rgba(10,10,10,0.28)', display: 'grid', placeItems: 'center' }}>
        {expandable ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
          </svg>
        )}
      </span>
    </div>
  );

  if (!expandable) {
    return (
      <a
        href={href ?? '#'}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackOpenStatusEvent(businessId, 'block_click', id)}
        style={{ ...surface, display: 'block', textDecoration: 'none' }}
      >
        {head}
      </a>
    );
  }

  return (
    <div style={surface}>
      <button
        type="button"
        onClick={() => {
          if (!open) trackOpenStatusEvent(businessId, 'block_click', id);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        style={{
          all: 'unset', display: 'block', width: '100%',
          cursor: 'pointer', boxSizing: 'border-box',
        }}
      >
        {head}
      </button>
      {open && (
        <div style={{
          borderTop: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(10,10,10,0.06)',
          padding: '14px 16px 16px',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
