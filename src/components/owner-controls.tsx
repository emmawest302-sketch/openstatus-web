'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  /** Whether a Google Business Profile is linked. Drives the card below the
   *  buttons: without it, "Closed today" changes this page and nothing else,
   *  and the owner deserves to know that BEFORE they tap, not after. */
  googleConnected?: boolean;
  /** IANA zone for the business. Never the phone's. */
  timeZone: string;
  /** Today's regular schedule, so "We're open" knows whether there is
      anything to undo or a day to open that is normally shut. */
  todayClosed?: boolean;
  todayClosesAt?: string | null;
  /** From a home-screen shortcut: open straight into that control. */
  initialPick?: Pick_;
};

type Pick_ = 'close' | 'open' | 'openUntil' | null;

const TIMES = ['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const OPENINGS = ['09:00','10:00','11:00','12:00','13:00','14:00'];

function pretty(hhmm: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Ask Google to match, and report honestly what happened.
 *
 * A 2xx is not success here: the route answers 202 when Google's API access is
 * still under review, with the reason in the body. Treating any 2xx as done is
 * how a closure silently never reached the listing.
 */
async function syncGoogle(payload: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await fetch('/api/google/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({})) as { error?: string; ok?: boolean };

    if (res.status === 400) {
      return { ok: false, text: out.error ?? 'Google Business Profile isn\u2019t connected, so Google wasn\u2019t changed.' };
    }
    if (!res.ok || out.error) {
      return { ok: false, text: out.error ?? `Google didn\u2019t accept the change (${res.status}).` };
    }
    return { ok: true, text: 'Google updated too.' };
  } catch {
    return { ok: false, text: 'Couldn\u2019t reach Google. Your page is already right.' };
  }
}

export default function OwnerControls({
  businessName, slug, state, closesAt, opensAt, hasOverride, timeZone,
  todayClosed = false, todayClosesAt = null, initialPick = null,
  googleConnected = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Long-pressing the home screen icon and choosing "Close early" should land
  // on the times, not on the menu that leads to the times.
  const [picking, setPicking] = useState<Pick_>(initialPick);
  /** What Google did, separately from what this page did. */
  const [google, setGoogle] = useState<{ ok: boolean; text: string } | null>(null);

  const send = useCallback(async (
    label: string,
    body: Record<string, unknown>,
    googleBody?: Record<string, unknown>,
  ) => {
    setBusy(label); setError(null); setMessage(null); setGoogle(null);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error ?? 'Could not update');

      setMessage(label + '.');

      // Google is a separate system and it fails in ways that are not errors:
      // not connected, API access still pending review, a write Google accepts
      // but does not apply. All of those used to land as either silence or one
      // vague line that a page reload wiped a second later — so an owner who
      // closed their shop here was told it worked and found Google unchanged.
      // Every outcome is now named, and nothing clears it but the next action.
      if (googleBody) {
        setGoogle(await syncGoogle(googleBody));
      }

      setPicking(null);
      // refresh(), not reload(): the status above re-renders from the server
      // while the message about what Google did stays on screen.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  }, [router]);

  /**
   * Today where the shop is, not where the phone is.
   *
   * This read the device clock. An owner in Nashville checking their phone
   * from California would close "today" a day early on Google, and the
   * special-hours period would carry the wrong date — a dated exception on the
   * wrong date does not expire into anything useful, it just closes the wrong
   * day. The business timezone is the only clock that means anything here.
   */
  const today = () => {
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
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
  // Their usual closing time first, since that is the answer most days.
  const closeTimes = todayClosesAt && !TIMES.includes(todayClosesAt)
    ? [todayClosesAt, ...TIMES].slice(0, 9)
    : TIMES;

  /** Now at the shop, to the nearest five minutes, for "we're open". */
  const nowHHMM = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone,
    }).formatToParts(new Date());
    const hh = parts.find(p => p.type === 'hour')?.value ?? '09';
    const mm = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
    // 24 rather than 00 comes back from some locales at midnight.
    return `${hh === '24' ? '00' : hh}:${String(Math.floor(mm / 5) * 5).padStart(2, '0')}`;
  };

  const openUntil = (t: string) => {
    const d = today();
    const from = nowHHMM();
    return send(`Open until ${pretty(t)}`,
      { action: 'publish', preset: 'custom_hours', opensAt: from, closesAt: t },
      { action: 'special_hours', today: d, periods: [{ startDate: d, endDate: d, openTime: hm(from), closeTime: hm(t) }] });
  };

  /**
   * "We're open" is not one action, because the shop can be shut for two
   * different reasons and undoing the wrong one leaves it shut.
   *
   * If the owner closed it, this undoes that. If the schedule says closed —
   * a Sunday they decided to trade — there is nothing to undo, so it asks how
   * late they are staying and opens the day properly on both the page and
   * Google. Without this there was no way to open on a normally-closed day at
   * all, while the home screen shortcut already promised one.
   */
  const weAreOpen = () => {
    if (hasOverride) return backToNormal();
    if (!todayClosed) {
      setError(null); setGoogle(null);
      setMessage('Your hours already say you\u2019re open today.');
      return;
    }
    setPicking('openUntil');
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
      {google && (
        <p style={{
          ...note,
          background: google.ok ? '#F0FDF4' : '#FFFBEB',
          color: google.ok ? '#15803D' : '#92400E',
          fontWeight: 500,
        }}>
          {google.ok ? '✓ ' : ''}{google.text}
        </p>
      )}
      {error && <p style={{ ...note, background: '#FEF2F2', color: '#B91C1C' }}>{error}</p>}

      {picking === null && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button style={primary} disabled={!!busy} onClick={closedToday}>Closed today</button>
          <button style={open_} disabled={!!busy} onClick={weAreOpen}>
            {hasOverride ? 'We\u2019re open — back to normal' : 'We\u2019re open'}
          </button>
          <button style={secondary} disabled={!!busy} onClick={() => setPicking('close')}>Closing early…</button>
          <button style={secondary} disabled={!!busy} onClick={() => setPicking('open')}>Opening late…</button>
        </div>
      )}

      {picking && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 10px' }}>
            {picking === 'close' ? 'Closing at' : picking === 'openUntil' ? 'Open until' : 'Opening at'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(picking === 'open' ? OPENINGS : closeTimes).map(t => (
              <button key={t} style={timeBtn} disabled={!!busy}
                onClick={() => (
                  picking === 'close' ? closeEarly(t)
                  : picking === 'openUntil' ? openUntil(t)
                  : openLate(t)
                )}>
                {pretty(t)}
              </button>
            ))}
          </div>
          <button style={{ ...quiet, marginTop: 12 }} onClick={() => setPicking(null)}>Cancel</button>
        </div>
      )}

      {/*
        Google's state, stated up front.

        This used to surface only as an error line AFTER an action — tap
        "Closed today", wait, then find out Google was never connected and the
        closure went nowhere but this page. The whole promise of the product is
        that one tap reaches every surface, so whether that is true today is
        not a detail to discover on failure.

        Connecting needs the Google OAuth consent screen, which needs a real
        signed-in account — the owner-link cookie is deliberately not enough to
        grant an API scope with. So the button sends them to sign in rather
        than pretending it can be done from here.
      */}
      {!googleConnected && (
        <div style={gCard}>
          <p style={{ fontSize: 13.5, fontWeight: 650, color: '#0A0A0A', margin: 0 }}>
            Google isn&apos;t connected
          </p>
          <p style={{ fontSize: 12.5, color: '#92400E', margin: '5px 0 0', lineHeight: 1.5 }}>
            Closing today changes this page straight away. It won&apos;t change what Google
            shows until you connect your Business Profile.
          </p>
          <Link href="/connect/google" style={gBtn}>Connect Google Business</Link>
          <button type="button" onClick={() => router.refresh()} style={gQuiet}>
            Already connected? Check again
          </button>
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
const open_: React.CSSProperties = { ...base, background: '#12803D', color: '#FFFFFF' };
const quiet: React.CSSProperties = { ...base, background: 'transparent', color: '#777777', fontSize: 14, padding: '12px' };
const timeBtn: React.CSSProperties = {
  padding: '15px 6px', borderRadius: 14, border: '1px solid #E9E9E7', background: '#FFFFFF',
  fontSize: 14.5, fontWeight: 600, color: '#0A0A0A', cursor: 'pointer',
};
const gCard: React.CSSProperties = {
  background: '#FFFCF5', border: '1px solid #FEC84B', borderRadius: 18, padding: '16px 18px 18px',
};
const gBtn: React.CSSProperties = {
  display: 'block', marginTop: 13, padding: '13px 16px', borderRadius: 14,
  background: '#0A0A0A', color: '#FFFFFF', fontSize: 14, fontWeight: 650,
  textAlign: 'center', textDecoration: 'none',
};
const gQuiet: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, padding: '9px', border: 'none',
  background: 'transparent', color: '#92400E', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
};
const link: React.CSSProperties = {
  textAlign: 'center', fontSize: 13, color: '#777777', textDecoration: 'none', fontWeight: 500,
};
