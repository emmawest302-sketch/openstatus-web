'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ── Inline brand SVGs ─────────────────────────────────────────────────────────

function GoogleLogo({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MetaLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
    </svg>
  );
}

const PARTNERS = [
  { name: 'Instagram', svg: <svg viewBox="0 0 24 24" height="20" fill="white" aria-label="Instagram"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
  { name: 'Facebook', svg: <svg viewBox="0 0 24 24" height="20" fill="white" aria-label="Facebook"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  { name: 'Google', svg: <svg viewBox="0 0 24 24" height="18" fill="white" aria-label="Google"><text x="0" y="18" fontSize="15" fontFamily="Arial, sans-serif" fontWeight="bold" fill="white">Google</text></svg> },
  { name: 'Apple Maps', svg: (<svg viewBox="0 0 24 24" height="20" fill="none" aria-label="Apple Maps"><path d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 14 6 14s6-9.582 6-14c0-3.314-2.686-6-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" fill="white"/></svg>) },
  { name: 'DoorDash', svg: <svg viewBox="0 0 120 30" height="18" aria-label="DoorDash"><text x="0" y="22" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="800" fill="white">DOORDASH</text></svg> },
  { name: 'OpenTable', svg: <svg viewBox="0 0 120 30" height="18" aria-label="OpenTable"><text x="0" y="22" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="600" fill="white">OpenTable</text></svg> },
  { name: 'Resy', svg: <svg viewBox="0 0 60 30" height="18" aria-label="Resy"><text x="0" y="22" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="800" fill="white">RESY</text></svg> },
  { name: 'TikTok', svg: (<svg viewBox="0 0 24 24" height="20" fill="white" aria-label="TikTok"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.5a8.27 8.27 0 004.84 1.55V6.6a4.85 4.85 0 01-1.07.09z"/></svg>) },
  { name: 'Toast', svg: <svg viewBox="0 0 60 30" height="18" aria-label="Toast"><text x="0" y="22" fontSize="18" fontFamily="Arial, sans-serif" fontWeight="700" fill="white">toast</text></svg> },
];

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'meta' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const e = new URLSearchParams(window.location.search).get('error');
      if (e === 'oauth') setError('Sign-in failed. Please try again or use email/password.');
    }
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data.user) {
        const { data: business } = await supabase.from('businesses').select('slug').eq('user_id', data.user.id).maybeSingle();
        router.push(business ? '/builder' : '/setup');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider === 'google' ? 'google' : 'meta');
    setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'facebook' ? { config_id: '2027876811186222' } : undefined,
        },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed');
      setOauthLoading(null);
    }
  };

  const busy = loading || oauthLoading !== null;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '13px 16px', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.42)', background: 'rgba(255,255,255,0.10)',
    fontSize: 14, color: '#FFFFFF', outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ══════════════════════════════════════════════════════════════
          HERO — full-screen photo section
      ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0A0A0A',
        overflow: 'hidden',
      }}>
        {/* Full-bleed photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-team.jpg"
          alt="Restaurant kitchen"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: '50% 30%',
          }}
        />
        {/* Dark overlay per brand guide: rgba(0,0,0,0.28–0.35) */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.30)' }} />

        {/* ── Nav ── */}
        <header style={{
          position: 'relative', zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '16px 20px' : '22px 40px',
          maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}>
          <span style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>
            OpenStatus
          </span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 36 }}>
            {!isMobile && <>
              <a href="#product" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Product</a>
              <a href="#about" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>About</a>
              <a href="#pricing" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Pricing</a>
            </>}
            <Link href="/signup" style={{
              color: '#FFFFFF', fontSize: isMobile ? 13 : 14, fontWeight: 600, textDecoration: 'none',
              border: '1.5px solid rgba(255,255,255,0.65)',
              borderRadius: 999, padding: isMobile ? '8px 16px' : '9px 22px',
              backdropFilter: 'blur(8px)',
            }}>
              {isMobile ? 'Sign up' : 'Create account'}
            </Link>
          </nav>
        </header>

        {/* ── Hero body ── */}
        <div style={{
          position: 'relative', zIndex: 10, flex: 1,
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 460px',
          gap: isMobile ? 24 : 40, alignItems: 'center',
          maxWidth: 1280, margin: '0 auto', width: '100%',
          padding: isMobile ? '20px 20px 40px' : '20px 40px 40px', boxSizing: 'border-box',
        }}>
          {/* Left: headline */}
          <div>
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20,
            }}>
              Stay in sync
            </p>
            <h1 style={{
              fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(64px, 6.5vw, 108px)',
              lineHeight: 0.9, letterSpacing: '-0.05em',
              color: '#FFFFFF', margin: '0 0 28px',
            }}>
              Your<br />business.<br />Right now.
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.78)', fontSize: 17,
              lineHeight: 1.55, maxWidth: 420, marginBottom: 32,
            }}>
              Keep your hours, status, links, and updates current everywhere customers find you.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 500 }}>
              <span>Live status</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Page builder</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Analytics</span>
            </div>
          </div>

          {/* Right: sign-in card */}
          <div style={{
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(24px) saturate(120%)',
            WebkitBackdropFilter: 'blur(24px) saturate(120%)',
            borderRadius: 30, padding: '36px 36px 32px',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.70)', textTransform: 'uppercase', marginBottom: 10 }}>
              Sign in
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#FFFFFF', marginBottom: 6 }}>
              Open your dashboard.
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, marginBottom: 24 }}>
              Manage the live front door to your business.
            </p>

            {/* OAuth */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {(['google', 'facebook'] as const).map((p) => (
                <button key={p}
                  onClick={() => handleOAuth(p)}
                  disabled={busy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.10)',
                    backdropFilter: 'blur(12px)',
                    fontSize: 14, fontWeight: 600, color: '#FFFFFF',
                    transition: 'background 0.15s', opacity: busy ? 0.5 : 1,
                  }}
                >
                  {p === 'google' ? <GoogleLogo /> : <MetaLogo />}
                  {p === 'google'
                    ? (oauthLoading === 'google' ? 'Opening…' : 'Google')
                    : (oauthLoading === 'meta' ? 'Opening…' : 'Meta')}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.25)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.65)' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.25)' }} />
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>Email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" required style={inputStyle} />
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: 6 }}>Password</span>
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required style={inputStyle} />
              </label>

              {error && (
                <p style={{ background: '#FEE2E2', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#B91C1C' }}>{error}</p>
              )}

              <button type="submit" disabled={busy} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '15px 20px', borderRadius: 999,
                background: '#0A0A0A', color: '#FFFFFF',
                fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer',
                opacity: busy ? 0.5 : 1, transition: 'opacity 0.15s',
              }}>
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </form>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#FFFFFF', width: 14, height: 14 }}/>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>Keep me signed in</span>
              </label>
              <a href="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>
            <p style={{ marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.60)', textAlign: 'center' }}>
              New to OpenStatus?{' '}
              <Link href="/signup" style={{ color: '#FFFFFF', fontWeight: 700, textDecoration: 'none' }}>
                Create an account →
              </Link>
            </p>
          </div>
        </div>

        {/* ── Partner logos ── */}
        <div style={{
          position: 'relative', zIndex: 10,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: isMobile ? '22px 20px' : '22px 40px',
          maxWidth: 1280, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        }}>
          <p style={{
            textAlign: 'center', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.18em', color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase', marginBottom: 18,
          }}>
            Trusted by businesses on
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, flexWrap: 'wrap', opacity: 0.85 }}>
            {PARTNERS.map((p) => (
              <div key={p.name} title={p.name} style={{ display: 'flex', alignItems: 'center' }}>{p.svg}</div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          PRODUCT
      ══════════════════════════════════════════════════════════════ */}
      <section id="product" style={{ background: '#F7F7F5', padding: isMobile ? '60px 20px' : '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#858585', marginBottom: 16 }}>
            Product
          </p>
          <h2 style={{
            fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
            fontWeight: 800, fontSize: 'clamp(40px, 4vw, 68px)',
            lineHeight: 0.95, letterSpacing: '-0.04em',
            color: '#0A0A0A', marginBottom: 20,
          }}>
            See how OpenStatus keeps your<br />hours, status, and business info current.
          </h2>
          <p style={{ fontSize: 17, color: '#858585', lineHeight: 1.6, maxWidth: 560, marginBottom: 72 }}>
            One dashboard. One update. Customers always know the truth.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                label: 'Live status',
                heading: 'Hours change.\nWe make sure\nyour customers know.',
                body: 'Opening late? Closing early? Out for the day? Post a live update in seconds. Your page shows the real story.',
              },
              {
                label: 'One page',
                heading: 'Your digital\nfront door.\nAlways current.',
                body: 'Hours, menu, ordering link, directions, events — all in one place. No logins to update five apps separately.',
              },
              {
                label: 'Sync',
                heading: 'Update once.\nStay current\neverywhere.',
                body: 'OpenStatus connects to Google, Apple Maps, and other platforms so your info stays accurate everywhere customers find you.',
              },
            ].map((card) => (
              <div key={card.label} style={{
                background: '#FFFFFF',
                borderRadius: 24, padding: '36px 32px',
                border: '1px solid #DEDEDC',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#858585', marginBottom: 18 }}>
                  {card.label}
                </p>
                <h3 style={{
                  fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
                  fontWeight: 800, fontSize: 28, lineHeight: 1.05,
                  letterSpacing: '-0.03em', color: '#0A0A0A',
                  marginBottom: 16, whiteSpace: 'pre-line',
                }}>
                  {card.heading}
                </h3>
                <p style={{ fontSize: 14, color: '#858585', lineHeight: 1.65 }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════════════ */}
      <section id="about" style={{ background: '#0A0A0A', padding: isMobile ? '60px 20px' : '100px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.40)', marginBottom: 16 }}>
            About
          </p>
          <h2 style={{
            fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
            fontWeight: 800, fontSize: 'clamp(40px, 4.5vw, 72px)',
            lineHeight: 0.95, letterSpacing: '-0.04em',
            color: '#FFFFFF', marginBottom: 40,
          }}>
            Built for businesses that change in real life.
          </h2>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: 28 }}>
            Hours change. Plans change. Things sell out.
          </p>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 620, marginBottom: 28 }}>
            OpenStatus helps make sure your customers know what&apos;s true right now — not what you posted six months ago, not what Google cached last Tuesday.
          </p>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, maxWidth: 620 }}>
            We built this because every small business owner we know has the same problem: they update their hours on Google, and somehow a customer still shows up at the wrong time. OpenStatus is the fix.
          </p>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: '#F7F7F5', padding: isMobile ? '60px 20px' : '100px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#858585', marginBottom: 16 }}>
            Pricing
          </p>
          <h2 style={{
            fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
            fontWeight: 800, fontSize: 'clamp(40px, 4vw, 64px)',
            lineHeight: 0.95, letterSpacing: '-0.04em',
            color: '#0A0A0A', marginBottom: 16,
          }}>
            Simple pricing.<br />No bloated software.
          </h2>
          <p style={{ fontSize: 17, color: '#858585', lineHeight: 1.65, maxWidth: 520, marginBottom: 64 }}>
            Start with your free business page. Upgrade when you want OpenStatus to help keep your information synced across the places customers find you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 760, margin: '0 auto' }}>
            {/* Free */}
            <div style={{
              background: '#FFFFFF', borderRadius: 24,
              padding: '40px 36px', border: '1px solid #DEDEDC',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#858585', marginBottom: 12 }}>Free</p>
              <p style={{
                fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
                fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em',
                color: '#0A0A0A', lineHeight: 1, marginBottom: 6,
              }}>$0</p>
              <p style={{ fontSize: 13, color: '#858585', marginBottom: 28 }}>Always free</p>
              <div style={{ borderTop: '1px solid #DEDEDC', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Your public business page', 'Live hours and open/closed status', 'Status updates for customers', 'Links, menu, and contact blocks'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, color: '#292929', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center',
                padding: '14px', borderRadius: 999,
                background: '#EEEEEC', color: '#0A0A0A',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div style={{
              background: '#0A0A0A', borderRadius: 24,
              padding: '40px 36px', border: '1px solid #0A0A0A',
              position: 'relative', overflow: 'hidden',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>Pro</p>
              <p style={{
                fontFamily: '"Inter Tight", "Inter", system-ui, sans-serif',
                fontWeight: 800, fontSize: 48, letterSpacing: '-0.04em',
                color: '#FFFFFF', lineHeight: 1, marginBottom: 6,
              }}>$19</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 28 }}>per month</p>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {['Everything in Free', 'Google Business sync', 'Apple Maps sync', 'Automated update reminders', 'Analytics and customer insights'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ color: '#22C55E', flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{
                display: 'block', textAlign: 'center',
                padding: '14px', borderRadius: 999,
                background: '#FFFFFF', color: '#0A0A0A',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
                Start with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0A0A0A', padding: isMobile ? '32px 20px' : '48px 40px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap', gap: 20,
        }}>
          <div>
            <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em' }}>
              OpenStatus
            </span>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
              © {new Date().getFullYear()} OpenStatus. All rights reserved.
            </p>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {[
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Contact', href: 'mailto:hello@openstatus.co' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{
                fontSize: 13, color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none', fontWeight: 500,
                transition: 'color 0.15s',
              }}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </footer>

    </div>
  );
}
