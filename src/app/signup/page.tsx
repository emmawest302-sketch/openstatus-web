'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName } },
      });
      if (error) throw error;
      if (data.session) {
        router.push('/dashboard');
      } else {
        setNotice('Check your email to confirm your account, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#0B0B0B] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <a href="/" className="inline-flex items-center gap-2.5 mb-8">
          <svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">
            <mask id="khs">
              <rect width="100" height="100" fill="#fff" />
              <circle cx="50" cy="42" r="13" fill="#000" />
              <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
            </mask>
            <circle cx="50" cy="50" r="48" fill="#1D9E75" mask="url(#khs)" />
          </svg>
          <span className="text-lg font-medium tracking-tight">OpenStatus</span>
        </a>

        <h1 className="text-3xl font-medium tracking-tighter">Get started</h1>
        <p className="mt-2 text-[#5F5E5A]">
          Connect once. We keep your hours right after that.
        </p>

        <form onSubmit={handleSignup} className="mt-8 space-y-3">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAE7DF] placeholder-[#9C9A93] focus:outline-none focus:border-[#1D9E75]"
            required
          />
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
            placeholder="Password, at least 6 characters"
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-white border border-[#EAE7DF] placeholder-[#9C9A93] focus:outline-none focus:border-[#1D9E75]"
            required
          />

          {error ? <p className="text-sm text-[#A32D2D]">{error}</p> : null}
          {notice ? <p className="text-sm text-[#0F6E56]">{notice}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#1D9E75] text-white font-medium hover:bg-[#0F6E56] disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#5F5E5A]">
          Already have an account?{' '}
          <a href="/login" className="text-[#0F6E56] underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
