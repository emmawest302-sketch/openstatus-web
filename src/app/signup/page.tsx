'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── LOGOS ────────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MetaLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

const STEPS = ['CREATE ACCOUNT', 'BUSINESS INFO', 'BUILD YOUR LINK'] as const;

function ProgressBar({ current = 0 }: { current?: number }) {
  return (
    <div className="flex items-center gap-0 w-full max-w-md mx-auto">
      {STEPS.map((label, i) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1.5 relative">
          {/* connector line left */}
          {i > 0 && (
            <div
              className="absolute left-0 top-[7px] w-1/2 h-0.5"
              style={{ background: i <= current ? '#111' : '#D1D5DB' }}
            />
          )}
          {/* connector line right */}
          {i < STEPS.length - 1 && (
            <div
              className="absolute right-0 top-[7px] w-1/2 h-0.5"
              style={{ background: i < current ? '#111' : '#D1D5DB' }}
            />
          )}
          {/* dot */}
          <div
            className="relative z-10 w-3.5 h-3.5 rounded-full border-2 transition-colors"
            style={{
              background: i <= current ? '#111' : 'white',
              borderColor: i <= current ? '#111' : '#D1D5DB',
            }}
          />
          {/* label */}
          <span
            className="text-[9px] font-bold tracking-[0.12em] text-center leading-tight"
            style={{ color: i <= current ? '#111' : '#9CA3AF' }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'meta' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const busy = loading || oauthLoading !== null;

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider === 'google' ? 'google' : 'meta');
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-up failed');
      setOauthLoading(null);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName.trim() } },
      });
      if (signupError) throw signupError;
      if (data.session) router.push('/setup');
      else setNotice('Check your email to confirm your account, then sign in.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-2xl border border-black/12 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-black/30 focus:border-black/30 focus:ring-4 focus:ring-black/6';

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: '#F5F4F0', fontFamily: 'var(--font-poppins)' }}
    >
      {/* ── PROGRESS BAR ── */}
      <div className="w-full px-6 pt-8 pb-4">
        <ProgressBar current={0} />
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* wordmark */}
        <Link href="/" className="text-[#111] font-bold text-lg tracking-tight mb-10 select-none">
          OpenStatus
        </Link>

        {/* headline */}
        <div className="text-center mb-10 max-w-sm">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#111] tracking-[-0.03em] leading-[1.08]">
            Create your<br />OpenStatus
          </h1>
          <p className="mt-4 text-[#111]/45 text-base leading-relaxed">
            Your business. One link. Always up to date.
          </p>
        </div>

        {/* auth buttons / email form */}
        <div className="w-full max-w-sm space-y-3">

          {/* Google — lime green primary */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-[#AADF1E] text-[#111] font-semibold text-sm py-4 rounded-full hover:bg-[#99cf0e] transition-colors disabled:opacity-50 shadow-sm"
          >
            <GoogleLogo />
            {oauthLoading === 'google' ? 'Opening…' : 'Continue with Google'}
          </button>

          {/* Meta — outlined */}
          <button
            onClick={() => handleOAuth('facebook')}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white border border-black/12 text-[#111] font-semibold text-sm py-4 rounded-full hover:bg-black/4 transition-colors disabled:opacity-50"
          >
            <MetaLogo />
            {oauthLoading === 'meta' ? 'Opening…' : 'Continue with Meta'}
          </button>

          {/* Email — outlined, toggles form */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white border border-black/12 text-[#111] font-semibold text-sm py-4 rounded-full hover:bg-black/4 transition-colors disabled:opacity-50"
            >
              <EmailIcon />
              Continue with Email
            </button>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-3 pt-1">
              <input
                type="text"
                autoComplete="organization"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business name"
                className={inputCls}
                required
              />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className={inputCls}
                required
              />
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ characters)"
                minLength={6}
                className={inputCls}
                required
              />

              {error && (
                <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800" aria-live="polite">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-[#111] text-white font-semibold text-sm py-4 rounded-full hover:bg-black transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Create account →'}
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-center text-xs text-black/35 hover:text-black/55 transition-colors pt-1"
              >
                ← Back to sign-up options
              </button>
            </form>
          )}

          {/* sign-in link */}
          <p className="text-center text-sm text-[#111]/40 pt-2">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#111] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
