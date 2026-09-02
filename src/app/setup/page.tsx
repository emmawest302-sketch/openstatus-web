'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { normaliseHandle, suggestHandle } from '@/lib/handles';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const PRESETS = [
  'Menu','Order Online','Directions','Reserve','Catering','Gift Cards','Website','Call',
];

type Row = { open: string; close: string; closed: boolean };

const DEFAULT_ROWS: Row[] = DAYS.map((_, i) => ({
  open: '09:00',
  close: '17:00',
  closed: i === 0,
}));

type HandleState = 'idle' | 'checking' | 'free' | 'taken';

export default function Setup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [handle, setHandle] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [handleReason, setHandleReason] = useState('');
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [igHandle, setIgHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/login');
      return;
    }
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, name, tagline, slug, links, instagram_handle')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (biz) {
      setBusinessId(biz.id);
      setName(biz.name === 'My business' ? '' : biz.name);
      setTagline(biz.tagline ?? '');
      setIgHandle(biz.instagram_handle ?? null);
      if (biz.slug) {
        setHandle(biz.slug);
        setHandleTouched(true);
      }
      if (Array.isArray(biz.links) && biz.links.length > 0) setLinks(biz.links);

      const { data: h } = await supabase
        .from('business_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('business_id', biz.id);
      if (h && h.length > 0) {
        const next = [...DEFAULT_ROWS];
        h.forEach((r) => {
          next[r.day_of_week] = {
            open: (r.opens_at ?? '09:00').slice(0, 5),
            close: (r.closes_at ?? '17:00').slice(0, 5),
            closed: r.is_closed,
          };
        });
        setRows(next);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Suggest a handle from the name until the owner edits it themselves.
  useEffect(() => {
    if (!handleTouched && name.trim().length > 0) {
      setHandle(suggestHandle(name));
    }
  }, [name, handleTouched]);

  // Check availability as they type, but wait for them to pause first.
  useEffect(() => {
    const h = normaliseHandle(handle);
    if (h.length < 3) {
      setHandleState('idle');
      setHandleReason('');
      return;
    }
    setHandleState('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/handle?handle=' + encodeURIComponent(h));
        const body = await res.json();
        if (normaliseHandle(handle) !== body.handle) return;
        setHandleState(body.available ? 'free' : 'taken');
        setHandleReason(body.reason ?? '');
      } catch {
        setHandleState('idle');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [handle]);

  const saveBasics = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const chosen = normaliseHandle(handle);
    const { error: e } = await supabase
      .from('businesses')
      .update({ name, tagline, slug: chosen })
      .eq('id', businessId);
    setSaving(false);
    if (e) {
      setError(e.message.includes('duplicate') ? 'That address was just taken, try another' : e.message);
      return;
    }
    setStep(2);
  };

  const saveHours = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const payload = rows.map((r, i) => ({
      business_id: businessId,
      day_of_week: i,
      opens_at: r.closed ? null : r.open,
      closes_at: r.closed ? null : r.close,
      is_closed: r.closed,
    }));
    const { error: e } = await supabase
      .from('business_hours')
      .upsert(payload, { onConflict: 'business_id,day_of_week' });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setStep(3);
  };

  const copyDayToAll = (from: number) => {
    const src = rows[from];
    setRows(rows.map((r, i) => (i === 0 ? r : { ...src })));
  };

  const saveLinks = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const clean = links.filter((l) => l.url.trim().length > 0);
    const { error: e } = await supabase
      .from('businesses')
      .update({ links: clean })
      .eq('id', businessId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setStep(4);
  };

  const connectInstagram = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired, sign in again');
      const res = await fetch('/api/auth/meta/start', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not start');
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6C6A62]">Loading...</p>
      </div>
    );
  }

  const clean = normaliseHandle(handle);
  const pageUrl = 'openstatus.co/' + clean;
  const canContinue = name.trim().length > 0 && handleState === 'free';

  return (
    <div className="min-h-screen bg-white text-[#1A1A18]" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={'h-1 flex-1 rounded-full ' + (n <= step ? 'bg-[#2E7D5B]' : 'bg-[#E8E6E0]')} />
          ))}
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#9B998F]" style={{ fontFamily: 'var(--font-mono)' }}>
          Step {step} of 5
        </p>

        {step === 1 ? (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">What is your business called?</h1>
            <p className="mt-2 text-[#6C6A62]">We will suggest your link as you type.</p>

            <div className="mt-7 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Herban Market"
                className="w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
              />
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Grocery and coffee · Columbia, TN"
                className="w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
              />

              <div className="rounded-2xl bg-[#F5F7F5] px-4 py-3">
                <p className="text-xs text-[#6C6A62]">Your link</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[#9B998F]">openstatus.co/</span>
                  <input
                    value={handle}
                    onChange={(e) => { setHandleTouched(true); setHandle(e.target.value); }}
                    placeholder="yourbusiness"
                    className="flex-1 bg-transparent focus:outline-none font-medium min-w-0"
                  />
                  {handleState === 'checking' ? (
                    <span className="text-xs text-[#9B998F] shrink-0">checking</span>
                  ) : handleState === 'free' ? (
                    <span className="text-xs text-[#2E7D5B] shrink-0">available</span>
                  ) : handleState === 'taken' ? (
                    <span className="text-xs text-[#C4453F] shrink-0">{handleReason || 'taken'}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

            <button
              onClick={saveBasics}
              disabled={saving || !canContinue}
              className="mt-7 w-full py-3.5 rounded-full bg-[#1A1A18] text-white font-medium hover:bg-[#2E7D5B] disabled:opacity-40 transition"
            >
              {saving ? 'Saving...' : 'Claim this link'}
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">What are your regular hours?</h1>
            <p className="mt-2 text-[#6C6A62]">
              Set these once. When something is different we update your page, then
              put it back to normal on its own.
            </p>

            <div className="mt-7 space-y-2">
              {DAYS.map((d, i) => (
                <div key={d} className="flex items-center gap-3 rounded-2xl bg-[#F5F7F5] px-4 py-2.5">
                  <span className="w-20 text-sm shrink-0">{d.slice(0, 3)}</span>
                  {rows[i].closed ? (
                    <span className="flex-1 text-sm text-[#9B998F]">Closed</span>
                  ) : (
                    <span className="flex-1 flex items-center gap-2">
                      <input
                        type="time"
                        value={rows[i].open}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...next[i], open: e.target.value };
                          setRows(next);
                        }}
                        className="bg-white rounded-lg px-2 py-1 text-sm focus:outline-none"
                      />
                      <span className="text-[#9B998F]">to</span>
                      <input
                        type="time"
                        value={rows[i].close}
                        onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...next[i], close: e.target.value };
                          setRows(next);
                        }}
                        className="bg-white rounded-lg px-2 py-1 text-sm focus:outline-none"
                      />
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const next = [...rows];
                      next[i] = { ...next[i], closed: !next[i].closed };
                      setRows(next);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white text-[#6C6A62] hover:text-[#1A1A18] transition shrink-0"
                  >
                    {rows[i].closed ? 'Open' : 'Closed'}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => copyDayToAll(1)}
              className="mt-3 text-sm text-[#2E7D5B] underline"
            >
              Use Monday&rsquo;s hours for every other day
            </button>

            {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

            <button
              onClick={saveHours}
              disabled={saving}
              className="mt-6 w-full py-3.5 rounded-full bg-[#1A1A18] text-white font-medium hover:bg-[#2E7D5B] disabled:opacity-40 transition"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button onClick={() => setStep(1)} className="mt-3 w-full text-sm text-[#6C6A62]">Back</button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Add the things customers need</h1>
            <p className="mt-2 text-[#6C6A62]">Paste a link for anything you want on your page.</p>

            <div className="mt-6 flex flex-wrap gap-2">
              {PRESETS.filter((p) => !links.some((l) => l.label === p)).map((p) => (
                <button
                  key={p}
                  onClick={() => setLinks([...links, { label: p, url: '' }])}
                  className="text-sm px-4 py-2 rounded-full bg-[#F5F7F5] hover:bg-[#E2EFE7] transition"
                >
                  + {p}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              {links.map((l, i) => (
                <div key={l.label + i} className="rounded-2xl bg-[#F5F7F5] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{l.label}</span>
                    <button
                      onClick={() => setLinks(links.filter((_, j) => j !== i))}
                      className="text-xs text-[#9B998F] hover:text-[#C4453F]"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={l.url}
                    onChange={(e) => {
                      const next = [...links];
                      next[i] = { ...next[i], url: e.target.value };
                      setLinks(next);
                    }}
                    placeholder="https://"
                    className="mt-1.5 w-full bg-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

            <button
              onClick={saveLinks}
              disabled={saving}
              className="mt-7 w-full py-3.5 rounded-full bg-[#1A1A18] text-white font-medium hover:bg-[#2E7D5B] disabled:opacity-40 transition"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button onClick={() => setStep(2)} className="mt-3 w-full text-sm text-[#6C6A62]">Back</button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Connect Instagram</h1>
            <p className="mt-2 text-[#6C6A62]">
              Optional. If you connect it, we can spot a change you posted and ask you
              to confirm it. We never publish anything without you.
            </p>

            <div className="mt-6 rounded-2xl bg-[#F5F7F5] px-5 py-4">
              <p className="text-sm text-[#4A4842]">
                Needs a Business or Creator account linked to a Facebook page. We only
                read posts.
              </p>
            </div>

            {igHandle ? (
              <div className="mt-4 rounded-2xl bg-[#E2EFE7] px-5 py-4">
                <p className="text-[#2E7D5B] font-medium">Connected to @{igHandle}</p>
              </div>
            ) : (
              <button
                onClick={connectInstagram}
                disabled={saving}
                className="mt-5 w-full py-3.5 rounded-full bg-[#2E7D5B] text-white font-medium hover:bg-[#256349] disabled:opacity-40 transition"
              >
                {saving ? 'Opening...' : 'Connect Instagram'}
              </button>
            )}

            {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

            <button
              onClick={() => setStep(5)}
              className="mt-3 w-full py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition"
            >
              {igHandle ? 'Continue' : 'Skip for now'}
            </button>
            <button onClick={() => setStep(3)} className="mt-3 w-full text-sm text-[#6C6A62]">Back</button>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Your live status is ready</h1>
            <p className="mt-2 text-[#6C6A62]">Put this in your Instagram bio and you are done.</p>

            <div className="mt-6 rounded-2xl bg-[#12251D] text-white px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#9FE1CB]" style={{ fontFamily: 'var(--font-mono)' }}>
                Add to your bio
              </p>
              <p className="mt-2 text-lg font-medium">Current hours + LIVE STATUS</p>
              <p className="text-[#9FE1CB]">{pageUrl}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('Current hours + LIVE STATUS\n' + pageUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-4 w-full py-2.5 rounded-full bg-[#2E7D5B] font-medium hover:bg-white hover:text-[#12251D] transition"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <a href={'/' + clean} className="mt-4 block text-center py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition">
              View my page
            </a>
            <a href="/dashboard" className="mt-3 block text-center py-3.5 rounded-full bg-[#1A1A18] text-white font-medium hover:bg-[#2E7D5B] transition">
              Go to dashboard
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
