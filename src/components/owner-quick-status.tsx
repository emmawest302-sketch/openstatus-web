'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Variant = 'floating' | 'dashboard';
type Mode = 'closed' | 'early';

type OwnerQuickStatusProps = {
  businessId: string;
  businessName: string;
  variant?: Variant;
};

/** 24h "17:00" -> "5:00 PM", so the button names the exact thing customers will read. */
function fmtTime(value: string) {
  const [h, m] = value.split(':');
  let hour = Number(h);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${m} ${meridiem}`;
}

function nextHour() {
  const next = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(next.getHours()).padStart(2, '0')}:00`;
}

export default function OwnerQuickStatus({
  businessId,
  businessName,
  variant = 'floating',
}: OwnerQuickStatusProps) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(variant === 'dashboard');
  const [expanded, setExpanded] = useState(variant === 'dashboard');
  const [mode, setMode] = useState<Mode>('closed');
  const [closeTime, setCloseTime] = useState(nextHour);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorBar, setErrorBar] = useState(''); // visible in collapsed bar
  const [hasOwnerUpdate, setHasOwnerUpdate] = useState(false);
  // The exact headline customers are reading, so the bar quotes the page rather
  // than guessing — an active update can be a closure, an early close, or a note.
  const [ownerHeadline, setOwnerHeadline] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Extracted so it can be called both on mount and after clear
  const checkOwner = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token || !mountedRef.current) return;

    const response = await fetch(`/api/status?businessId=${encodeURIComponent(businessId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    if (!mountedRef.current || !response.ok || !body?.isOwner) return;

    setIsOwner(true);
    // Only 'active' owner updates count as something to undo.
    const active = (body.updates as
      | { source?: string; status?: string; headline?: string }[]
      | undefined
    )?.find((u) => u.source === 'owner' && u.status === 'active');
    setHasOwnerUpdate(Boolean(active));
    setOwnerHeadline(active?.headline ?? '');
  }, [businessId]);

  useEffect(() => {
    void checkOwner();
  }, [checkOwner]);

  const request = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
    setErrorBar('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sign in again to update your status.');

      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? 'Could not update your status.');

      const cleared = payload.action === 'clear';

      if (cleared) {
        // Re-sync from server to confirm the clear actually worked
        setHasOwnerUpdate(false);
        setOwnerHeadline('');
        await checkOwner();
      } else {
        setHasOwnerUpdate(true);
      }

      setMessage(cleared ? 'Back to regular hours.' : 'Live page updated.');
      setReason('');
      router.refresh();
      if (variant === 'floating') window.setTimeout(() => setExpanded(false), 900);
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : 'Could not update your status.';
      setMessage(msg);
      setErrorBar(msg); // show in collapsed bar too
    } finally {
      setSaving(false);
    }
  };

  const publish = () => {
    void request({
      action: 'publish',
      preset: mode === 'closed' ? 'closed_today' : 'early_close',
      closesAt: mode === 'early' ? closeTime : null,
      reason: reason.trim() || null,
    });
  };

  if (!isOwner) return null;

  // ── Expanded update panel ─────────────────────────────────────────────────
  const panel = (
    <div style={{
      margin: variant === 'floating' ? '0 12px 12px' : undefined,
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(0,0,0,0.10)',
      borderRadius: variant === 'floating' ? 22 : 18,
      boxShadow: variant === 'floating' ? '0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)' : '0 4px 20px rgba(0,0,0,0.08)',
      padding: '20px 20px 16px',
      fontFamily: "var(--font-poppins), system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A8A', margin: 0 }}>Only you can see this</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: '3px 0 0', letterSpacing: '-0.02em' }}>Change what today says</p>
          <p style={{ fontSize: 11.5, color: '#8A8A8A', margin: '5px 0 0', lineHeight: 1.45 }}>
            Affects today only. Your regular hours come back tomorrow on their own.
            This does not change your Google listing.
          </p>
        </div>
        {variant === 'floating' ? (
          <button type="button" onClick={() => setExpanded(false)} aria-label="Close" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.10)', background: '#F5F5F3', fontSize: 16, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>×</button>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {([
          ['closed', 'Closed today', 'Shut for the rest of the day'],
          ['early', 'Closing early', 'Open now, shutting sooner'],
        ] as const).map(([value, label, hint]) => (
          <button key={value} type="button" onClick={() => { setMode(value); setMessage(''); }} aria-pressed={mode === value}
            style={{ minHeight: 56, padding: '8px 10px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: mode === value ? '#7C3AED' : '#F5F5F3', color: mode === value ? '#fff' : '#0A0A0A', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center', lineHeight: 1.25 }}>
            <span style={{ display: 'block' }}>{label}</span>
            <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, marginTop: 2, color: mode === value ? 'rgba(255,255,255,0.82)' : '#8A8A8A' }}>{hint}</span>
          </button>
        ))}
      </div>

      {mode === 'early' ? (
        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Your page will say you close at</span>
          <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: '#F9F9F7', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }} />
        </label>
      ) : null}

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Reason customers will see <span style={{ fontWeight: 400, color: '#ADADAD' }}>(optional)</span></span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Holiday, weather, or private event…" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: '#F9F9F7', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }} />
      </label>

      {message ? <p style={{ fontSize: 13, color: '#166534', background: '#DCFCE7', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }} role="status">{message}</p> : null}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={publish} disabled={saving} style={{ flex: 1, minHeight: 48, padding: '8px 12px', borderRadius: 14, border: 'none', background: '#7C3AED', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, letterSpacing: '0.01em', lineHeight: 1.3 }}>
          {saving
            ? 'Updating your page\u2026'
            : mode === 'closed'
              ? 'Show \u201cClosed today\u201d on my page'
              : `Show \u201cClosing at ${fmtTime(closeTime)}\u201d on my page`}
        </button>
        {hasOwnerUpdate ? (
          <button type="button" onClick={() => void request({ action: 'clear' })} disabled={saving} style={{ height: 48, paddingLeft: 16, paddingRight: 16, borderRadius: 14, border: '1px solid rgba(0,0,0,0.12)', background: '#F5F5F3', color: '#0A0A0A', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            Back to regular hours
          </button>
        ) : null}
      </div>
    </div>
  );

  if (variant === 'dashboard') return <section className="mb-5">{panel}</section>;

  // ── Floating owner bar ─────────────────────────────────────────────────────
  return (
    <div role="region" aria-label={`Owner controls for ${businessName}`}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[560px] pb-[env(safe-area-inset-bottom)]">
      {expanded ? panel : (
        <div
          style={{
            margin: '0 12px 12px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            fontFamily: "var(--font-poppins), system-ui, sans-serif",
          }}
        >
          {/* Error strip — only shown when there's a problem in collapsed state */}
          {errorBar ? (
            <div style={{ padding: '6px 14px', background: '#FEE2E2', fontSize: 11, color: '#991B1B', fontWeight: 600 }}>
              {errorBar}
            </div>
          ) : null}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 8px 8px 14px',
          }}>
            {/* Current state — the bar's job is to say what the page says */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#8A8A8A', margin: 0, lineHeight: 1.3 }}>
                Only you see this bar
              </p>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: hasOwnerUpdate ? '#991B1B' : '#166534', margin: 0, lineHeight: 1.3,
                // Was nowrap + ellipsis, which cut the sentence mid-word
                // ("Customers see your normal hou…"). Two lines is plenty and
                // the owner can actually read what their customers see.
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {hasOwnerUpdate
                  ? `Customers see: ${ownerHeadline || 'a status update'}`
                  : 'Customers see your normal hours'}
              </p>
            </div>

            {/* One action, and it always names its own outcome. */}
            {hasOwnerUpdate ? (
              <button
                type="button"
                onClick={() => void request({ action: 'clear' })}
                disabled={saving}
                style={{
                  height: 36, paddingLeft: 14, paddingRight: 14, borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.10)', background: '#DCFCE7', color: '#166534',
                  fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                {saving ? 'Updating…' : 'Undo — back to normal'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setErrorBar(''); setExpanded(true); }}
                disabled={saving}
                style={{
                  height: 36, paddingLeft: 14, paddingRight: 14, borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.10)', background: '#F5F5F3', color: '#0A0A0A',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                Close or change today
              </button>
            )}

            {/* Dashboard button */}
            <a
              href="/dashboard"
              style={{
                height: 36,
                paddingLeft: 14,
                paddingRight: 14,
                borderRadius: 10,
                background: '#7C3AED',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
