'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The notice, editable from the phone.
 *
 * This is the control an owner reaches for at 6am in a snowstorm, so it is one
 * field and one button. Saving posts to a purpose-built endpoint that can only
 * write these two keys — see api/owner/banner for why the phone link is not
 * allowed to save a whole page config.
 */

export default function OwnerBanner({ initialText, initialOn }: {
  initialText: string;
  initialOn: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (value: string) => {
    setBusy(true); setError(null); setSaved(false);
    try {
      const res = await fetch('/api/owner/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, on: value.trim().length > 0 }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error ?? 'Could not save');
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }, [router]);

  const dirty = text.trim() !== initialText.trim();
  const showing = initialOn && initialText.trim().length > 0;

  return (
    <section style={card}>
      <h2 style={heading}>Notice on your page</h2>
      <p style={body}>
        {showing
          ? 'Showing at the top of your page right now.'
          : 'One line above everything, for what your hours can’t say.'}
      </p>

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value.slice(0, 160)); setSaved(false); }}
        placeholder="Snow day — delivery only until 2pm"
        rows={2}
        style={field}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => void save(text)}
          disabled={busy || !dirty}
          style={{ ...saveBtn, opacity: busy || !dirty ? 0.45 : 1 }}
        >
          {busy ? 'Saving…' : showing ? 'Update notice' : 'Post notice'}
        </button>

        {showing && (
          <button
            type="button"
            onClick={() => { setText(''); void save(''); }}
            disabled={busy}
            style={clearBtn}
          >
            Take it down
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#C0C0C0', fontVariantNumeric: 'tabular-nums' }}>
          {text.length}/160
        </span>
      </div>

      {saved && <p style={{ ...body, color: '#15803D', fontWeight: 600 }}>✓ Saved.</p>}
      {error && <p style={{ ...body, color: '#B91C1C' }}>{error}</p>}
    </section>
  );
}

const card: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: '#FFFFFF', border: '1px solid #E9E9E7',
  borderRadius: 20, padding: '18px 20px 20px', marginTop: 14,
  boxSizing: 'border-box',
};
const heading: React.CSSProperties = {
  fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0A', margin: 0,
};
const body: React.CSSProperties = {
  fontSize: 12.5, lineHeight: 1.5, color: '#777777', margin: '6px 0 0',
};
const field: React.CSSProperties = {
  width: '100%', marginTop: 11, padding: '11px 12px',
  borderRadius: 13, border: '1px solid #E9E9E7', background: '#FFFFFF',
  fontSize: 15, lineHeight: 1.4, color: '#0A0A0A',
  resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};
const saveBtn: React.CSSProperties = {
  padding: '11px 16px', borderRadius: 13, border: 'none',
  background: '#0A0A0A', color: '#FFFFFF',
  fontSize: 13.5, fontWeight: 650, cursor: 'pointer',
};
const clearBtn: React.CSSProperties = {
  padding: '11px 4px', border: 'none', background: 'transparent',
  fontSize: 13, fontWeight: 550, color: '#777777', cursor: 'pointer',
};
