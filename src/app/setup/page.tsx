'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { normaliseHandle, suggestHandle } from '@/lib/handles';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PRESETS = ['Menu', 'Order Online', 'Directions', 'Reserve', 'Catering', 'Gift Cards', 'Website', 'Call'];

type Row = { open: string; close: string; closed: boolean };
type QuickLink = { label: string; url: string };
type HandleState = 'idle' | 'checking' | 'free' | 'taken';

const DEFAULT_ROWS: Row[] = DAYS.map((_, index) => ({
  open: '09:00',
  close: '17:00',
  closed: index === 0,
}));

function Keyhole({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="setup-keyhole">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#setup-keyhole)" />
    </svg>
  );
}

function prettyTime(value: string) {
  const [hourText, minute] = value.split(':');
  let hour = Number(hourText);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${meridiem}`;
}

function PagePreview({
  name,
  tagline,
  avatarUrl,
  headerUrl,
  rows,
  links,
}: {
  name: string;
  tagline: string;
  avatarUrl: string;
  headerUrl: string;
  rows: Row[];
  links: QuickLink[];
}) {
  const today = rows[new Date().getDay()];
  const visibleLinks = links.filter((link) => link.url.trim()).slice(0, 3);

  return (
    <div className="overflow-hidden border-2 border-black bg-[#EDE9E2] shadow-[10px_10px_0_#0A0A0A]">
      <div className="relative h-44 bg-[#2F6B3B]">
        {headerUrl ? <img src={headerUrl} alt="" className="h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/65" />
        <div className="absolute inset-x-5 bottom-5 flex items-end gap-3 text-white">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-white text-black">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <Keyhole size={25} />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold leading-tight">{name || 'Your business'}</p>
            <p className="truncate text-xs text-white/75">{tagline || 'A short description or location'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-3xl border border-black/10 bg-white/80 p-4">
          <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#2F6B3B]">
            <span className="h-2 w-2 rounded-full bg-[#2F6B3B]" /> Regular hours
          </div>
          <p className="mt-2 text-2xl font-bold">{today?.closed ? 'Closed today' : 'Open today'}</p>
          {!today?.closed ? <p className="text-sm text-black/55">{prettyTime(today.open)} – {prettyTime(today.close)}</p> : null}
        </div>

        {visibleLinks.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {visibleLinks.map((link) => (
              <div key={link.label} className="min-h-20 rounded-2xl border border-black/10 bg-white/80 p-3 text-xs font-medium">
                <span className="mb-3 block text-lg">↗</span>{link.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/25 p-4 text-center text-xs text-black/45">Your quick links will appear here</div>
        )}
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [handle, setHandle] = useState('');
  const [initialHandle, setInitialHandle] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);
  const [handleState, setHandleState] = useState<HandleState>('idle');
  const [handleReason, setHandleReason] = useState('');
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [headerUrl, setHeaderUrl] = useState('');
  const [uploading, setUploading] = useState<'avatar' | 'header' | null>(null);
  const [igHandle, setIgHandle] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      const requestedStep = Number(query.get('step'));
      if (requestedStep >= 1 && requestedStep <= 4) setStep(requestedStep);
      if (query.get('connect') === 'ok') {
        setStep(4);
        setIgHandle(query.get('handle'));
      }
      if (query.get('connect') === 'error' || query.get('connect') === 'no_instagram') {
        setStep(4);
        setError(query.get('reason') || 'Instagram could not be connected.');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/login');
      return;
    }

    const fields = 'id, name, tagline, slug, links, avatar_url, header_url, instagram_handle';
    const { data: existing, error: readError } = await supabase
      .from('businesses')
      .select(fields)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    let business = existing;
    if (!business && !readError) {
      const fallbackName = String(userData.user.user_metadata?.business_name || 'My business');
      const { data: created, error: createError } = await supabase
        .from('businesses')
        .insert({ user_id: userData.user.id, name: fallbackName })
        .select(fields)
        .single();
      if (createError) {
        setError(createError.message);
        setLoading(false);
        return;
      }
      business = created;
    }

    if (readError) {
      setError(readError.message);
      setLoading(false);
      return;
    }

    if (business) {
      setBusinessId(business.id);
      setName(business.name === 'My business' ? '' : business.name);
      setTagline(business.tagline ?? '');
      setAvatarUrl(business.avatar_url ?? '');
      setHeaderUrl(business.header_url ?? '');
      setIgHandle(business.instagram_handle ?? null);
      if (business.slug) {
        setHandle(business.slug);
        setInitialHandle(business.slug);
        setHandleTouched(true);
        setHandleState('free');
      }
      if (Array.isArray(business.links)) setLinks(business.links as QuickLink[]);

      const { data: hourRows } = await supabase
        .from('business_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('business_id', business.id);

      if (hourRows && hourRows.length > 0) {
        const next = DEFAULT_ROWS.map((row) => ({ ...row }));
        hourRows.forEach((row) => {
          next[row.day_of_week] = {
            open: (row.opens_at ?? '09:00').slice(0, 5),
            close: (row.closes_at ?? '17:00').slice(0, 5),
            closed: row.is_closed,
          };
        });
        setRows(next);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const normalized = normaliseHandle(handle);
      if (normalized.length < 3) {
        setHandleState('idle');
        setHandleReason('');
        return;
      }
      if (normalized === initialHandle) {
        setHandleState('free');
        setHandleReason('');
        return;
      }
      setHandleState('checking');
      try {
        const response = await fetch(`/api/handle?handle=${encodeURIComponent(normalized)}`);
        const body = await response.json();
        if (normaliseHandle(handle) !== body.handle) return;
        setHandleState(body.available ? 'free' : 'taken');
        setHandleReason(body.reason ?? '');
      } catch {
        setHandleState('idle');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [handle, initialHandle]);

  const saveBasics = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const chosen = normaliseHandle(handle);
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ name: name.trim(), tagline: tagline.trim() || null, slug: chosen })
      .eq('id', businessId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message.includes('duplicate') ? 'That address was just taken. Try another.' : updateError.message);
      return;
    }
    setInitialHandle(chosen);
    setStep(2);
  };

  const saveHours = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const payload = rows.map((row, index) => ({
      business_id: businessId,
      day_of_week: index,
      opens_at: row.closed ? null : row.open,
      closes_at: row.closed ? null : row.close,
      is_closed: row.closed,
    }));
    const { error: updateError } = await supabase
      .from('business_hours')
      .upsert(payload, { onConflict: 'business_id,day_of_week' });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStep(3);
  };

  const saveAppearance = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');
    const cleanLinks = links.filter((link) => link.url.trim());
    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        links: cleanLinks,
        avatar_url: avatarUrl.trim() || null,
        header_url: headerUrl.trim() || null,
      })
      .eq('id', businessId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setLinks(cleanLinks);
    setStep(4);
  };

  const uploadImage = async (file: File, kind: 'avatar' | 'header') => {
    setUploading(kind);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired. Sign in again.');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const prepareResponse = await fetch('/api/assets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'prepare',
          kind,
          contentType: file.type,
          size: file.size,
        }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) throw new Error(prepared.error ?? 'Could not prepare upload');

      const { error: uploadError } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
          cacheControl: '3600',
        });
      if (uploadError) throw uploadError;

      const completeResponse = await fetch('/api/assets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'complete', kind, path: prepared.path }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error ?? 'Could not save image');

      if (kind === 'avatar') setAvatarUrl(completed.url);
      else setHeaderUrl(completed.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const connectInstagram = async () => {
    setSaving(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired. Sign in again.');
      const response = await fetch('/api/auth/meta/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnTo: 'setup' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not connect Instagram');
      window.location.href = body.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong');
      setSaving(false);
    }
  };

  const finish = () => router.push('/dashboard?welcome=1');

  const cleanHandle = normaliseHandle(handle);
  const canContinue = Boolean(businessId && name.trim() && handleState === 'free');
  const pageUrl = `openstatus.co/${cleanHandle || 'yourbusiness'}`;
  const stepNames = ['Claim your link', 'Set regular hours', 'Make it yours', 'Connect Instagram'];

  const previewLinks = useMemo(() => links.filter((link) => link.url.trim()), [links]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1E8]">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em]">Preparing your link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#0A0A0A]">
      <header className="border-b-2 border-black">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5"><Keyhole /><span className="font-bold tracking-[-0.03em]">OPENSTATUS</span></Link>
          <Link href="/dashboard" className="font-mono text-[10px] font-bold uppercase tracking-[0.13em] hover:underline">Save & exit</Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] gap-10 px-5 py-7 md:px-8 md:py-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-16">
        <section>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((number) => (
              <button key={number} onClick={() => number < step && setStep(number)} className={`h-2 flex-1 border border-black ${number <= step ? 'bg-[#A7E348]' : 'bg-white'}`} aria-label={`Go to step ${number}`} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/45">
            <span>Step {step} of 4</span><span>{stepNames[step - 1]}</span>
          </div>

          {step === 1 ? (
            <div className="mt-9">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">First, the essentials</p>
              <h1 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">Claim your<br /><span className="text-[#2F6B3B]">live link.</span></h1>
              <p className="mt-5 max-w-xl text-lg text-black/60">This is the permanent link customers can check before they visit. You only set it up once.</p>

              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Business name</span>
                  <input value={name} onChange={(event) => { const nextName = event.target.value; setName(nextName); if (!handleTouched) setHandle(suggestHandle(nextName)); }} placeholder="Herban Market" className="w-full border-2 border-black bg-white px-4 py-3.5 text-base outline-none focus:bg-[#A7E348]/20" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Short description or location</span>
                  <input value={tagline} onChange={(event) => setTagline(event.target.value)} placeholder="Grocery and coffee · Columbia, TN" className="w-full border-2 border-black bg-white px-4 py-3.5 text-base outline-none focus:bg-[#A7E348]/20" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">Your OpenStatus address</span>
                  <div className="flex flex-wrap items-center border-2 border-black bg-white px-4 py-3.5">
                    <span className="text-black/40">openstatus.co/</span>
                    <input value={handle} onChange={(event) => { setHandleTouched(true); setHandle(event.target.value); }} placeholder="yourbusiness" className="min-w-[140px] flex-1 bg-transparent font-medium outline-none" />
                    <span className={`ml-2 font-mono text-[9px] font-bold uppercase ${handleState === 'free' ? 'text-[#2F6B3B]' : handleState === 'taken' ? 'text-[#C4453F]' : 'text-black/35'}`}>
                      {handleState === 'checking' ? 'Checking...' : handleState === 'free' ? 'Available' : handleState === 'taken' ? handleReason || 'Taken' : ''}
                    </span>
                  </div>
                </label>
              </div>

              {error ? <p className="mt-4 border-2 border-black bg-[#F8AE9D] p-4 text-sm">{error}</p> : null}
              <button onClick={saveBasics} disabled={saving || !canContinue} className="mt-7 flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-35">
                {saving ? 'Saving...' : 'Claim this link'} <span>→</span>
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-9">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">The normal week</p>
              <h1 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">Set regular<br /><span className="text-[#2F6B3B]">hours once.</span></h1>
              <p className="mt-5 max-w-xl text-lg text-black/60">Temporary changes sit on top of these hours, then disappear automatically when they are over.</p>

              <div className="mt-8 divide-y border-2 border-black bg-white">
                {DAYS.map((day, index) => (
                  <div key={day} className="flex flex-wrap items-center gap-3 p-3.5 sm:flex-nowrap">
                    <span className="w-12 shrink-0 font-mono text-[10px] font-bold uppercase">{day.slice(0, 3)}</span>
                    {rows[index].closed ? (
                      <span className="flex-1 text-sm text-black/40">Closed</span>
                    ) : (
                      <div className="flex flex-1 items-center gap-2">
                        <input aria-label={`${day} opening time`} type="time" value={rows[index].open} onChange={(event) => { const next = [...rows]; next[index] = { ...next[index], open: event.target.value }; setRows(next); }} className="min-w-0 flex-1 border border-black/25 px-2 py-1.5 text-sm" />
                        <span className="text-black/35">to</span>
                        <input aria-label={`${day} closing time`} type="time" value={rows[index].close} onChange={(event) => { const next = [...rows]; next[index] = { ...next[index], close: event.target.value }; setRows(next); }} className="min-w-0 flex-1 border border-black/25 px-2 py-1.5 text-sm" />
                      </div>
                    )}
                    <button onClick={() => { const next = [...rows]; next[index] = { ...next[index], closed: !next[index].closed }; setRows(next); }} className="border border-black px-3 py-1.5 font-mono text-[9px] font-bold uppercase hover:bg-[#F4F1E8]">
                      {rows[index].closed ? 'Open' : 'Close'}
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => { const monday = rows[1]; setRows(rows.map((row, index) => index === 1 ? row : { ...monday })); }} className="mt-3 text-sm font-medium underline underline-offset-4">Use Monday for the whole week</button>

              {error ? <p className="mt-4 border-2 border-black bg-[#F8AE9D] p-4 text-sm">{error}</p> : null}
              <button onClick={saveHours} disabled={saving} className="mt-7 flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-35">
                {saving ? 'Saving...' : 'Save regular hours'} <span>→</span>
              </button>
              <button onClick={() => setStep(1)} className="mt-3 w-full py-2 text-sm text-black/50 hover:text-black">Back</button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-9">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">What customers see</p>
              <h1 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">Make the page<br /><span className="text-[#2F6B3B]">feel like you.</span></h1>
              <p className="mt-5 max-w-xl text-lg text-black/60">Add your photos and only the actions customers actually need. The preview updates as you edit.</p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className={`group block cursor-pointer border-2 border-black bg-white p-4 hover:bg-[#A7E348]/20 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file, 'avatar');
                      event.target.value = '';
                    }}
                  />
                  <span className="block text-sm font-bold">Logo or profile image</span>
                  <span className="mt-4 flex items-center gap-3">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-black bg-[#F4F1E8]">
                      {avatarUrl ? <img src={avatarUrl} alt="Current logo" className="h-full w-full object-cover" /> : <Keyhole size={26} />}
                    </span>
                    <span>
                      <span className="block font-bold underline underline-offset-4">{uploading === 'avatar' ? 'Uploading...' : avatarUrl ? 'Replace image' : 'Choose image'}</span>
                      <span className="mt-1 block text-xs text-black/45">Square works best</span>
                    </span>
                  </span>
                </label>

                <label className={`group block cursor-pointer border-2 border-black bg-white p-4 hover:bg-[#A7E348]/20 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadImage(file, 'header');
                      event.target.value = '';
                    }}
                  />
                  <span className="block text-sm font-bold">Cover image</span>
                  <span className="mt-4 block">
                    <span className="flex h-16 w-full items-center justify-center overflow-hidden border-2 border-black bg-[#2F6B3B]">
                      {headerUrl ? <img src={headerUrl} alt="Current cover" className="h-full w-full object-cover" /> : <span className="font-mono text-[9px] font-bold uppercase text-white/70">Add cover</span>}
                    </span>
                    <span className="mt-2 block font-bold underline underline-offset-4">{uploading === 'header' ? 'Uploading...' : headerUrl ? 'Replace image' : 'Choose image'}</span>
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-black/45">JPG, PNG, or WebP · maximum 5 MB</p>

              <div className="mt-8 border-t-2 border-black pt-6">
                <h2 className="text-xl font-bold uppercase">Quick links</h2>
                <p className="mt-1 text-sm text-black/50">Choose what belongs on your page. Leave everything else off.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESETS.filter((preset) => !links.some((link) => link.label === preset)).map((preset) => (
                    <button key={preset} onClick={() => setLinks([...links, { label: preset, url: '' }])} className="border-2 border-black bg-white px-3 py-2 text-sm font-medium hover:bg-[#A7E348]">+ {preset}</button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {links.map((link, index) => (
                    <div key={`${link.label}-${index}`} className="border-2 border-black bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold">{link.label}</span>
                        <button onClick={() => setLinks(links.filter((_, itemIndex) => itemIndex !== index))} className="font-mono text-[9px] font-bold uppercase text-black/45 hover:text-[#C4453F]">Remove</button>
                      </div>
                      <input value={link.url} onChange={(event) => { const next = [...links]; next[index] = { ...next[index], url: event.target.value }; setLinks(next); }} placeholder="https://" className="mt-2 w-full border border-black/20 bg-[#F4F1E8] px-3 py-2 text-sm outline-none focus:border-black" />
                    </div>
                  ))}
                </div>
              </div>

              {error ? <p className="mt-4 border-2 border-black bg-[#F8AE9D] p-4 text-sm">{error}</p> : null}
              <button onClick={saveAppearance} disabled={saving} className="mt-7 flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-35">
                {saving ? 'Saving...' : 'Save page'} <span>→</span>
              </button>
              <button onClick={() => setStep(2)} className="mt-3 w-full py-2 text-sm text-black/50 hover:text-black">Back</button>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-9">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">Last step · optional</p>
              <h1 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">Connect<br /><span className="text-[#2F6B3B]">Instagram.</span></h1>
              <p className="mt-5 max-w-xl text-lg text-black/60">When a post mentions changed hours, a closure, or another visit-changing detail, OpenStatus prepares the update for you to approve.</p>

              <div className="mt-8 border-2 border-black bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-bold">Instagram Business or Creator</p>
                    <p className="mt-1 text-sm text-black/50">Must be linked to a Facebook Page. Read-only access.</p>
                  </div>
                  {igHandle ? <span className="border-2 border-black bg-[#A7E348] px-3 py-2 font-mono text-[9px] font-bold uppercase">@{igHandle} connected</span> : null}
                </div>
              </div>

              {!igHandle ? (
                <button onClick={connectInstagram} disabled={saving} className="mt-4 flex min-h-14 w-full items-center justify-between border-2 border-black bg-[#A7E348] px-5 font-bold uppercase hover:bg-white disabled:opacity-35">
                  {saving ? 'Opening Meta...' : 'Connect Instagram'} <span>↗</span>
                </button>
              ) : null}

              <div className="mt-6 border-l-4 border-[#2F6B3B] pl-4 text-sm text-black/60">
                OpenStatus never posts to Instagram and never changes your public status without your approval.
              </div>
              {error ? <p className="mt-4 border-2 border-black bg-[#F8AE9D] p-4 text-sm">{error}</p> : null}

              <button onClick={finish} className="mt-7 flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black">
                {igHandle ? 'Finish setup' : 'Finish without Instagram'} <span>→</span>
              </button>
              <button onClick={() => setStep(3)} className="mt-3 w-full py-2 text-sm text-black/50 hover:text-black">Back</button>
            </div>
          ) : null}
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-black/45"><span>Live preview</span><span>{pageUrl}</span></div>
            <PagePreview name={name} tagline={tagline} avatarUrl={avatarUrl} headerUrl={headerUrl} rows={rows} links={previewLinks} />
            <p className="mt-5 text-sm leading-relaxed text-black/50">Customers see the current answer first. Your images, hours, and quick links stay secondary and easy to scan.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
