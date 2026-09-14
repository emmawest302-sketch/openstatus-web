'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const blocks = [
  { label: 'Order', icon: '↗', tone: 'dark' },
  { label: 'Menu', icon: '☰', tone: 'light' },
  { label: 'Directions', icon: '⌖', tone: 'light' },
  { label: 'Book', icon: '＋', tone: 'glass' },
];

const analytics = [
  ['2,481', 'Visitors'],
  ['642', 'Directions'],
  ['381', 'Menu views'],
  ['219', 'Orders'],
];

function Dot({ color = '#50D890' }: { color?: string }) {
  return <span className="status-dot" style={{ background: color }} aria-hidden="true" />;
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function MiniPhone({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mini-phone ${compact ? 'mini-phone--compact' : ''}`}>
      <div className="mini-phone__screen">
        <div className="mini-phone__hero" />
        <div className="mini-phone__overlay" />
        <div className="mini-phone__content">
          <div className="mini-phone__brand-row">
            <div className="mini-phone__logo">HM</div>
            <div>
              <p className="mini-phone__eyebrow">HERBAN MARKET</p>
              <p className="mini-phone__location">Franklin, Tennessee</p>
            </div>
          </div>

          <div className="mini-phone__live">
            <div>
              <p className="mini-phone__live-label"><Dot /> LIVE STATUS</p>
              <p className="mini-phone__live-title">Open now</p>
              <p className="mini-phone__live-copy">Closes at 4:00 PM · Pickup available</p>
            </div>
            <span className="mini-phone__live-pill">LIVE</span>
          </div>

          <div className="mini-phone__actions">
            {blocks.slice(0, compact ? 3 : 4).map((block) => (
              <div key={block.label} className={`mini-action mini-action--${block.tone}`}>
                <span>{block.label}</span><span>{block.icon}</span>
              </div>
            ))}
          </div>

          {!compact && (
            <>
              <div className="mini-phone__feature">
                <div className="mini-phone__feature-image" />
                <div>
                  <p>Today at Herban</p>
                  <strong>Fall drinks are here.</strong>
                </div>
              </div>
              <div className="mini-phone__website">Visit our full website <Arrow /></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandCard({ title, subtitle, className }: { title: string; subtitle: string; className: string }) {
  return (
    <div className={`brand-card ${className}`}>
      <div className="brand-card__top"><span className="brand-card__mark">{title.slice(0, 1)}</span><span>● LIVE</span></div>
      <div className="brand-card__bottom"><strong>{title}</strong><span>{subtitle}</span></div>
    </div>
  );
}

export default function HomePage() {
  const [period, setPeriod] = useState<'morning' | 'afternoon' | 'closed'>('morning');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPeriod((current) => current === 'morning' ? 'afternoon' : current === 'afternoon' ? 'closed' : 'morning');
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  const status = useMemo(() => {
    if (period === 'morning') return { time: '10:30 AM', title: 'Open now', copy: 'Breakfast until 11 · Pickup available', color: '#50D890', action: 'Order breakfast' };
    if (period === 'afternoon') return { time: '3:45 PM', title: 'Closing soon', copy: 'Order before 4 PM · Patio open', color: '#F5C45E', action: 'Order before close' };
    return { time: '7:00 PM', title: 'Closed', copy: 'Opens tomorrow at 7 AM', color: '#FF7A6E', action: 'Preorder tomorrow' };
  }, [period]);

  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="OpenStatus home">
          <span className="wordmark__orb" />
          <span>OpenStatus</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#analytics">Analytics</a>
          <a href="#business">For business</a>
        </nav>
        <div className="site-header__actions">
          <Link href="/login" className="text-link">Log in</Link>
          <Link href="/signup" className="pill-button pill-button--dark">Build your page <Arrow /></Link>
        </div>
      </header>

      <section className="hero-section">
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />
        <div className="hero-copy">
          <span className="eyebrow-pill">BUILT FOR SMALL BUSINESS</span>
          <h1>Your business.<br /><span>Right now.</span></h1>
          <p>One beautiful link for your bio that knows when you&apos;re open, shows customers what matters, and sends them exactly where they need to go.</p>
          <div className="hero-actions">
            <Link href="/signup" className="pill-button pill-button--dark pill-button--large">Build your OpenStatus <Arrow /></Link>
            <a href="#product" className="pill-button pill-button--glass pill-button--large">See how it works ↓</a>
          </div>
          <div className="hero-proof">
            <span>Live status</span><span>Branded blocks</span><span>Business analytics</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Example OpenStatus page on a phone">
          <div className="glass-orb glass-orb--one" />
          <div className="glass-orb glass-orb--two" />
          <MiniPhone />
          <div className="floating-chip floating-chip--status"><Dot /> OPEN NOW · 4 PM</div>
          <div className="floating-chip floating-chip--metric">+642 directions this month</div>
        </div>
      </section>

      <section className="statement-section">
        <p>Creators have link pages.</p>
        <h2>Businesses need a <span>live storefront.</span></h2>
      </section>

      <section className="live-section" id="product">
        <div className="live-copy">
          <span className="section-kicker">THE DIFFERENCE</span>
          <h2>The top of your page is <em>true right now.</em></h2>
          <p>Hours power the baseline. Temporary changes override them. The page changes automatically throughout the day, so customers always know what they can do next.</p>
          <div className="period-tabs" role="tablist" aria-label="Status demo times">
            {(['morning', 'afternoon', 'closed'] as const).map((item) => (
              <button key={item} onClick={() => setPeriod(item)} className={period === item ? 'active' : ''}>
                {item === 'morning' ? 'Morning' : item === 'afternoon' ? 'Afternoon' : 'After hours'}
              </button>
            ))}
          </div>
        </div>
        <div className="live-demo-card">
          <div className="live-demo-card__time">{status.time}</div>
          <div className="live-demo-card__status">
            <div><p><Dot color={status.color} /> LIVE STATUS</p><h3>{status.title}</h3><span>{status.copy}</span></div>
            <span className="live-badge">LIVE</span>
          </div>
          <div className="live-demo-card__cta">{status.action} <Arrow /></div>
          <div className="live-demo-card__note">Temporary updates clear themselves. Regular hours take back over automatically.</div>
        </div>
      </section>

      <section className="brand-section">
        <div className="brand-section__copy">
          <span className="section-kicker">LOOKS LIKE YOU</span>
          <h2>Your brand stays the hero.</h2>
          <p>Logo, photography, video, colors, type and layout. OpenStatus should feel like your business built its own tiny app — not like your business rented a generic button list.</p>
        </div>
        <div className="brand-grid">
          <BrandCard title="Aster Salon" subtitle="Appointments today" className="brand-card--cream" />
          <BrandCard title="Southbound" subtitle="Kitchen open until 10" className="brand-card--black" />
          <BrandCard title="Marlow Goods" subtitle="Pickup available" className="brand-card--pink" />
          <BrandCard title="Field House" subtitle="4 spots left tonight" className="brand-card--blue" />
        </div>
      </section>

      <section className="blocks-section">
        <div className="blocks-copy">
          <span className="section-kicker">NOT JUST LINKS</span>
          <h2>Every block has a job.</h2>
          <p>Businesses toggle on only what they need. Add a cover photo, make a block compact or featured, then drag it where it belongs.</p>
        </div>
        <div className="blocks-canvas">
          <div className="block-card block-card--wide"><span>Menu</span><strong>Render it beautifully.</strong><small>Not a PDF nobody opens.</small></div>
          <div className="block-card block-card--image"><span>Order</span><strong>Order lunch</strong><small>Pickup available now</small></div>
          <div className="block-card"><span>Directions</span><strong>Open maps</strong><small>123 Main Street</small></div>
          <div className="block-card"><span>Website</span><strong>Your real website</strong><small>Always one tap away</small></div>
          <div className="block-card block-card--accent"><span>Book</span><strong>2 openings today</strong><small>Next: 3:30 PM</small></div>
        </div>
      </section>

      <section className="analytics-section" id="analytics">
        <div className="analytics-copy">
          <span className="section-kicker section-kicker--dark">BUSINESS ANALYTICS</span>
          <h2>Know what customers actually want.</h2>
          <p>Go beyond link clicks. See when people check your page, what they&apos;re trying to do, and which actions turn social traffic into real business.</p>
          <div className="insight-pill">27% of customers checked your business while you were closed.</div>
        </div>
        <div className="analytics-board">
          <div className="analytics-board__header"><span>Last 30 days</span><span className="live-indicator"><Dot /> LIVE</span></div>
          <div className="metric-grid">
            {analytics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
          <div className="chart-shell">
            <div className="chart-bars" aria-label="Traffic by day chart">
              {[44, 63, 49, 78, 66, 92, 70, 84, 58, 96, 72, 88].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="chart-labels"><span>Mon</span><span>Wed</span><span>Fri</span><span>Sun</span></div>
          </div>
        </div>
      </section>

      <section className="website-section">
        <span className="section-kicker">YOUR WEBSITE STILL MATTERS</span>
        <h2>OpenStatus gets people there.</h2>
        <div className="flow-diagram">
          <div className="flow-node flow-node--source">Instagram</div>
          <span>→</span>
          <div className="flow-node flow-node--openstatus">OpenStatus</div>
          <span>→</span>
          <div className="flow-destinations"><span>Order</span><span>Website</span><span>Book</span><span>Directions</span></div>
        </div>
        <p>Your website remains the home of your brand and SEO. OpenStatus becomes the fast, mobile front door that sends customers to the right place.</p>
      </section>

      <section className="business-section" id="business">
        <div className="business-shell">
          <div className="business-copy">
            <span className="section-kicker section-kicker--dark">COMING INTO THE SAME HUB</span>
            <h2>One source for customer-facing info.</h2>
            <p>Hours, temporary updates, links, menu, booking, ordering and eventually automated Instagram replies — all in your brand voice, all pointing back to the same live page.</p>
            <div className="integration-row"><span>Instagram</span><span>Square</span><span>Shopify</span><span>Calendly</span></div>
          </div>
          <div className="dm-card">
            <div className="dm-card__top"><span>Instagram DMs</span><span className="toggle-on">ON</span></div>
            <div className="dm-bubble dm-bubble--customer">What time do you close today?</div>
            <div className="dm-bubble dm-bubble--brand">We&apos;re open until 4 PM today 🌿 You can view today&apos;s menu, order, or get directions here.</div>
            <div className="dm-link">herbanmarket.openstatus.co <Arrow /></div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta__orb" />
        <span className="section-kicker">OPENSTATUS</span>
        <h2>One beautiful link.<br />Built for business.</h2>
        <p>Live status. Branded blocks. Better analytics. Your website always one tap away.</p>
        <Link href="/signup" className="pill-button pill-button--dark pill-button--large">Build your page <Arrow /></Link>
      </section>

      <footer className="site-footer">
        <div className="wordmark"><span className="wordmark__orb" /><span>OpenStatus</span></div>
        <p>The live link in bio for small businesses.</p>
        <div><Link href="/login">Log in</Link><Link href="/signup">Start free</Link></div>
      </footer>
    </main>
  );
}
