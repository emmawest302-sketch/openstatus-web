'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Keyhole({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="khs">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="#2E7D5B" mask="url(#khs)" />
    </svg>
  );
}

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
        router.push('/setup');
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
    <div className="min-h-screen bg-white text-[#1A1A18] flex items-center justify-center p-6" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="w-full max-w-sm">
        <a href="/" className="inline-flex items-center gap-2.5 mb-8">
          <Keyhole />
          <span className="text-lg font-bold tracking-[0.02em]">OPENSTATUS</span>
        </a>

        <h1 className="text-3xl font-bold tracking-tight">Get started free</h1>
        <p className="mt-2 text-[#6C6A62]">
          Your live status page takes about five minutes to set up, once.
        </p>

        <form onSubmit={handleSignup} className="mt-7 space-y-3">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            className="w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password, at least 6 characters"
            minLength={6}
            className="w-full px-4 py-3 rounded-2xl bg-[#F5F7F5] placeholder-[#9B998F] focus:outline-none focus:ring-2 focus:ring-[#2E7D5B]/30"
            required
          />

          {error ? <p className="text-sm text-[#C4453F]">{error}</p> : null}
          {notice ? <p className="text-sm text-[#2E7D5B]">{notice}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#1A1A18] text-white font-medium hover:bg-[#2E7D5B] disabled:opacity-40 transition"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-[#6C6A62]">
          Already have an account?{' '}
          <a href="/login" className="text-[#2E7D5B] underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
