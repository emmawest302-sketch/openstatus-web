'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'var(--font-poppins), system-ui, sans-serif',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.03) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>OpenStatus</span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px) saturate(120%)',
          WebkitBackdropFilter: 'blur(24px) saturate(120%)',
          borderRadius: 28,
          padding: '40px 36px',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          {sent ? (
            /* ── Success state ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <span style={{ fontSize: 24 }}>✉️</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF', marginBottom: 10 }}>
                Check your inbox
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 28 }}>
                We sent a password reset link to <strong style={{ color: 'rgba(255,255,255,0.90)' }}>{email}</strong>.
                Check your spam folder if it doesn&apos;t arrive within a minute.
              </p>
              <Link href="/" style={{
                display: 'block', textAlign: 'center',
                padding: '14px', borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                color: '#FFFFFF',
                fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.20)',
              }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', marginBottom: 10 }}>
                Account recovery
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: 8 }}>
                Forgot your password?
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55, marginBottom: 28 }}>
                Enter your email and we&apos;ll send you a link to reset it.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', marginBottom: 7 }}>Email address</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '13px 16px', borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.20)',
                      background: 'rgba(255,255,255,0.08)',
                      fontSize: 14, color: '#FFFFFF', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </label>

                {error && (
                  <p style={{ background: '#FEE2E2', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#B91C1C', margin: 0 }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '15px 20px', borderRadius: 999,
                    background: loading ? 'rgba(255,255,255,0.15)' : '#FFFFFF',
                    color: loading ? 'rgba(255,255,255,0.60)' : '#0A0A0A',
                    fontSize: 15, fontWeight: 700, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{loading ? 'Sending…' : 'Send reset link'}</span>
                  {!loading && <span style={{ fontSize: 18 }}>→</span>}
                </button>
              </form>

              <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
                Remember it?{' '}
                <Link href="/" style={{ color: 'rgba(255,255,255,0.80)', fontWeight: 600, textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
