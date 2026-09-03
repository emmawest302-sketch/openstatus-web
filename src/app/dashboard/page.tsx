'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type QuickLink = { label: string; url: string; note?: string };

type Business = {
  id: string;
  name: string;
  tagline: string | null;
  slug: string | null;
  avatar_url: string | null;
  header_url: string | null;
  links: QuickLink[] | null;
  instagram_handle: string | null;
  instagram_account_id: string | null;
};

type Post = {
  id: string;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
};

type StatusUpdate = {
  id: string;
  kind: string;
  headline: string;
  detail: string | null;
  reason: string | null;
  closes_at: string | null;
  confidence: number | null;
  status: 'needs_review' | 'active';
  source: string | null;
  created_at: string;
  expires_at: string | null;
};

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="dashboard-keyhole">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#dashboard-keyhole)" />
    </svg>
  );
}

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function formatTime(value: string | null) {
  if (!value) return '';
  const [hourText, minute] = value.split(':');
  let hour = Number(hourText);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${meridiem}`;
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const [connect, setConnect] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [connectedHandle, setConnectedHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      setConnect(query.get('connect'));
      setReason(query.get('reason'));
      setConnectedHandle(query.get('handle'));
      setWelcome(query.get('welcome') === '1');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const load = useCallback(async () => {
    setError('');
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/login');
      return;
    }
    setEmail(userData.user.email ?? null);

    const { data: biz, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, tagline, slug, avatar_url, header_url, links, instagram_handle, instagram_account_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (businessError) {
      setError(businessError.message);
      setLoading(false);
      return;
    }
    if (!biz?.slug) {
      router.replace('/setup');
      return;
    }

    setBusiness(biz as Business);

    const [{ data: postRows }, sessionResult] = await Promise.all([
      supabase
        .from('posts')
        .select('id, caption, permalink, posted_at')
        .eq('business_id', biz.id)
        .order('posted_at', { ascending: false })
        .limit(3),
      supabase.auth.getSession(),
    ]);

    setPosts((postRows ?? []) as Post[]);

    const token = sessionResult.data.session?.access_token;
    if (token) {
      const response = await fetch('/api/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (response.ok) setUpdates(body.updates ?? []);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pending = useMemo(
    () => updates.filter((update) => update.status === 'needs_review' && (!update.expires_at || new Date(update.expires_at) > new Date())),
    [updates]
  );
  const active = useMemo(
    () => updates.filter((update) => update.status === 'active' && (!update.expires_at || new Date(update.expires_at) > new Date())),
    [updates]
  );

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired, sign in again');

      const response = await fetch('/api/auth/meta/start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ returnTo: 'dashboard' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not start connection');
      window.location.href = body.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong');
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSyncNote('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired, sign in again');
      const headers = { Authorization: `Bearer ${token}` };

      const syncResponse = await fetch('/api/posts/sync', { method: 'POST', headers });
      const syncBody = await syncResponse.json();
      if (!syncResponse.ok) throw new Error(syncBody.error ?? 'Instagram check failed');

      const analyzeResponse = await fetch('/api/posts/analyze', { method: 'POST', headers });
      const analyzeBody = await analyzeResponse.json();
      if (!analyzeResponse.ok) throw new Error(analyzeBody.error ?? 'Could not read the new posts');

      const suggestions = analyzeBody.suggested ?? 0;
      setSyncNote(
        suggestions > 0
          ? `Found ${suggestions} change${suggestions === 1 ? '' : 's'} for you to review.`
          : `Checked ${syncBody.fetched ?? 0} posts. Nothing needs your attention.`
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Instagram check failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDecision = async (id: string, action: 'approve' | 'dismiss') => {
    setDecisionId(id);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired, sign in again');
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not update status');
      setUpdates((current) => current.filter((update) => update.id !== id));
      if (action === 'approve') {
        setSyncNote('Published. Your live page now shows this change.');
        await load();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update status');
    } finally {
      setDecisionId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const copyLink = async () => {
    if (!business?.slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/${business.slug}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1E8]">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em]">Opening your dashboard...</p>
      </div>
    );
  }

  const instagramConnected = Boolean(business?.instagram_account_id);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#0A0A0A]">
      <div className="border-b-2 border-black bg-[#A7E348] px-4 py-2 text-center font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
        Your link is live · You approve every change
      </div>

      <header className="border-b-2 border-black bg-[#F4F1E8]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Keyhole />
            <span className="font-bold tracking-[-0.03em]">OPENSTATUS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/setup?step=1" className="border-2 border-black px-3 py-2 text-xs font-bold uppercase hover:bg-white md:px-4">
              Edit page
            </Link>
            <button onClick={handleLogout} className="hidden px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] hover:underline sm:block">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 py-7 md:px-8 md:py-10">
        {welcome ? (
          <div className="mb-5 border-2 border-black bg-[#A7E348] p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Setup complete</p>
            <p className="mt-1 text-xl font-bold">Your OpenStatus link is ready to share.</p>
          </div>
        ) : null}

        {connect === 'ok' ? (
          <div className="mb-5 border-2 border-black bg-[#A7E348] p-5 font-medium">
            Instagram connected to @{connectedHandle}. Press “Check Instagram” to look for useful changes.
          </div>
        ) : null}

        {connect === 'no_instagram' || connect === 'error' ? (
          <div className="mb-5 border-2 border-black bg-[#F8AE9D] p-5">
            Could not connect Instagram. {reason}
          </div>
        ) : null}

        {error ? <div className="mb-5 border-2 border-black bg-[#F8AE9D] p-4">{error}</div> : null}
        {syncNote ? <div className="mb-5 border-2 border-black bg-white p-4">{syncNote}</div> : null}

        <section className="grid border-2 border-black bg-black text-white lg:grid-cols-[1.35fr_0.65fr]">
          <div className="border-b-2 border-white/30 p-6 md:p-9 lg:border-b-0 lg:border-r-2">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">Your live link</p>
            <h1 className="mt-4 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-6xl">
              {business?.name}
            </h1>
            <p className="mt-3 max-w-xl text-white/60">{business?.tagline || 'Add a short description so customers know they are in the right place.'}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${business?.slug}`} target="_blank" className="group flex min-h-14 flex-1 items-center justify-between border-2 border-white bg-white px-4 font-bold uppercase text-black hover:border-[#A7E348] hover:bg-[#A7E348]">
                View live page <Arrow />
              </Link>
              <button onClick={copyLink} className="min-h-14 border-2 border-white px-5 font-bold uppercase hover:border-[#A7E348] hover:bg-[#A7E348] hover:text-black">
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-between p-6 md:p-9">
            <div>
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#A7E348]">
                <span className="h-2 w-2 rounded-full bg-[#A7E348]" /> Live
              </span>
              <p className="mt-4 break-all text-xl font-bold">openstatus.co/{business?.slug}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/55">Put this in your Instagram bio, website, or QR code.</p>
            </div>
            <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">Signed in as {email}</p>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="border-2 border-black bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black p-5 md:p-6">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">Needs you</p>
                <h2 className="mt-1 text-2xl font-bold uppercase tracking-[-0.035em]">Instagram suggestions</h2>
              </div>
              {pending.length > 0 ? (
                <span className="border-2 border-black bg-[#A7E348] px-3 py-1.5 font-mono text-[10px] font-bold uppercase">{pending.length} to review</span>
              ) : null}
            </div>

            {pending.length > 0 ? (
              <div className="divide-y-2 divide-black">
                {pending.map((update) => (
                  <article key={update.id} className="p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="max-w-xl">
                        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-black/45">
                          Detected from Instagram · {relativeTime(update.created_at)}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold tracking-[-0.035em]">{update.headline}</h3>
                        {update.detail ? <p className="mt-1 text-black/65">{update.detail}</p> : null}
                        {update.closes_at ? <p className="mt-1 font-medium">Until {formatTime(update.closes_at)}</p> : null}
                        {update.reason ? <p className="mt-1 text-sm text-black/50">Reason: {update.reason}</p> : null}
                      </div>
                      {typeof update.confidence === 'number' ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-black/40">{Math.round(update.confidence * 100)}% match</span>
                      ) : null}
                    </div>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <button onClick={() => handleDecision(update.id, 'approve')} disabled={decisionId === update.id} className="min-h-12 border-2 border-black bg-black px-4 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-50">
                        {decisionId === update.id ? 'Working...' : 'Approve & publish'}
                      </button>
                      <button onClick={() => handleDecision(update.id, 'dismiss')} disabled={decisionId === update.id} className="min-h-12 border-2 border-black px-4 font-bold uppercase hover:bg-[#F4F1E8] disabled:opacity-50">
                        Not a change
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-7 md:p-10">
                <p className="text-xl font-bold">Nothing needs approval.</p>
                <p className="mt-2 max-w-lg text-black/55">When a connected Instagram post mentions a closure, unusual hours, or another visit-changing detail, it appears here first.</p>
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="border-2 border-black bg-[#A7E348] p-5 md:p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Instagram</p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-[-0.035em]">
                {instagramConnected ? `@${business?.instagram_handle}` : 'Not connected'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-black/65">
                {instagramConnected
                  ? 'We read recent posts for useful changes. Nothing is published until you approve it.'
                  : 'Connect a Business or Creator account linked to a Facebook page.'}
              </p>
              {instagramConnected ? (
                <button onClick={handleSync} disabled={syncing} className="mt-5 flex min-h-12 w-full items-center justify-between border-2 border-black bg-black px-4 font-bold uppercase text-white hover:bg-white hover:text-black disabled:opacity-50">
                  {syncing ? 'Checking posts...' : 'Check Instagram'} <Arrow />
                </button>
              ) : (
                <button onClick={handleConnect} disabled={connecting} className="mt-5 flex min-h-12 w-full items-center justify-between border-2 border-black bg-black px-4 font-bold uppercase text-white hover:bg-white hover:text-black disabled:opacity-50">
                  {connecting ? 'Opening Meta...' : 'Connect Instagram'} <Arrow />
                </button>
              )}
            </section>

            <section className="border-2 border-black bg-white">
              <div className="border-b-2 border-black p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">Page setup</p>
              </div>
              {[
                ['Business & link', business?.slug ? 'Ready' : 'Finish', '/setup?step=1'],
                ['Regular hours', 'Edit', '/setup?step=2'],
                ['Look & quick links', `${business?.links?.length ?? 0} links`, '/setup?step=3'],
                ['Instagram', instagramConnected ? 'Connected' : 'Connect', '/setup?step=4'],
              ].map(([label, value, href]) => (
                <Link key={label} href={href} className="flex items-center justify-between border-b border-black/20 px-5 py-4 last:border-b-0 hover:bg-[#F4F1E8]">
                  <span className="font-medium">{label}</span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-black/45">{value} →</span>
                </Link>
              ))}
            </section>
          </div>
        </div>

        {active.length > 0 ? (
          <section className="mt-5 border-2 border-black bg-[#2F6B3B] p-5 text-white md:p-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Live right now</p>
            {active.map((update) => (
              <div key={update.id} className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold uppercase tracking-[-0.04em]">{update.headline}</h2>
                  {update.detail ? <p className="mt-1 text-white/70">{update.detail}</p> : null}
                </div>
                <Link href={`/${business?.slug}`} target="_blank" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] underline underline-offset-4">View public page ↗</Link>
              </div>
            ))}
          </section>
        ) : null}

        {posts.length > 0 ? (
          <details className="mt-5 border-2 border-black bg-white">
            <summary className="cursor-pointer list-none p-5 font-bold uppercase">Recently checked posts <span className="float-right">+</span></summary>
            <ul className="divide-y border-t-2 border-black">
              {posts.map((post) => (
                <li key={post.id} className="p-5 text-sm text-black/60">
                  {post.caption?.slice(0, 180) || 'No caption'}
                  {post.permalink ? <a href={post.permalink} target="_blank" rel="noreferrer" className="ml-2 text-black underline">View ↗</a> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    </div>
  );
}
