'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Variant = 'floating' | 'dashboard';
type Mode = 'closed' | 'early' | 'note';

type OwnerQuickStatusProps = {
  businessId: string;
  businessName: string;
  variant?: Variant;
};

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
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasOwnerUpdate, setHasOwnerUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkOwner = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/status?businessId=${encodeURIComponent(businessId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => null);
      if (cancelled || !response.ok || !body?.isOwner) return;

      setIsOwner(true);
      setHasOwnerUpdate(Boolean(body.updates?.some((update: { source?: string }) => update.source === 'owner')));
    };

    void checkOwner();
    return () => { cancelled = true; };
  }, [businessId]);

  const request = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
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
      setHasOwnerUpdate(!cleared);
      setMessage(cleared ? 'Back to regular hours.' : 'Live page updated.');
      setNote('');
      setReason('');
      router.refresh();
      if (variant === 'floating') window.setTimeout(() => setExpanded(false), 900);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not update your status.');
    } finally {
      setSaving(false);
    }
  };

  const publish = () => {
    if (mode === 'note' && !note.trim()) {
      setMessage('Write the update customers should see.');
      return;
    }

    void request({
      action: 'publish',
      preset: mode === 'closed' ? 'closed_today' : mode === 'early' ? 'early_close' : 'note_today',
      closesAt: mode === 'early' ? closeTime : null,
      note: mode === 'note' ? note.trim() : null,
      reason: reason.trim() || null,
    });
  };

  if (!isOwner) return null;

  const panel = (
    <div className={variant === 'floating' ? 'border-t-2 border-black bg-[#F4F1E8] p-4 shadow-[0_-12px_35px_rgba(0,0,0,0.18)]' : 'border-2 border-black bg-[#A7E348] p-5 md:p-6'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em]">Update live status</p>
          <p className="mt-1 text-sm text-black/60">What should customers know right now?</p>
        </div>
        {variant === 'floating' ? (
          <button type="button" onClick={() => setExpanded(false)} className="min-h-11 min-w-11 border-2 border-black bg-white text-xl" aria-label="Close owner controls">×</button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Status type">
        {([
          ['closed', 'Close now'],
          ['early', 'Close early'],
          ['note', 'Post a note'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setMode(value); setMessage(''); }}
            className={`min-h-12 border-2 border-black px-2 text-sm font-bold ${mode === value ? 'bg-black text-white' : 'bg-white text-black'}`}
            aria-pressed={mode === value}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'early' ? (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold">Closing time today</span>
          <input type="time" value={closeTime} onChange={(event) => setCloseTime(event.target.value)} className="min-h-12 w-full border-2 border-black bg-white px-3 text-base" />
        </label>
      ) : null}

      {mode === 'note' ? (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold">Customer update</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={100} placeholder="Kitchen closes at 3 PM" className="min-h-12 w-full border-2 border-black bg-white px-3 text-base" />
        </label>
      ) : null}

      {mode !== 'note' ? (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-bold">Reason <span className="font-normal text-black/45">(optional)</span></span>
          <input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={120} placeholder="Private event, weather, sold out…" className="min-h-12 w-full border-2 border-black bg-white px-3 text-base" />
        </label>
      ) : null}

      {message ? <p className="mt-3 bg-white px-3 py-2 text-sm font-medium" role="status">{message}</p> : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={publish} disabled={saving} className="min-h-14 flex-1 border-2 border-black bg-black px-4 font-bold uppercase text-white disabled:opacity-50">
          {saving ? 'Updating…' : mode === 'closed' ? 'Close for today' : 'Publish update'}
        </button>
        {hasOwnerUpdate ? (
          <button type="button" onClick={() => void request({ action: 'clear' })} disabled={saving} className="min-h-14 border-2 border-black bg-white px-4 font-bold uppercase disabled:opacity-50">
            Back to regular hours
          </button>
        ) : null}
      </div>
    </div>
  );

  if (variant === 'dashboard') return <section className="mb-5">{panel}</section>;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[440px] pb-[env(safe-area-inset-bottom)]">
      {expanded ? panel : (
        <div className="m-3 flex items-center gap-2 border-2 border-black bg-[#A7E348] p-2 shadow-[6px_6px_0_#0A0A0A]">
          <span className="min-w-0 flex-1 pl-2">
            <span className="block truncate text-sm font-bold">Signed in as {businessName}</span>
            <span className="block text-xs text-black/60">Only you can see this control</span>
          </span>
          <button
            type="button"
            onClick={() => void request(hasOwnerUpdate ? { action: 'clear' } : { action: 'publish', preset: 'closed_today' })}
            disabled={saving}
            className="min-h-12 shrink-0 border-2 border-black bg-black px-3 text-sm font-bold uppercase text-white disabled:opacity-50"
          >
            {saving ? 'Updating…' : hasOwnerUpdate ? 'Back to normal' : 'Close now'}
          </button>
          <button type="button" onClick={() => setExpanded(true)} className="min-h-12 min-w-12 shrink-0 border-2 border-black bg-white text-xl font-bold" aria-label="More status options">
            +
          </button>
        </div>
      )}
    </div>
  );
}
