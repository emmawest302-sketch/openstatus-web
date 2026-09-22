'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);      // session from recovery link is active
  const [invalid, setInvalid] = useState(false);  // link is expired / bad
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase processes the #access_token hash automatically and emits
    // a PASSWORD_RECOVERY event when the link is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    // Fallback: if there's already a valid session (e.g. page reload after
    // recovery was processed), check for it immediately.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // If after 4 s we still have no session, the link is invalid/expired.
    const timeout = window.setTimeout(() => {
      setInvalid(true);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  // Clear the invalid timer as soon as we go ready
  useEffect(() => {
    if (ready) setInvalid(false);
  }, [ready]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords don\'t match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      // Give the user a moment to read the success message, then redirect.
      window.setTimeout(() => router.replace('/builder'), 2000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.20)',
    background: 'rgba(255,255,255,0.08)',
    fontSize: 14, color: '#FFFFFF', outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.04) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>OpenStatus</span>
          </Link>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px) saturate(120%)',
          WebkitBackdropFilter: 'blur(24px) saturate(120%)',
          borderRadius: 28,
          padding: '40px 36px',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>

          {/* ── Done ── */}
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 26,
              }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF', marginBottom: 10 }}>
                Password updated!
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>
                Taking you to your dashboard…
              </p>
            </div>

          /* ── Invalid / expired link ── */
          ) : invalid && !ready ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.30)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 26,
              }}>✕</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF', marginBottom: 10 }}>
                Link expired
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6, marginBottom: 28 }}>
                This reset link has expired or already been used. Request a new one.
              </p>
              <Link href="/forgot-password" style={{
                display: 'block', textAlign: 'center',
                padding: '14px', borderRadius: 999,
                background: '#FFFFFF', color: '#0A0A0A',
                fontSize: 14, fontWeight: 700,
                textDecoration: 'none',
              }}>
                Request a new link
              </Link>
            </div>

          /* ── Loading (waiting for Supabase to process hash) ── */
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: 14 }}>Verifying your reset link…</p>
            </div>

          /* ── New password form ── */
          ) : (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase', marginBottom: 10 }}>
                Set new password
              </p>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: 8 }}>
                Choose a new password.
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.60)', lineHeight: 1.55, marginBottom: 28 }}>
                Pick something strong — at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', marginBottom: 7 }}>New password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.80)', marginBottom: 7 }}>Confirm password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Same password again"
                    required
                    style={inputStyle}
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
                    marginTop: 4,
                  }}
                >
                  <span>{loading ? 'Updating…' : 'Set new password'}</span>
                  {!loading && <span style={{ fontSize: 18 }}>→</span>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
