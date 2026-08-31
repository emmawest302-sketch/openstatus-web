'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Business = {
  id: string;
  name: string;
  instagram_handle: string | null;
  instagram_account_id: string | null;
};

type Post = {
  id: string;
  caption: string | null;
  permalink: string | null;
  posted_at: string | null;
};

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncNote, setSyncNote] = useState('');
  const [connect, setConnect] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setConnect(q.get('connect'));
    setReason(q.get('reason'));
    setHandle(q.get('handle'));
  }, []);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/login');
      return;
    }
    setEmail(userData.user.email ?? null);

    const { data: biz } = await supabase
      .from('businesses')
      .select('id, name, instagram_handle, instagram_account_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    setBusiness(biz ?? null);

    if (biz) {
      const { data: rows } = await supabase
        .from('posts')
        .select('id, caption, permalink, posted_at')
        .eq('business_id', biz.id)
        .order('posted_at', { ascending: false })
        .limit(25);
      setPosts(rows ?? []);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConnect = async () => {
    setConnecting(true);
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
      if (!res.ok) throw new Error(body.error ?? 'Could not start connection');

      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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

      const res = await fetch('/api/posts/sync', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Sync failed');

      setSyncNote('Read ' + body.fetched + ' posts, ' + body.stored + ' new.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFAF7] flex items-center justify-center">
        <p className="text-[#5F5E5A]">Loading...</p>
      </div>
    );
  }

  const igConnected = Boolean(business?.instagram_account_id);

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#0B0B0B]">
      <header className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">
            <mask id="khd">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="50" cy="42" r="13" fill="#000" />
              <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
            </mask>
            <circle cx="50" cy="50" r="48" fill="#1D9E75" mask="url(#khd)" />
          </svg>
          <div>
            <p className="font-medium tracking-tight leading-tight">
              {business?.name ?? 'OpenStatus'}
            </p>
            <p className="text-xs text-[#9C9A93]">{email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm rounded-full border border-[#EAE7DF] hover:border-[#0B0B0B] transition"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16 space-y-4">
        {connect === 'ok' ? (
          <div className="rounded-2xl bg-[#E1F5EE] p-5">
            <p className="text-[#0F6E56]">Connected to @{handle}.</p>
          </div>
        ) : null}

        {connect === 'no_instagram' ? (
          <div className="rounded-2xl bg-[#FAEEDA] p-5">
            <p className="text-[#854F0B]">{reason}</p>
          </div>
        ) : null}

        {connect === 'error' ? (
          <div className="rounded-2xl bg-[#FCEBEB] p-5">
            <p className="text-[#A32D2D]">Could not connect. {reason}</p>
          </div>
        ) : null}

        <section className="rounded-3xl bg-white border border-[#EAE7DF] p-7">
          <h2 className="text-2xl font-medium tracking-tight">
            Connected accounts
          </h2>
          <p className="mt-1 text-[#5F5E5A]">
            Connect once. We read what you post and keep your hours right.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#FBFAF7] p-4">
              <div>
                <p className="font-medium">Instagram</p>
                <p className="text-sm text-[#5F5E5A]">
                  {igConnected
                    ? '@' + business?.instagram_handle
                    : 'Business or Creator account linked to a Facebook page'}
                </p>
              </div>
              {igConnected ? (
                <span className="text-sm px-3 py-1.5 rounded-full bg-[#E1F5EE] text-[#0F6E56] whitespace-nowrap">
                  Connected
                </span>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="px-5 py-2.5 rounded-full bg-[#1D9E75] text-white font-medium hover:bg-[#0F6E56] disabled:opacity-50 transition whitespace-nowrap"
                >
                  {connecting ? 'Opening...' : 'Connect'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#FBFAF7] p-4">
              <div>
                <p className="font-medium">Google Business Profile</p>
                <p className="text-sm text-[#5F5E5A]">Where your hours land</p>
              </div>
              <span className="text-sm text-[#9C9A93] whitespace-nowrap">
                Not built yet
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#FBFAF7] p-4">
              <div>
                <p className="font-medium">Apple Business</p>
                <p className="text-sm text-[#5F5E5A]">
                  Waiting on partner approval
                </p>
              </div>
              <span className="text-sm px-3 py-1.5 rounded-full bg-[#FAEEDA] text-[#854F0B] whitespace-nowrap">
                Pending
              </span>
            </div>
          </div>

          {error ? (
            <p className="mt-5 text-sm text-[#A32D2D]">{error}</p>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white border border-[#EAE7DF] p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-medium tracking-tight">
                Recent posts
              </h2>
              <p className="mt-1 text-[#5F5E5A]">
                {igConnected
                  ? 'Read straight from Instagram. Nothing on your account is changed.'
                  : 'Connect Instagram to start reading posts.'}
              </p>
            </div>
            {igConnected ? (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-5 py-2.5 rounded-full bg-[#0B0B0B] text-white font-medium hover:bg-[#1D9E75] disabled:opacity-50 transition whitespace-nowrap"
              >
                {syncing ? 'Reading...' : 'Read posts'}
              </button>
            ) : null}
          </div>

          {syncNote ? (
            <p className="mt-4 text-sm text-[#0F6E56]">{syncNote}</p>
          ) : null}

          {posts.length > 0 ? (
            <ul className="mt-6 space-y-3">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl bg-[#FBFAF7] p-4">
                  <p className="text-sm whitespace-pre-line">
                    {p.caption && p.caption.length > 0
                      ? p.caption.slice(0, 280)
                      : 'No caption'}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[#9C9A93]">
                    <span>
                      {p.posted_at
                        ? new Date(p.posted_at).toLocaleString()
                        : 'No date'}
                    </span>
                    {p.permalink ? (
                      <a
                        href={p.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#0F6E56] underline"
                      >
                        View on Instagram
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : igConnected ? (
            <p className="mt-6 text-sm text-[#9C9A93]">
              No posts stored yet. Press Read posts.
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
