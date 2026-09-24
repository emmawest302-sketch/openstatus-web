'use client';

import Link from 'next/link';
import OpenStatusMark from '@/components/openstatus-mark';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.97.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74s1.78.74 3 .72c1.24-.02 2.02-1.13 2.78-2.24.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.41-3.69zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.52 2.69-1.27z"/>
    </svg>
  );
}

/**
 * Apple Sign In is off until it is configured.
 *
 * Meta lived here and never worked: the button was wired to the provider but
 * nothing had been set up behind it, so every tap ended at a Supabase error.
 * Rather than repeat that with Apple, the button only renders once
 * NEXT_PUBLIC_APPLE_AUTH is set to "1", which is the signal that the provider
 * has actually been turned on in Supabase with a real Apple Services ID. An
 * auth button that does not authenticate is worse than one less option.
 */
const APPLE_ENABLED = process.env.NEXT_PUBLIC_APPLE_AUTH === '1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  // /auth/callback redirects here with ?error=oauth when a social sign-in
  // fails. Nothing read it, so the user landed on a clean form with no idea
  // what had happened and no reason not to try the same button again.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('error');
    if (reason === 'oauth') {
      setError('That sign-in didn\u2019t complete. Try again, or use your email and password.');
    }
  }, []);

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('user_id', session.user.id)
        .maybeSingle();
      router.replace(biz?.slug ? '/builder' : '/setup');
    })();
  }, [router]);

  const busy = loading || oauthLoading !== null;

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider);
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed');
      setOauthLoading(null);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // /dashboard is a permanent redirect to /builder in next.config, so this
      // was a 308 hop on every single sign-in.
      router.push('/builder');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-2xl border border-[#EBEBEA] bg-white px-4 py-3.5 text-[14px] text-[#0A0A0A] outline-none transition placeholder:text-[#858585] focus:border-[#0A0A0A]/40 focus:ring-4 focus:ring-[#0A0A0A]/10';

  const btnBase =
    'w-full flex items-center justify-center gap-3 py-[14px] rounded-full text-[14px] font-semibold transition-all disabled:opacity-50';

  return (
    <main
      className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#F7F7F5', fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}
    >
      {/* Mark / wordmark */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, textDecoration: 'none' }}>
        <OpenStatusMark size={26}/>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>OpenStatus</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            color: '#0A0A0A',
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            fontFamily: 'var(--font-poppins), system-ui, sans-serif',
          }}>
            Welcome back
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: '#858585', lineHeight: 1.5 }}>
            Sign in to your OpenStatus account.
          </p>
        </div>

        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={() => handleOAuth('google')}
            disabled={busy}
            className={btnBase}
            style={{ background: '#0A0A0A', color: '#FFFFFF' }}
          >
            <GoogleLogo />
            {oauthLoading === 'google' ? 'Opening…' : 'Continue with Google'}
          </button>

          {APPLE_ENABLED && (
          <button
            onClick={() => handleOAuth('apple')}
            disabled={busy}
            className={btnBase}
            style={{ background: '#0A0A0A', color: '#FFFFFF' }}
          >
            <AppleLogo />
            {oauthLoading === 'apple' ? 'Opening…' : 'Continue with Apple'}
          </button>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#EBEBEA' }}/>
            <span style={{ fontSize: 11, color: '#858585', fontWeight: 600, letterSpacing: '0.06em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#EBEBEA' }}/>
          </div>

          {/* Email */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={inputCls}
              required
            />

            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <Link href="/forgot-password" style={{ fontSize: 12.5, color: '#858585', textDecoration: 'none' }}>
                Forgot your password?
              </Link>
            </div>

            {error && (
              <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={btnBase}
              style={{ background: '#0A0A0A', color: '#FFFFFF' }}
            >
              {loading ? 'Signing in…' : 'Log in →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#858585', paddingTop: 8 }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ fontWeight: 600, color: '#292926', textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
