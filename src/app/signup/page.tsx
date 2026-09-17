'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── ICONS ────────────────────────────────────────────────────────────────────

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MetaLogo() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const [showEmailForm, setShowEmailForm] = useState(false);
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
      const { data, error: signupError } = await supabase.auth.signUp({ email, password });
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
    'w-full rounded-2xl border border-[#DEDEDC] bg-white px-4 py-3.5 text-[14px] text-[#0A0A0A] outline-none transition placeholder:text-[#858585] focus:border-[#0A0A0A]/30 focus:ring-4 focus:ring-[#0A0A0A]/5';

  const btnBase =
    'w-full flex items-center justify-center gap-3 py-[14px] rounded-full text-[14px] font-semibold transition-all disabled:opacity-50';

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#F7F7F5', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Mark / wordmark */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, textDecoration: 'none' }}>
        <svg viewBox="0 0 100 100" width="26" height="26" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="#0A0A0A"/>
          <circle cx="50" cy="50" r="21" fill="#F7F7F5"/>
          <circle cx="50" cy="44" r="7.4" fill="#0A0A0A"/>
          <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#0A0A0A"/>
        </svg>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>OpenStatus</span>
      </Link>

      <div className="w-full max-w-sm">
        {/* Headline */}
        <div className="text-center mb-8">
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#0A0A0A',
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
          }}>
            Create your<br />OpenStatus
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: '#858585', lineHeight: 1.5 }}>
            Your business. One link. Always up to date.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="space-y-3">

          {/* Google — primary black */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={busy}
            className={btnBase}
            style={{ background: '#0A0A0A', color: '#F7F7F5' }}
          >
            <GoogleLogo />
            {oauthLoading === 'google' ? 'Opening…' : 'Continue with Google'}
          </button>

          {/* Meta — outlined */}
          <button
            onClick={() => handleOAuth('facebook')}
            disabled={busy}
            className={btnBase}
            style={{ background: '#fff', border: '1.5px solid #DEDEDC', color: '#0A0A0A' }}
          >
            <MetaLogo />
            {oauthLoading === 'meta' ? 'Opening…' : 'Continue with Meta'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#DEDEDC' }}/>
            <span style={{ fontSize: 11, color: '#858585', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#DEDEDC' }}/>
          </div>

          {/* Email */}
          {!showEmailForm ? (
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={busy}
              className={btnBase}
              style={{ background: '#fff', border: '1.5px solid #DEDEDC', color: '#0A0A0A' }}
            >
              <EmailIcon />
              Continue with email
            </button>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-3">
              <input
                type="email"
                autoComplete="email"
                autoFocus
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
                <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-[13px] text-amber-800">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className={btnBase}
                style={{ background: '#0A0A0A', color: '#F7F7F5' }}
              >
                {loading ? 'Creating account…' : 'Create account →'}
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                style={{ width: '100%', textAlign: 'center', fontSize: 12, color: '#858585', background: 'none', border: 'none', cursor: 'pointer', paddingTop: 4 }}
              >
                ← Back
              </button>
            </form>
          )}

          {/* Sign in link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#858585', paddingTop: 8 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ fontWeight: 600, color: '#0A0A0A', textDecoration: 'none' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
