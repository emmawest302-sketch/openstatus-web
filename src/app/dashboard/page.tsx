'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const CREAM = '#F4F1E8';
const INK = '#0A0A0A';
const LIME = '#A7E348';
const PEACH = '#F8AE9D';

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

type Business = {
  id: string;
  name: string;
  tagline: string | null;
  slug: string | null;
  avatar_url: string | null;
  header_url: string | null;
  instagram_handle: string | null;
  google_location_id: string | null;
};

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

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const [biz, setBiz] = useState<Business | null>(null);
  const [hours, setHours] = useState<Hours[]>([]);
  const [active, setActive] = useState<Update | null>(null);

  const [showHours, setShowHours] = useState(false);
  const [showLook, setShowLook] = useState(false);
  const [askTime, setAskTime] = useState<null | 'close' | 'open'>(null);
  const [time, setTime] = useState('15:00');
  const [reason, setReason] = useState('');
  const [avatar, setAvatar] = useState('');
  const [header, setHeader] = useState('');
  const [copied, setCopied] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findResults, setFindResults] = useState<{ id: string; name: string; address: string }[]>([]);
  const [finding, setFinding] = useState(false);

  const today = new Date().getDay();
  const todayRow = hours.find((h) => h.day_of_week === today) ?? null;

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/login'); return; }

    const { data: b } = await supabase
      .from('businesses')
      .select('id, name, tagline, slug, avatar_url, header_url, instagram_handle, google_location_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!b) { setLoading(false); return; }
    setBiz(b);
    setAvatar(b.avatar_url ?? '');
    setHeader(b.header_url ?? '');

    const { data: h } = await supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', b.id);
    setHours(h ?? []);

    const { data: up } = await supabase
      .from('status_updates')
      .select('id, kind, headline, detail, reason, source, created_at')
      .eq('business_id', b.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive(up ?? null);

    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (
    kind: 'closed' | 'hours_change',
    headline: string,
    detail: string | null,
    closesAt: string | null
  ) => {
    if (!biz) return;
    setBusy(true); setError(''); setNote('');
    if (active) await supabase.from('status_updates').delete().eq('id', active.id);
    const { error: e } = await supabase.from('status_updates').insert({
      business_id: biz.id,
      kind,
      headline,
      detail,
      reason: reason.trim() || null,
      closes_at: closesAt,
      effective_date: new Date().toISOString().slice(0, 10),
      expires_at: endOfToday(),
      confidence: 1,
      status: 'active',
      source: 'owner',
    });
    setBusy(false);
    setAskTime(null);
    setReason('');
    if (e) { setError(e.message); return; }
    setNote('Your page is updated');
    load();
  };

  const backToNormal = async () => {
    if (!active) return;
    setBusy(true);
    await supabase.from('status_updates').delete().eq('id', active.id);
    setBusy(false);
    setNote('Back to regular hours');
    load();
  };

  const saveHours = async (rows: Hours[]) => {
    if (!biz) return;
    setBusy(true);
    await supabase.from('business_hours').upsert(
      rows.map((r) => ({
        business_id: biz.id,
        day_of_week: r.day_of_week,
        opens_at: r.is_closed ? null : r.opens_at,
        closes_at: r.is_closed ? null : r.closes_at,
        is_closed: r.is_closed,
      })),
      { onConflict: 'business_id,day_of_week' }
    );
    setBusy(false);
    setNote('Hours saved');
    load();
  };

  const saveLook = async () => {
    if (!biz) return;
    setBusy(true);
    await supabase
      .from('businesses')
      .update({ avatar_url: avatar || null, header_url: header || null })
      .eq('id', biz.id);
    setBusy(false);
    setShowLook(false);
    setNote('Saved');
    load();
  };

  const searchPlaces = async () => {
    setFinding(true); setError(''); setFindResults([]);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error('Sign in again');
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: findQuery }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Search failed');
      setFindResults(body.places ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setFinding(false);
    }
  };

  const importPlace = async (placeId: string) => {
    setFinding(true); setError('');
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error('Sign in again');
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Import failed');
      if (!body.imported) { setError(body.reason ?? 'No hours on that listing'); return; }
      setNote('Hours brought in from Google');
      setFindOpen(false);
      setFindResults([]);
      setFindQuery('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setFinding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <p className="text-[#0A0A0A]/60">Loading...</p>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: CREAM }}>
        <a href="/setup" className="px-6 py-3 font-bold border-2 border-[#0A0A0A]" style={{ background: LIME }}>
          Finish setting up
        </a>
      </div>
    );
  }

  const link = 'openstatus.co/' + (biz.slug ?? '');
  const normalToday = todayRow && !todayRow.is_closed
    ? pretty(todayRow.opens_at) + ' to ' + pretty(todayRow.closes_at)
    : 'Closed';

  return (
    <div className="min-h-screen" style={{ background: CREAM, color: INK, fontFamily: 'var(--font-display)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">

        <div className="flex items-center justify-between">
          <p className="text-xl font-bold tracking-tight">{biz.name}</p>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }}
            className="text-xs uppercase tracking-widest text-[#0A0A0A]/50"
          >
            Sign out
          </button>
        </div>

        <div className="mt-5 border-2 border-[#0A0A0A] p-5" style={{ background: active ? PEACH : LIME }}>
          <p className="text-[11px] uppercase tracking-[0.2em]">Right now</p>
          <p className="mt-2 text-3xl font-bold tracking-tight leading-none">
            {active ? active.headline : 'Open as usual'}
          </p>
          <p className="mt-2 text-[15px]">
            {active ? active.detail ?? '' : 'Today ' + normalToday}
          </p>
          {active ? (
            <button
              onClick={backToNormal}
              disabled={busy}
              className="mt-4 w-full py-3 font-bold border-2 border-[#0A0A0A] bg-white"
            >
              Back to normal
            </button>
          ) : null}
        </div>

        {!active ? (
          <div className="mt-3 grid gap-2.5">
            <button
              onClick={() => setStatus('closed', 'Closed today', null, null)}
              disabled={busy}
              className="py-5 text-lg font-bold border-2 border-[#0A0A0A] bg-[#0A0A0A] text-white"
            >
              Closed today
            </button>
            <button
              onClick={() => { setAskTime('close'); setTime(todayRow?.closes_at?.slice(0,5) ?? '15:00'); }}
              disabled={busy}
              className="py-5 text-lg font-bold border-2 border-[#0A0A0A] bg-white"
            >
              Closing early
            </button>
            <button
              onClick={() => { setAskTime('open'); setTime(todayRow?.opens_at?.slice(0,5) ?? '10:00'); }}
              disabled={busy}
              className="py-5 text-lg font-bold border-2 border-[#0A0A0A] bg-white"
            >
              Opening late
            </button>
          </div>
        ) : null}

        {askTime ? (
          <div className="mt-3 border-2 border-[#0A0A0A] p-5 bg-white">
            <p className="font-bold">
              {askTime === 'close' ? 'What time are you closing?' : 'What time are you opening?'}
            </p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-3 w-full border-2 border-[#0A0A0A] px-3 py-3 text-xl"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why? Weather, staffing... optional"
              className="mt-2.5 w-full border-2 border-[#0A0A0A] px-3 py-3"
            />
            <button
              onClick={() =>
                askTime === 'close'
                  ? setStatus('hours_change', 'Closing early today', 'Closing at ' + pretty(time), time)
                  : setStatus('hours_change', 'Opening late today', 'Opening at ' + pretty(time), null)
              }
              disabled={busy}
              className="mt-3 w-full py-4 text-lg font-bold border-2 border-[#0A0A0A]"
              style={{ background: LIME }}
            >
              Update my page
            </button>
            <button onClick={() => setAskTime(null)} className="mt-2 w-full py-2 text-sm text-[#0A0A0A]/60">
              Cancel
            </button>
          </div>
        ) : null}

        {note ? <p className="mt-3 text-sm font-bold">{note}</p> : null}
        {error ? <p className="mt-3 text-sm text-[#B3261E]">{error}</p> : null}

        <div className="mt-6 border-2 border-[#0A0A0A] bg-[#0A0A0A] text-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">Your link</p>
          <p className="mt-1.5 text-lg font-bold break-all">{link}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => { navigator.clipboard.writeText('https://' + link); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
              className="py-3 font-bold border-2 border-white"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a href={'/' + (biz.slug ?? '')} className="py-3 font-bold border-2 border-white text-center" style={{ background: LIME, color: INK, borderColor: LIME }}>
              View
            </a>
          </div>
        </div>

        <button
          onClick={() => setShowHours(!showHours)}
          className="mt-3 w-full border-2 border-[#0A0A0A] bg-white px-5 py-4 flex items-center justify-between"
        >
          <span className="font-bold">Regular hours</span>
          <span className="text-sm text-[#0A0A0A]/60">{showHours ? 'Close' : 'Edit'}</span>
        </button>

        {showHours ? (
          <div className="border-2 border-t-0 border-[#0A0A0A] bg-white p-4 space-y-2">
            {DAYS.map((d, i) => {
              const row = hours.find((h) => h.day_of_week === i) ?? {
                day_of_week: i, opens_at: '09:00', closes_at: '17:00', is_closed: false,
              };
              const update = (patch: Partial<Hours>) => {
                const next = DAYS.map((_, j) => {
                  const cur = hours.find((h) => h.day_of_week === j) ?? {
                    day_of_week: j, opens_at: '09:00', closes_at: '17:00', is_closed: j === 0,
                  };
                  return j === i ? { ...cur, ...patch } : cur;
                });
                setHours(next);
              };
              return (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-12 text-sm">{d.slice(0,3)}</span>
                  {row.is_closed ? (
                    <span className="flex-1 text-sm text-[#0A0A0A]/50">Closed</span>
                  ) : (
                    <span className="flex-1 flex items-center gap-1.5">
                      <input type="time" value={(row.opens_at ?? '09:00').slice(0,5)}
                        onChange={(e) => update({ opens_at: e.target.value })}
                        className="border-2 border-[#0A0A0A] px-2 py-1.5 text-sm w-[110px]" />
                      <input type="time" value={(row.closes_at ?? '17:00').slice(0,5)}
                        onChange={(e) => update({ closes_at: e.target.value })}
                        className="border-2 border-[#0A0A0A] px-2 py-1.5 text-sm w-[110px]" />
                    </span>
                  )}
                  <button onClick={() => update({ is_closed: !row.is_closed })}
                    className="text-xs border-2 border-[#0A0A0A] px-2 py-1.5">
                    {row.is_closed ? 'Open' : 'Shut'}
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setFindOpen(!findOpen)}
              className="mt-1 w-full py-2.5 text-sm border-2 border-[#0A0A0A] bg-white"
            >
              {findOpen ? 'Cancel' : 'Bring my hours in from Google'}
            </button>

            {findOpen ? (
              <div className="mt-2 border-2 border-[#0A0A0A] p-3">
                <input
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Business name and town"
                  className="w-full border-2 border-[#0A0A0A] px-3 py-2.5"
                />
                <button
                  onClick={searchPlaces}
                  disabled={finding}
                  className="mt-2 w-full py-2.5 font-bold border-2 border-[#0A0A0A]"
                  style={{ background: LIME }}
                >
                  {finding ? 'Looking...' : 'Find it'}
                </button>
                {findResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => importPlace(p.id)}
                    disabled={finding}
                    className="mt-2 w-full text-left border-2 border-[#0A0A0A] px-3 py-2.5"
                  >
                    <span className="block font-bold text-sm">{p.name}</span>
                    <span className="block text-xs text-[#0A0A0A]/60">{p.address}</span>
                  </button>
                ))}
              </div>
            ) : null}

            <button onClick={() => saveHours(DAYS.map((_, j) => hours.find((h) => h.day_of_week === j) ?? { day_of_week: j, opens_at: '09:00', closes_at: '17:00', is_closed: j === 0 }))}
              disabled={busy}
              className="mt-2 w-full py-3 font-bold border-2 border-[#0A0A0A]" style={{ background: LIME }}>
              Save hours
            </button>
          </div>
        ) : null}

        <button
          onClick={() => setShowLook(!showLook)}
          className="mt-3 w-full border-2 border-[#0A0A0A] bg-white px-5 py-4 flex items-center justify-between"
        >
          <span className="font-bold">Photos</span>
          <span className="text-sm text-[#0A0A0A]/60">{showLook ? 'Close' : 'Edit'}</span>
        </button>

        {showLook ? (
          <div className="border-2 border-t-0 border-[#0A0A0A] bg-white p-4">
            <p className="text-sm text-[#0A0A0A]/60">Logo image address</p>
            <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://"
              className="mt-1.5 w-full border-2 border-[#0A0A0A] px-3 py-2.5" />
            <p className="mt-3 text-sm text-[#0A0A0A]/60">Cover photo address</p>
            <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="https://"
              className="mt-1.5 w-full border-2 border-[#0A0A0A] px-3 py-2.5" />
            <button onClick={saveLook} disabled={busy}
              className="mt-3 w-full py-3 font-bold border-2 border-[#0A0A0A]" style={{ background: LIME }}>
              Save photos
            </button>
          </div>
        ) : null}

        <div className="mt-6 border-2 border-[#0A0A0A] bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#0A0A0A]/50">Connected</p>
          <div className="mt-3 flex items-center justify-between">
            <span>Instagram</span>
            {biz.instagram_handle
              ? <span className="text-sm font-bold">@{biz.instagram_handle}</span>
              : <a href="/setup" className="text-sm font-bold underline">Connect</a>}
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span>Google</span>
            {biz.google_location_id
              ? <span className="text-sm font-bold">Connected</span>
              : <a href="/connect/google" className="text-sm font-bold underline">Connect</a>}
          </div>
          <a href="/connect/google/status" className="mt-4 block text-xs text-[#0A0A0A]/50 underline">
            Check Google connection
          </a>
        </div>

      </div>
    </div>
  );
}
