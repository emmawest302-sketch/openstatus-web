'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ── Brand marks ───────────────────────────────────────────────────────────────
// Used to describe what OpenStatus connects to. OpenStatus is not affiliated
// with, endorsed by, or a partner of any of these companies — the copy says
// "works with" for exactly that reason.

function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
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
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22C18.34 21.21 22 17.06 22 12.06z" fill="#0866FF"/>
    </svg>
  );
}

// ── Small icons, same language as the builder ────────────────────────────────
const ICON: Record<string, React.ReactNode> = {
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  pin:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  blocks:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  star:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>,
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  share: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
};

const PURPLE = '#7C3AED';
const PURPLE_DEEP = '#6D28D9';
const TINT = '#F5F3FF';
const INK = '#111111';
const MUTED = '#667085';
const LINE = '#EBEBEA';

// Brand chips for the "works with" row. Simplified marks, brand colours only.
function WorksWithChip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '9px 14px', borderRadius: 999,
      background: '#FFFFFF', border: `1px solid ${LINE}`,
      fontSize: 13, fontWeight: 500, color: INK, whiteSpace: 'nowrap',
    }}>
      {children}
      {label}
    </span>
  );
}
function MarkDoorDash() {
  return <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#FF3008"/><path d="M7 12.4h11.3c2.1 0 3.6 1.3 3.6 3.2 0 2.4-1.9 4.4-4.6 4.4H7l2.6-3h7.5c.7 0 1.2-.5 1.2-1.1 0-.5-.35-.9-1-.9H7z" fill="#fff"/></svg>;
}
function MarkUberEats() {
  return <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#06C167"/><rect x="6.5" y="13" width="19" height="3.1" rx="1.55" fill="#0B0B0B"/><rect x="6.5" y="18.4" width="12.5" height="3.1" rx="1.55" fill="#0B0B0B"/><circle cx="23" cy="20" r="2.6" fill="#0B0B0B"/></svg>;
}
function MarkGrubhub() {
  return <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#FF8000"/><path d="M16 7.2 25 14v10.8h-6.2v-6H13.2v6H7V14z" fill="#fff"/><rect x="20.4" y="8.2" width="2.6" height="3.6" fill="#fff"/></svg>;
}
function MarkSquare() {
  return <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#000"/><rect x="9" y="9" width="14" height="14" rx="3" fill="#fff"/><rect x="12" y="12" width="8" height="8" rx="1.5" fill="#000"/></svg>;
}
function MarkInstagram() {
  return <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#E1306C"/><rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2"/><circle cx="21.5" cy="10.5" r="1.3" fill="#fff"/></svg>;
}

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

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      router.replace(biz ? '/builder' : '/setup');
    })();
  }, [router]);

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
    padding: '13px 15px', borderRadius: 14,
    border: `1px solid ${LINE}`, background: '#FFFFFF',
    fontSize: 14, color: INK, outline: 'none', fontFamily: 'inherit',
  };

  const shell: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', width: '100%', boxSizing: 'border-box' };
  const pad = isMobile ? '0 20px' : '0 40px';
  const kicker: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.14em',
    textTransform: 'uppercase', color: '#98A2B3', margin: '0 0 14px',
  };

  return (
    <div style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif', background: '#FFFFFF', color: INK }}>

      {/* ── Nav ── */}
      <header style={{ borderBottom: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ ...shell, padding: isMobile ? '14px 20px' : '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.03em' }}>OpenStatus</span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 30 }}>
            {!isMobile && ['Product', 'Pricing'].map((l) => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>{l}</a>
            ))}
            <Link href="/signup" style={{
              fontSize: 14, fontWeight: 600, color: '#FFFFFF', textDecoration: 'none',
              background: PURPLE, borderRadius: 999, padding: isMobile ? '8px 16px' : '9px 20px',
            }}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: isMobile ? '56px 0 12px' : '96px 0 24px' }}>
        <div style={{ ...shell, padding: pad, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 380px', gap: isMobile ? 40 : 64, alignItems: 'start' }}>
          <div>
            <p style={kicker}>One link for your business</p>
            <h1 style={{
              fontWeight: 600, fontSize: isMobile ? 40 : 60,
              lineHeight: 1.04, letterSpacing: '-0.035em', margin: '0 0 20px',
            }}>
              Everything customers<br/>need, in one link that&apos;s<br/>
              <span style={{ color: PURPLE }}>always right.</span>
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: MUTED, maxWidth: 480, margin: '0 0 28px' }}>
              Your hours, menu, ordering, directions and reviews — on one page that
              shows whether you&apos;re open right now. Update it once; it&apos;s correct everywhere.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 34 }}>
              <Link href="/signup" style={{
                fontSize: 15, fontWeight: 600, color: '#FFFFFF', textDecoration: 'none',
                background: PURPLE, borderRadius: 999, padding: '13px 26px',
              }}>
                Create your page — free
              </Link>
              <a href="#product" style={{ fontSize: 15, fontWeight: 500, color: MUTED, textDecoration: 'none' }}>
                See how it works
              </a>
            </div>

            {/* Works with — describes interoperability, never partnership */}
            <p style={{ ...kicker, marginBottom: 12 }}>Works with the tools you already use</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <WorksWithChip label="Google Business Profile"><GoogleLogo size={16}/></WorksWithChip>
              <WorksWithChip label="DoorDash"><MarkDoorDash/></WorksWithChip>
              <WorksWithChip label="Uber Eats"><MarkUberEats/></WorksWithChip>
              <WorksWithChip label="Grubhub"><MarkGrubhub/></WorksWithChip>
              <WorksWithChip label="Square"><MarkSquare/></WorksWithChip>
              <WorksWithChip label="Instagram"><MarkInstagram/></WorksWithChip>
            </div>
          </div>

          {/* Sign in card */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 22, padding: 24, background: '#FFFFFF', boxShadow: '0 12px 40px rgba(17,17,17,0.05)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>Sign in</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>Already have a page? Pick up where you left off.</p>
            <form onSubmit={handleLogin} style={{ display: 'grid', gap: 10 }}>
              <input type="email" required placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} aria-label="Email"/>
              <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} aria-label="Password"/>
              <button type="submit" disabled={busy} style={{
                padding: '13px 16px', borderRadius: 14, border: 0, cursor: busy ? 'not-allowed' : 'pointer',
                background: INK, color: '#FFFFFF', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', opacity: busy ? 0.5 : 1,
              }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <span style={{ flex: 1, height: 1, background: LINE }}/>
              <span style={{ fontSize: 11, color: '#98A2B3' }}>or</span>
              <span style={{ flex: 1, height: 1, background: LINE }}/>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <button onClick={() => void handleOAuth('google')} disabled={busy} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                padding: '12px 16px', borderRadius: 14, border: `1px solid ${LINE}`,
                background: '#FFFFFF', fontSize: 14, fontWeight: 500, color: INK,
                cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                <GoogleLogo/> Continue with Google
              </button>
              <button onClick={() => void handleOAuth('facebook')} disabled={busy} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                padding: '12px 16px', borderRadius: 14, border: `1px solid ${LINE}`,
                background: '#FFFFFF', fontSize: 14, fontWeight: 500, color: INK,
                cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                <MetaLogo/> Continue with Facebook
              </button>
            </div>
            {error && <p style={{ fontSize: 12, color: '#D92D20', marginTop: 12 }}>{error}</p>}
            <p style={{ fontSize: 12, color: MUTED, marginTop: 16, textAlign: 'center' }}>
              New here? <Link href="/signup" style={{ color: PURPLE_DEEP, fontWeight: 600, textDecoration: 'none' }}>Create an account</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Product ── */}
      <section id="product" style={{ padding: isMobile ? '64px 0' : '104px 0', borderTop: `1px solid ${LINE}`, marginTop: isMobile ? 48 : 80 }}>
        <div style={{ ...shell, padding: pad }}>
          <p style={kicker}>What you get</p>
          <h2 style={{ fontWeight: 600, fontSize: isMobile ? 30 : 40, lineHeight: 1.12, letterSpacing: '-0.03em', margin: '0 0 14px', maxWidth: 620 }}>
            One page that tells the truth about your business.
          </h2>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, maxWidth: 560, margin: '0 0 44px' }}>
            Build it in a few minutes. Change it in a few seconds.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: 'clock',  title: 'Live open or closed', body: 'Your page shows whether you’re open right now, from your real hours. Closing early? Say so once and every visitor sees it.' },
              { icon: 'blocks', title: 'Blocks for everything', body: 'Menu, ordering, booking, website, socials. Turn on what you need, drag to reorder, pick the size.' },
              { icon: 'pin',    title: 'Directions that work', body: 'A real map and a Directions button that opens Maps on your customer’s phone.' },
              { icon: 'star',   title: 'Your Google rating', body: 'Pulled straight from Google, shown under your name. Never typed by hand, so it’s always the real number.' },
              { icon: 'share',  title: 'Built to be shared', body: 'One link for your bio, your receipts, your window sticker. It previews properly wherever you paste it.' },
              { icon: 'chart',  title: 'See what people tap', body: 'Views, directions, menu taps and link clicks — so you know what your page is actually doing.' },
            ].map(({ icon, title, body }) => (
              <div key={title} style={{ border: `1px solid ${LINE}`, borderRadius: 20, padding: 22, background: '#FFFFFF' }}>
                <span style={{
                  display: 'inline-flex', width: 36, height: 36, borderRadius: 11,
                  alignItems: 'center', justifyContent: 'center',
                  background: TINT, color: PURPLE, marginBottom: 14,
                }}>
                  {ICON[icon]}
                </span>
                <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>{title}</p>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: isMobile ? '64px 0' : '104px 0', borderTop: `1px solid ${LINE}`, background: '#FCFCFB' }}>
        <div style={{ ...shell, padding: pad }}>
          <p style={kicker}>Pricing</p>
          <h2 style={{ fontWeight: 600, fontSize: isMobile ? 30 : 40, lineHeight: 1.12, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
            Start free. Upgrade if you want more.
          </h2>
          <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.6, maxWidth: 520, margin: '0 0 40px' }}>
            Your page and your live status are free, for good.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 16, maxWidth: 720 }}>
            {[
              { name: 'Free', price: '$0', note: 'Everything you need to be findable.', points: ['Your page and link', 'Live open / closed status', 'All blocks', 'Google hours sync'], cta: 'Create your page', primary: false },
              { name: 'Pro', price: 'Coming soon', note: 'For when you want it to do more.', points: ['Remove OpenStatus branding', 'Full visitor analytics', 'Priority support'], cta: 'Start free for now', primary: true },
            ].map((plan) => (
              <div key={plan.name} style={{
                border: `1px solid ${plan.primary ? '#DDD6FE' : LINE}`,
                background: plan.primary ? TINT : '#FFFFFF',
                borderRadius: 22, padding: 24,
              }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: plan.primary ? PURPLE_DEEP : MUTED, margin: '0 0 6px' }}>{plan.name}</p>
                <p style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 4px' }}>{plan.price}</p>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 18px' }}>{plan.note}</p>
                <div style={{ display: 'grid', gap: 9, marginBottom: 22 }}>
                  {plan.points.map((pt) => (
                    <div key={pt} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 13.5, color: MUTED }}>{pt}</span>
                    </div>
                  ))}
                </div>
                <Link href="/signup" style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  padding: '12px 16px', borderRadius: 14, fontSize: 14, fontWeight: 600,
                  background: plan.primary ? PURPLE : '#FFFFFF',
                  color: plan.primary ? '#FFFFFF' : INK,
                  border: plan.primary ? 'none' : `1px solid ${LINE}`,
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${LINE}`, padding: isMobile ? '32px 0' : '40px 0' }}>
        <div style={{ ...shell, padding: pad, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.03em' }}>OpenStatus</span>
            <p style={{ fontSize: 12, color: '#98A2B3', margin: '5px 0 0' }}>
              © {new Date().getFullYear()} OpenStatus. Not affiliated with or endorsed by Google, DoorDash, Uber Eats, Grubhub, Square or Instagram.
            </p>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            {[
              { label: 'Terms', href: '/terms' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Contact', href: 'mailto:info@openstatus.co' },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>{label}</a>
            ))}
          </nav>
        </div>
      </footer>

    </div>
  );
}
