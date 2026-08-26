'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#0B0B0B] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <a href="/" className="inline-flex items-center gap-2.5 mb-8">
          <svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">
            <mask id="khl">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="50" cy="42" r="13" fill="#000" />
              <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
            </mask>
            <circle cx="50" cy="50" r="48" fill="#1D9E75" mask="url(#khl)" />
          </svg>
          <span className="text-lg font-medium tracking-tight">OpenStatus</span>
        </a>

        <h1 className="text-3xl font-medium tracking-tighter">Welcome back</h1>
        <p className="mt-2 text-[#5F5E5A]">Sign in to your account.</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAE7DF] placeholder-[#9C9A93] focus:outline-none focus:border-[#1D9E75]"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAE7DF] placeholder-[#9C9A93] focus:outline-none focus:border-[#1D9E75]"
            required
          />

          {error ? <p className="text-sm text-[#A32D2D]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#0B0B0B] text-white font-medium hover:bg-[#1D9E75] disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#5F5E5A]">
          No account yet?{' '}
          <a href="/signup" className="text-[#0F6E56] underline">
            Get started
          </a>
        </p>
      </div>
    </div>
  );
}
