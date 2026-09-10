'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

type Hours = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type Update = {
  id: string;
  kind: string;
  headline: string;
  detail: string | null;
  reason: string | null;
  source: string | null;
  created_at: string;
};

type Mode = 'normal' | 'closing_early' | 'opening_late' | 'closed';

function pretty(t: string | null): string {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  let h = parseInt(hStr, 10);
  const mer = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === '00' ? h + ':00 ' + mer : h + ':' + m + ' ' + mer;
}

function endOfToday(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

export default function Today() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [todayRow, setTodayRow] = useState<Hours | null>(null);
  const [active, setActive] = useState<Update | null>(null);

  const [mode, setMode] = useState<Mode>('normal');
  const [time, setTime] = useState('15:00');
  const [reason, setReason] = useState('');

  const today = new Date().getDay();

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/login'); return; }

    const { data: biz } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!biz) { setLoading(false); return; }
    setBusinessId(biz.id);
    setSlug(biz.slug);

    const { data: h } = await supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', biz.id)
      .eq('day_of_week', today)
      .maybeSingle();
    setTodayRow(h ?? null);
    if (h?.closes_at) setTime(h.closes_at.slice(0, 5));

    const { data: up } = await supabase
      .from('status_updates')
      .select('id, kind, headline, detail, reason, source, created_at')
      .eq('business_id', biz.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive(up ?? null);

    setLoading(false);
  }, [router, today]);

  useEffect(() => { load(); }, [load]);

  const clearActive = async () => {
    if (!businessId || !active) return;
    await supabase.from('status_updates').delete().eq('id', active.id);
    setActive(null);
  };

  const apply = async () => {
    if (!businessId) return;
    setSaving(true); setError(''); setDone('');

    // Only one owner-set change at a time. Replacing is clearer than stacking.
    if (active) {
      await supabase.from('status_updates').delete().eq('id', active.id);
    }

    if (mode === 'normal') {
      setSaving(false);
      setActive(null);
      setDone('Back to regular hours');
      return;
    }

    const row =
      mode === 'closed'
        ? {
            kind: 'closed',
            headline: 'Closed today',
            detail: null as string | null,
            closes_at: null as string | null,
          }
        : mode === 'closing_early'
        ? {
            kind: 'hours_change',
            headline: 'Closing early today',
            detail: 'Closing at ' + pretty(time),
            closes_at: time,
          }
        : {
            kind: 'hours_change',
            headline: 'Opening late today',
            detail: 'Opening at ' + pretty(time),
            closes_at: null as string | null,
          };

    const { error: e } = await supabase.from('status_updates').insert({
      business_id: businessId,
      kind: row.kind,
      headline: row.headline,
      detail: row.detail,
      reason: reason.trim() || null,
      closes_at: row.closes_at,
      effective_date: new Date().toISOString().slice(0, 10),
      expires_at: endOfToday(),
      confidence: 1,
      status: 'active',
      source: 'owner',
    });

    setSaving(false);
    if (e) { setError(e.message); return; }
    setDone('Your page is updated');
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6C6A62]">Loading...</p>
      </div>
    );
  }

  const normalLine = todayRow && !todayRow.is_closed
    ? pretty(todayRow.opens_at) + ' to ' + pretty(todayRow.closes_at)
    : 'Closed';

  const options: { key: Mode; label: string }[] = [
    { key: 'normal', label: 'Normal hours' },
    { key: 'closing_early', label: 'Closing early' },
    { key: 'opening_late', label: 'Opening late' },
    { key: 'closed', label: 'Closed today' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1A1A18]" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="max-w-md mx-auto px-6 py-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9B998F]" style={{ fontFamily: 'var(--font-mono)' }}>
          {DAY_NAMES[today]}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Today</h1>
        <p className="mt-2 text-[#6C6A62]">
          Regular hours are {normalLine}. Anything you set here clears at
          midnight on its own.
        </p>

        {active ? (
          <div className="mt-6 rounded-2xl bg-[#FBF0DC] px-5 py-4">
            <p className="font-medium text-[#8A5A11]">{active.headline}</p>
            {active.detail ? <p className="text-sm text-[#9A7434]">{active.detail}</p> : null}
            <p className="mt-1 text-[11px] text-[#AD8B50]" style={{ fontFamily: 'var(--font-mono)' }}>
              {active.source === 'owner' ? 'You set this' : 'Detected from a post'}
            </p>
            <button onClick={clearActive} className="mt-3 text-sm text-[#8A5A11] underline">
              Remove and go back to normal
            </button>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => setMode(o.key)}
              className={
                'py-4 rounded-2xl font-medium transition ' +
                (mode === o.key
                  ? 'bg-[#1A1A18] text-white'
                  : 'bg-[#F5F7F5] text-[#1A1A18] hover:bg-[#E8EDE9]')
              }
            >
              {o.label}
            </button>
          ))}
        </div>

        {mode === 'closing_early' || mode === 'opening_late' ? (
          <div className="mt-4 rounded-2xl bg-[#F5F7F5] px-5 py-4">
            <p className="text-sm text-[#6C6A62]">
              {mode === 'closing_early' ? 'Closing at' : 'Opening at'}
            </p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1.5 bg-white rounded-xl px-3 py-2 text-lg focus:outline-none"
            />
          </div>
        ) : null}

        {mode !== 'normal' ? (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason, optional. Weather, staffing, repairs"
            className="mt-3 w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
          />
        ) : null}

        {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}
        {done ? <p className="mt-4 text-sm text-[#2E7D5B]">{done}</p> : null}

        <button
          onClick={apply}
          disabled={saving}
          className="mt-5 w-full py-3.5 rounded-full bg-[#2E7D5B] text-white font-medium hover:bg-[#256349] disabled:opacity-40 transition"
        >
          {saving ? 'Updating...' : 'Update my page'}
        </button>

        {slug ? (
          <a href={'/' + slug} className="mt-3 block text-center py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition">
            See my page
          </a>
        ) : null}

        <a href="/dashboard" className="mt-3 block text-center text-sm text-[#6C6A62]">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
