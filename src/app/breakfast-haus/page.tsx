import Link from 'next/link';

const cards = [
  { title: 'Order now', sub: 'Pickup available', badge: 'Square', tone: 'photo-one' },
  { title: 'View menu', sub: 'Breakfast + lunch', badge: 'Menu', tone: 'photo-two' },
  { title: 'Directions', sub: 'Franklin, Tennessee', badge: 'Maps', tone: 'cream' },
  { title: 'Join waitlist', sub: 'About 15 min', badge: 'Waitlist', tone: 'charcoal' },
  { title: 'Catering', sub: 'Office + events', badge: 'Website', tone: 'photo-three' },
  { title: 'Gift cards', sub: 'Send breakfast', badge: 'Shop', tone: 'butter' },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function BreakfastHausPage() {
  return (
    <main className="bh-page">
      <div className="bh-bg" />
      <section className="bh-shell">
        <div className="bh-hero">
          <div className="bh-hero__wash" />
          <div className="bh-topbar">
            <div className="bh-logo">BH</div>
            <a className="bh-share" href="#links" aria-label="Jump to links">•••</a>
          </div>
          <div className="bh-title">
            <span className="bh-kicker">BREAKFAST · BRUNCH · COFFEE</span>
            <h1>Breakfast Haus</h1>
            <p>Bright mornings, strong coffee, really good breakfast.</p>
          </div>
        </div>

        <section className="bh-live" aria-label="Live business status">
          <div className="bh-live__top">
            <div>
              <span className="bh-live__label"><i /> LIVE STATUS</span>
              <h2>Open now</h2>
              <p>Closes at 3:00 PM</p>
            </div>
            <span className="bh-live__pill">LIVE</span>
          </div>
          <div className="bh-live__meta">
            <span>Breakfast served all day</span>
            <span>Pickup available</span>
          </div>
        </section>

        <section className="bh-actions" id="links">
          <a className="bh-primary" href="#menu"><span>Order breakfast</span><Arrow /></a>
          <a className="bh-secondary" href="#menu"><span>See today&apos;s menu</span><Arrow /></a>
        </section>

        <section className="bh-grid">
          {cards.map((card) => (
            <a key={card.title} className={`bh-card ${card.tone}`} href="#footer">
              <div className="bh-card__badge">{card.badge}</div>
              <div className="bh-card__bottom">
                <div><strong>{card.title}</strong><span>{card.sub}</span></div>
                <Arrow />
              </div>
            </a>
          ))}
        </section>

        <section className="bh-menu" id="menu">
          <div className="bh-menu__head"><span>TODAY&apos;S MENU</span><span>Updated this morning</span></div>
          <div className="bh-menu__row"><div><strong>Haus Breakfast</strong><span>eggs, crispy potatoes, sourdough</span></div><b>$15</b></div>
          <div className="bh-menu__row"><div><strong>Lemon Ricotta Pancakes</strong><span>berries, whipped ricotta, maple</span></div><b>$14</b></div>
          <div className="bh-menu__row"><div><strong>Breakfast Sandwich</strong><span>egg, cheddar, bacon, brioche</span></div><b>$11</b></div>
          <a className="bh-menu__more" href="#footer">View full menu <Arrow /></a>
        </section>

        <a className="bh-website" href="#footer"><div><span>OUR FULL WEBSITE</span><strong>Visit breakfasthaus.com</strong></div><Arrow /></a>

        <footer className="bh-footer" id="footer">
          <div className="bh-footer__brand"><span className="bh-footer__mark">BH</span><div><strong>Breakfast Haus</strong><span>Franklin, Tennessee</span></div></div>
          <div className="bh-footer__links"><span>Instagram</span><span>Call</span><span>Website</span></div>
          <Link href="/" className="bh-powered">Powered by OpenStatus</Link>
        </footer>
      </section>
    </main>
  );
}
