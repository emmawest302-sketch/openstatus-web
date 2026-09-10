'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Result = Record<string, unknown> | null;

export default function GoogleStatus() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sign in first');
      const res = await fetch('/api/google/locations', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const body = await res.json();
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRunning(false);
    }
  };

  const ok = result && result.ok === true;
  const stored = result && typeof result.stored === 'string' ? result.stored : null;
  const hint = result && typeof result.hint === 'string' ? result.hint : null;

  return (
    <div
      className="min-h-screen bg-white text-[#1A1A18] flex items-center justify-center p-6"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">Google connection</h1>
        <p className="mt-2 text-[#6C6A62]">
          Checks whether we can reach your Business Profile yet, and finds your
          location if we can.
        </p>

        <button
          onClick={run}
          disabled={running}
          className="mt-6 w-full py-3.5 rounded-full bg-[#2E7D5B] text-white font-medium hover:bg-[#256349] disabled:opacity-40 transition"
        >
          {running ? 'Checking...' : 'Check now'}
        </button>

        {error ? <p className="mt-4 text-sm text-[#C4453F]">{error}</p> : null}

        {stored ? (
          <div className="mt-5 rounded-2xl bg-[#E2EFE7] px-5 py-4">
            <p className="font-medium text-[#2E7D5B]">Location found and saved</p>
            <p className="mt-1 text-sm text-[#4A4842] break-all">{stored}</p>
          </div>
        ) : null}

        {hint ? (
          <div className="mt-3 rounded-2xl bg-[#FBF0DC] px-5 py-4">
            <p className="text-sm text-[#8A5A11]">{hint}</p>
          </div>
        ) : null}

        {result ? (
          <pre className="mt-4 rounded-2xl bg-[#F5F7F5] p-4 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}

        {ok && !stored && !hint ? (
          <p className="mt-3 text-sm text-[#6C6A62]">
            Reached Google, but no location was stored.
          </p>
        ) : null}

        <a
          href="/dashboard"
          className="mt-5 block text-center py-3.5 rounded-full border border-black/15 font-medium hover:border-black/50 transition"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
