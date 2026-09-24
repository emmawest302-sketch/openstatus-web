'use client';

import { useState } from 'react';

/**
 * Live hours. The reason the page exists, so it is allowed to outweigh
 * everything under it.
 *
 * A customer arrives with one question — can I go there now — and this is the
 * only thing on the page that answers it. So it gets the green label, the
 * biggest type, and the closing time spelled out rather than implied by a
 * table they have to read.
 *
 * What is deliberately NOT here: any claim made from missing data. A shop with
 * no hours set says "Hours not set", never "Closed". Telling a customer a shop
 * is shut when it is open and full of people is the worst thing this page can
 * do.
 */

export type DayRow = { label: string; hours: string; isToday: boolean; closed: boolean };

type Props = {
  state: 'open' | 'closed' | 'closing-early' | 'unknown';
  headline: string;
  detail: string;
  /** e.g. "5:00 PM" — shown in the accent colour. */
  accent?: string | null;
  /** Owner's note for today, when there is one. */
  note?: { headline: string; detail?: string | null } | null;
  today?: DayRow | null;
  tomorrow?: DayRow | null;
  week: DayRow[];
  dark?: boolean;
};

export default function PublicHoursRow({
  state, headline, detail, accent, note, today, tomorrow, week, dark = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const live = state === 'open';
  const green = '#16A34A';
  const ink = dark ? '#FFFFFF' : '#0A0A0A';
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(21,21,21,0.48)';
  const hairline = dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.07)';

  return (
    <div style={{
      borderRadius: 'var(--os-radius, 18px)',
      overflow: 'hidden',
      // The card used to be filled green when the shop was open. At this size
      // that is a slab of colour the width of the screen, and it made the
      // collapsed card look like an opened panel. The green now lives on the
      // border, the icon and the Live pill — enough to mean something, not
      // enough to become the page's background.
      background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.86)',
      border: live
        ? `1px solid ${dark ? 'rgba(34,197,94,0.34)' : 'rgba(22,163,74,0.26)'}`
        : `1px solid ${hairline}`,
      boxShadow: dark ? '0 6px 20px rgba(0,0,0,0.20)' : '0 4px 16px rgba(10,10,10,0.04)',
      backdropFilter: 'blur(20px) saturate(130%)',
      WebkitBackdropFilter: 'blur(20px) saturate(130%)',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer', boxSizing: 'border-box' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3.2cqw, 12px)', padding: 'clamp(11px, 3.6cqw, 14px) var(--os-card-pad, 15px)', minHeight: 'var(--os-row-min, 78px)', boxSizing: 'border-box' }}>
          <span style={{
            width: 'var(--os-icon, 38px)', height: 'var(--os-icon, 38px)', borderRadius: '50%', flexShrink: 0,
            display: 'grid', placeItems: 'center',
            background: live
              ? (dark ? 'rgba(34,197,94,0.18)' : 'rgba(22,163,74,0.10)')
              : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.04)'),
            color: live ? green : muted,
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </span>

          <span style={{ flex: 1, minWidth: 0 }}>
            {live && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 750, letterSpacing: '0.09em',
                color: green, textTransform: 'uppercase',
                background: dark ? 'rgba(34,197,94,0.16)' : 'rgba(22,163,74,0.10)',
                padding: '2px 7px', borderRadius: 999, marginBottom: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: green }}/>
                Live hours
              </span>
            )}
            <span style={{
              display: 'block', fontSize: 'var(--os-hours-headline, 19px)', fontWeight: 800, letterSpacing: '-0.03em',
              color: ink, lineHeight: 1.1,
            }}>
              {headline}
            </span>
            <span style={{ display: 'block', fontSize: 'var(--os-hours-detail, 13.5px)', color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(21,21,21,0.62)', marginTop: 2, lineHeight: 1.3 }}>
              {detail}
              {accent && <strong style={{ color: live ? green : ink, fontWeight: 750 }}>{accent}</strong>}
            </span>
          </span>

          <span style={{ flexShrink: 0, color: muted }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>

        {note && (
          <div style={{
            margin: '0 var(--os-card-pad, 15px) 12px', padding: '8px 11px', borderRadius: 11,
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.035)',
            fontSize: 12, lineHeight: 1.35, color: dark ? 'rgba(255,255,255,0.88)' : 'rgba(21,21,21,0.78)',
          }}>
            <strong style={{ fontWeight: 650 }}>{note.headline}</strong>
            {note.detail && <span style={{ display: 'block', color: muted, marginTop: 2 }}>{note.detail}</span>}
          </div>
        )}
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${hairline}`, padding: '4px var(--os-card-pad, 15px) 12px' }}>
          {/* Today and tomorrow first: that is what someone is deciding with.
              The full week is underneath for the rare person who needs it. */}
          {today && <Line row={today} ink={ink} muted={muted} green={green} live={live} emphasis/>}
          {tomorrow && <Line row={tomorrow} ink={ink} muted={muted} green={green} live={false}/>}

          {week.length > 0 && (
            <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px solid ${hairline}` }}>
              {week.map((row) => <Line key={row.label} row={row} ink={ink} muted={muted} green={green} live={false}/>)}
            </div>
          )}

          {/* Used to sit in the collapsed header, where it was a third line of
              small grey text nobody reads before deciding whether to walk in. */}
          <p style={{ fontSize: 11, color: muted, margin: '10px 0 0', textAlign: 'center' }}>
            Updated in real time
          </p>
        </div>
      )}
    </div>
  );
}

function Line({ row, ink, muted, green, live, emphasis = false }: {
  row: DayRow; ink: string; muted: string; green: string; live: boolean; emphasis?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 12, padding: emphasis ? '9px 0' : '6px 0',
    }}>
      <span style={{
        fontSize: emphasis ? 13.5 : 12.5,
        fontWeight: row.isToday ? 700 : 500,
        color: row.isToday ? ink : muted,
      }}>
        {row.label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: emphasis ? 13.5 : 12.5,
          fontWeight: row.isToday ? 650 : 400,
          color: row.closed ? muted : (row.isToday ? ink : muted),
        }}>
          {row.hours}
        </span>
        {emphasis && live && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: green,
            background: 'rgba(22,163,74,0.10)', padding: '2px 7px', borderRadius: 999,
          }}>
            Open now
          </span>
        )}
      </span>
    </div>
  );
}
