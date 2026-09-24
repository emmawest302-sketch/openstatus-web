'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ConnectGoogle() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setResult(q.get('google'));
    setReason(q.get('reason'));
  }, []);

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/login'); return; }
    const { data: biz } = await supabase
      .from('businesses')
      .select('id, google_location_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    setConnected(!!biz?.google_location_id);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    setWorking(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Session expired, sign in again');
      const res = await fetch('/api/auth/google/start', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not start');
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6C6A62]">Loading...</p>
      </div>
    );
  }

  const justConnected = result === 'ok' || result === 'pending';

  return (
    <div
      className="min-h-screen bg-white text-[#1A1A18] flex items-center justify-center p-6"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="w-full max-w-md">

        {/* ── Just connected: show big success state ── */}
        {justConnected ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F3FF] flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A1A18]">
              Google Business connected
            </h1>
            <p className="mt-2 text-[#6C6A62] text-sm leading-relaxed">
              {result === 'pending'
                ? reason ?? 'Connected. Hours will sync once Google approves our API access.'
                : 'Your hours will now sync to Google automatically every time you save.'}
            </p>

            <a
              href="/builder"
              className="mt-8 block w-full py-3.5 rounded-full bg-[#0A0A0A] text-white font-semibold text-center hover:bg-[#292929] transition"
            >
              Go to builder ↗
            </a>
            <a
              href="/dashboard"
              className="mt-3 block text-center py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition text-[#6C6A62]"
            >
              Back to dashboard
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">
              Connect Google Business Profile
            </h1>
            <p className="mt-2 text-[#6C6A62]">
              So when your hours change, they change where most people look.
            </p>

            {result === 'cancelled' ? (
              <div className="mt-6 rounded-2xl bg-[#F5F7F5] px-5 py-4">
                <p className="text-[#6C6A62]">Cancelled. Nothing changed.</p>
              </div>
            ) : null}

            {result === 'error' ? (
              <div className="mt-6 rounded-2xl bg-[#FCEBEB] px-5 py-4">
                <p className="text-[#C4453F]">Could not connect. {reason}</p>
              </div>
            ) : null}

            <div className="mt-6 rounded-2xl bg-[#F5F7F5] px-5 py-4">
              <p className="text-sm text-[#4A4842]">
                You will see Google&rsquo;s own permission screen. We ask only to read
                your locations and update your hours. We never post reviews, replies
                or anything else.
              </p>
            </div>

            {connected ? (
              <div className="mt-4 rounded-2xl bg-[#F5F3FF] px-5 py-4">
                <p className="text-[#0A0A0A] font-medium">Your Google listing is connected</p>
                <p className="mt-1 text-sm text-[#4A4842]">Hours changes will sync automatically.</p>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={working}
                className="mt-5 w-full py-3.5 rounded-full bg-[#0A0A0A] text-white font-medium hover:bg-[#292926] disabled:opacity-40 transition"
              >
                {working ? 'Opening Google...' : 'Connect Google'}
              </button>
            )}

            {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

            <a
              href="/dashboard"
              className="mt-3 block text-center py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition"
            >
              Back to dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
