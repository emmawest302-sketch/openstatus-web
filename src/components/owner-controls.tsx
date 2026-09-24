'use client';

import { useCallback, useState } from 'react';

/**
 * Four buttons, and nothing else.
 *
 * This is used one-handed, behind a counter, often in a hurry. So: large
 * targets, plain words, the current state stated at the top so the owner can
 * see whether they already did it, and every action says what the customer
 * will see rather than what the database will do.
 *
 * It talks to the same endpoints the builder uses. Those accept the owner
 * cookie as well as a Supabase session, so nothing here is a second
 * implementation of the status logic.
 */

type Props = {
  businessName: string;
  slug: string | null;
  state: 'open' | 'closed' | 'unknown';
  closesAt: string | null;
  opensAt: string | null;
  hasOverride: boolean;
  /** From a home-screen shortcut: open straight into that time picker. */
  initialPick?: 'close' | 'open' | null;
};

const TIMES = ['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const OPENINGS = ['09:00','10:00','11:00','12:00','13:00','14:00'];

function pretty(hhmm: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function OwnerControls({
  businessName, slug, state, closesAt, opensAt, hasOverride, initialPick = null,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Long-pressing the home screen icon and choosing "Close early" should land
  // on the times, not on the menu that leads to the times.
  const [picking, setPicking] = useState<'close' | 'open' | null>(initialPick);

  const send = useCallback(async (
    label: string,
    body: Record<string, unknown>,
    google?: Record<string, unknown>,
  ) => {
    setBusy(label); setError(null); setMessage(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error ?? 'Could not update');

      // Google is a separate call and a slower one. A failure there must not
      // read as "nothing happened" — the page is already right.
      let googleNote = '';
      if (google) {
        try {
          const g = await fetch('/api/google/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(google),
          });
          // 400 means Google simply is not connected, which is not an error
          // worth putting in front of someone closing their shop.
          if (!g.ok && g.status !== 400) googleNote = ' Google is still catching up.';
        } catch { googleNote = ' Google is still catching up.'; }
      }

      setMessage(label + '.' + googleNote);
      setPicking(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  }, []);

  const today = () => {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()).split('-').map(Number);
    return { year: y, month: m, day: d };
  };
  const hm = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return { hours: h, minutes: m };
  };

  const closedToday = () => {
    const d = today();
    return send('Closed for today', { action: 'publish', preset: 'closed_today' },
      { action: 'special_hours', today: d, periods: [{ startDate: d, endDate: d, closed: true }] });
  };
  const closeEarly = (t: string) => {
    const d = today();
    return send(`Closing at ${pretty(t)}`, { action: 'publish', preset: 'early_close', closesAt: t },
      { action: 'special_hours', today: d, periods: [{ startDate: d, endDate: d, openTime: hm(opensAt ?? '09:00'), closeTime: hm(t) }] });
  };
  const openLate = (t: string) => {
    const d = today();
    const close = closesAt ?? '17:00';
    return send(`Opening at ${pretty(t)}`, { action: 'publish', preset: 'custom_hours', opensAt: t, closesAt: close },
      { action: 'special_hours', today: d, periods: [{ startDate: d, endDate: d, openTime: hm(t), closeTime: hm(close) }] });
  };
  const backToNormal = () => {
    const d = today();
    return send('Back to your regular hours', { action: 'clear' },
      { action: 'special_hours', today: d, periods: [], clearDates: [d] });
  };

  const headline =
    state === 'open' ? 'Open now'
    : state === 'closed' ? 'Closed'
    : 'Hours not set';
  const sub =
    state === 'open' && closesAt ? `Closes at ${pretty(closesAt)}`
    : state === 'closed' && opensAt ? `Opens at ${pretty(opensAt)}`
    : 'This is what customers see right now';

  return (
    <div style={wrap}>
      <div style={header}>
        <p style={nameStyle}>{businessName}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            background: state === 'open' ? '#22C55E' : state === 'closed' ? '#E0921B' : '#9A9A97',
          }}/>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A0A0A' }}>
            {headline}
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: '#777777', margin: '4px 0 0' }}>{sub}</p>
        {hasOverride && (
          <p style={{ fontSize: 12.5, color: '#B45309', margin: '10px 0 0', fontWeight: 600 }}>
            You changed today&apos;s hours. They go back to normal on their own tomorrow.
          </p>
        )}
      </div>

      {message && <p style={{ ...note, background: '#F0FDF4', color: '#15803D' }}>✓ {message}</p>}
      {error && <p style={{ ...note, background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>}

      {picking === null && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button style={primary} disabled={!!busy} onClick={closedToday}>Closed today</button>
          <button style={secondary} disabled={!!busy} onClick={() => setPicking('close')}>Closing early…</button>
          <button style={secondary} disabled={!!busy} onClick={() => setPicking('open')}>Opening late…</button>
          {hasOverride && (
            <button style={quiet} disabled={!!busy} onClick={backToNormal}>Back to normal hours</button>
          )}
        </div>
      )}

      {picking && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 10px' }}>
            {picking === 'close' ? 'Closing at' : 'Opening at'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(picking === 'close' ? TIMES : OPENINGS).map(t => (
              <button key={t} style={timeBtn} disabled={!!busy}
                onClick={() => (picking === 'close' ? closeEarly(t) : openLate(t))}>
                {pretty(t)}
              </button>
            ))}
          </div>
          <button style={{ ...quiet, marginTop: 12 }} onClick={() => setPicking(null)}>Cancel</button>
        </div>
      )}

      {slug && (
        <a href={`/${slug}`} target="_blank" rel="noreferrer" style={link}>
          See your page ↗
        </a>
      )}
    </div>
  );
}

const wrap: React.CSSProperties = {
  width: '100%', maxWidth: 420, display: 'grid', gap: 18,
};
const header: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #E9E9E7', borderRadius: 20, padding: '20px 20px 22px',
};
const nameStyle: React.CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: '#9A9A97', margin: 0,
  textTransform: 'uppercase', letterSpacing: '0.1em',
};
const note: React.CSSProperties = {
  fontSize: 13.5, fontWeight: 600, borderRadius: 14, padding: '11px 14px', margin: 0,
};
const base: React.CSSProperties = {
  width: '100%', padding: '17px 18px', borderRadius: 16, fontSize: 16, fontWeight: 650,
  cursor: 'pointer', border: '1px solid transparent', textAlign: 'center',
};
const primary: React.CSSProperties = { ...base, background: '#0A0A0A', color: '#FFFFFF' };
const secondary: React.CSSProperties = { ...base, background: '#FFFFFF', color: '#0A0A0A', borderColor: '#E9E9E7' };
const quiet: React.CSSProperties = { ...base, background: 'transparent', color: '#777777', fontSize: 14, padding: '12px' };
const timeBtn: React.CSSProperties = {
  padding: '15px 6px', borderRadius: 14, border: '1px solid #E9E9E7', background: '#FFFFFF',
  fontSize: 14.5, fontWeight: 600, color: '#0A0A0A', cursor: 'pointer',
};
const link: React.CSSProperties = {
  textAlign: 'center', fontSize: 13, color: '#777777', textDecoration: 'none', fontWeight: 500,
};
