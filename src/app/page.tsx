const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing', 'Free'],
  ['Your own website', 'A live status block above your hours', 'Unlimited'],
  ['Your Before You Go page', 'Shareable, QR-able, always current', 'Free'],
  ['Your regulars', 'A text when something actually changes', 'Unlimited'],
];

const freeFeatures = [
  ['Before You Go page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Up to 5 automatic updates a month', 'We catch changes and update your page'],
  ['Automatic expiry', 'Updates clear when they stop being true'],
  ['Regular hours', 'Your normal opening times, always shown'],
  ['Directions, menu, call, website', 'The things people actually tap'],
];

const proFeatures = [
  ['Website embed', 'The same live status on your own site'],
  ['SMS alerts for your customers', 'Subscribers hear about changes instantly'],
  ['Unlimited automatic updates', 'No monthly cap'],
  ['Customer subscriber list', 'See and manage who has opted in'],
  ['Full analytics', 'Views, taps and what people acted on'],
  ['More update types', 'Sold out, cash only, parking, location'],
  ['Facebook monitoring', 'Works with your Facebook posts too'],
  ['Your colours', 'Match the page to your brand'],
];

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#kh)" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className="shrink-0 mt-1 text-[#1D9E75]"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#F7F6F1] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <section className="relative min-h-[640px] overflow-hidden">
        <img
          src="/street.jpg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1410]/95 via-[#0B1410]/70 to-[#0B1410]/20" />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[#9FE1CB]">
              <Keyhole size={24} />
            </span>
            <span className="text-lg font-bold tracking-[0.02em]">
              OPENSTATUS
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-[#0F3A2B] rounded-full hover:bg-[#1D9E75] transition"
            >
              Get started free
            </a>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 grid gap-12 lg:grid-cols-[1.15fr_auto] lg:items-start">
          <div className="text-white max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3.5 py-2 rounded-full border border-white/25">
              <span className="text-[#9FE1CB]">
                <Keyhole size={13} />
              </span>
              Before you go
            </span>

            <h1 className="mt-7 text-6xl font-bold tracking-[-0.035em] leading-[0.98]">
              One update.
              <br />
              <span
                className="text-[#C9CFC0]"
                style={{ fontStyle: 'italic' }}
              >
                Everywhere
                <br />
                it matters.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
              Keep posting on Instagram like you always do. OpenStatus turns
              those updates into live information on your page, your website and
              in your customers&rsquo; hands.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#0F3A2B] font-medium hover:bg-[#1D9E75] transition"
              >
                Get started free
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full bg-white text-[#0B2E22] font-medium hover:bg-[#E1F5EE] transition"
              >
                See an example
              </a>
            </div>
          </div>

          <div className="w-full max-w-[330px] bg-white rounded-[22px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <img
                src="/images.png"
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#0B2E22]/10"
              />
              <div>
                <p className="font-bold text-sm tracking-tight">Herban Market</p>
                <p className="text-xs text-[#4E7A69]">
                  Grocery &amp; coffee · Columbia, TN
                </p>
              </div>
            </div>

            <p
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-2 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                <p className="font-medium text-[#B4741A]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight">
                Closing at 3:00 PM
              </p>
              <p className="text-sm text-[#8A7A5E]">Normally until 8:00 PM</p>
              <p className="text-sm text-[#8A7A5E]">Weather</p>
            </div>

            <p
              className="mt-3 text-[10px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated 1h ago · via OpenStatus
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-[#0B2E22]/12 py-2.5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-10 relative">
        <div className="rounded-[26px] bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight leading-snug">
                You post it once.
                <br />
                We put it everywhere.
              </p>
              <p className="mt-3 text-sm text-[#4E7A69] leading-relaxed">
                OpenStatus is the one place your live status lives. Everything
                else reads from it, and clears itself when the day is over.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {surfaces.map(([where, what, tier]) => (
                <div
                  key={where}
                  className="rounded-2xl bg-[#F7F6F1] px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium tracking-tight">{where}</p>
                    <span
                      className={
                        'text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full shrink-0 ' +
                        (tier === 'Free'
                          ? 'bg-[#E1F5EE] text-[#0F6E56]'
                          : 'bg-[#0B2E22] text-white')
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {tier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78766F]">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[26px] bg-[#0B2E22] text-white overflow-hidden">
          <div className="p-8 sm:p-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                The bit owners like most
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] leading-tight">
                Your website stops
                <br />
                telling people the
                <br />
                <span
                  className="text-[#9FE1CB]"
                  style={{ fontStyle: 'italic' }}
                >
                  wrong thing.
                </span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed max-w-md">
                Paste one line into your site. From then on it shows whatever is
                true today, taken from the posts you were already making. You
                never edit it again.
              </p>
            </div>

            <div className="rounded-2xl bg-white text-[#0B2E22] p-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                On their own website
              </p>
              <div className="mt-3 rounded-xl bg-[#FDF3E3] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                  <p className="text-sm font-medium text-[#B4741A]">
                    Closing early today
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Open until 3:00 PM
                </p>
                <p className="text-xs text-[#8A7A5E]">Normally until 8:00 PM</p>
              </div>
              <p
                className="mt-3 text-[10px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Kept current by OpenStatus
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Simple pricing.
              <br />
              Real value.
            </h2>
            <p className="mt-3 text-[#4E7A69] leading-relaxed">
              Free keeps your page current. Unlimited puts that status wherever
              your customers already are.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-7">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Free
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $0
              <span className="ml-2 text-base font-normal text-[#78766F]">
                forever
              </span>
            </p>
            <p className="mt-3 text-sm text-[#4E7A69]">
              They check, and it is always right.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#78766F]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full border border-[#0B2E22]/20 font-medium hover:border-[#0B2E22] transition"
            >
              Get started free
            </a>
          </div>

          <div className="rounded-[26px] bg-[#0B2E22] text-white p-7">
            <div className="flex items-center justify-between">
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Unlimited
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#1D9E75]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Most popular
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $15
              <span className="ml-2 text-base font-normal text-white/60">
                / month
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9FE1CB]">
              or $150 a year, saving 17%
            </p>
            <p className="mt-3 text-sm text-white/70">
              You reach them, wherever they are.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full bg-[#1D9E75] font-medium hover:bg-white hover:text-[#0B2E22] transition"
            >
              Start with Unlimited
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[26px] bg-white px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[#1D9E75]">
              <Keyhole size={40} />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">
                Keep posting there.
              </p>
              <p className="text-[#4E7A69]">We will take it from there.</p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#0B2E22] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.2em] text-[#78766F]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Log in
          </a>
        </div>
      </footer>
    </div>
  );
}
const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing', 'Free'],
  ['Your own website', 'A live status block above your hours', 'Unlimited'],
  ['Your Before You Go page', 'Shareable, QR-able, always current', 'Free'],
  ['Your regulars', 'A text when something actually changes', 'Unlimited'],
];

const freeFeatures = [
  ['Before You Go page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Up to 5 automatic updates a month', 'We catch changes and update your page'],
  ['Automatic expiry', 'Updates clear when they stop being true'],
  ['Regular hours', 'Your normal opening times, always shown'],
  ['Directions, menu, call, website', 'The things people actually tap'],
];

const proFeatures = [
  ['Website embed', 'The same live status on your own site'],
  ['SMS alerts for your customers', 'Subscribers hear about changes instantly'],
  ['Unlimited automatic updates', 'No monthly cap'],
  ['Customer subscriber list', 'See and manage who has opted in'],
  ['Full analytics', 'Views, taps and what people acted on'],
  ['More update types', 'Sold out, cash only, parking, location'],
  ['Facebook monitoring', 'Works with your Facebook posts too'],
  ['Your colours', 'Match the page to your brand'],
];

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#kh)" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className="shrink-0 mt-1 text-[#1D9E75]"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#F7F6F1] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <section className="relative min-h-[640px] overflow-hidden">
        <img
          src="/street.jpg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1410]/95 via-[#0B1410]/70 to-[#0B1410]/20" />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[#9FE1CB]">
              <Keyhole size={24} />
            </span>
            <span className="text-lg font-bold tracking-[0.02em]">
              OPENSTATUS
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-[#0F3A2B] rounded-full hover:bg-[#1D9E75] transition"
            >
              Get started free
            </a>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 grid gap-12 lg:grid-cols-[1.15fr_auto] lg:items-start">
          <div className="text-white max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3.5 py-2 rounded-full border border-white/25">
              <span className="text-[#9FE1CB]">
                <Keyhole size={13} />
              </span>
              Before you go
            </span>

            <h1 className="mt-7 text-6xl font-bold tracking-[-0.035em] leading-[0.98]">
              One update.
              <br />
              <span
                className="text-[#C9CFC0]"
                style={{ fontStyle: 'italic' }}
              >
                Everywhere
                <br />
                it matters.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
              Keep posting on Instagram like you always do. OpenStatus turns
              those updates into live information on your page, your website and
              in your customers&rsquo; hands.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#0F3A2B] font-medium hover:bg-[#1D9E75] transition"
              >
                Get started free
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full bg-white text-[#0B2E22] font-medium hover:bg-[#E1F5EE] transition"
              >
                See an example
              </a>
            </div>
          </div>

          <div className="w-full max-w-[330px] bg-white rounded-[22px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <img
                src="/images.png"
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#0B2E22]/10"
              />
              <div>
                <p className="font-bold text-sm tracking-tight">Herban Market</p>
                <p className="text-xs text-[#4E7A69]">
                  Grocery &amp; coffee · Columbia, TN
                </p>
              </div>
            </div>

            <p
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-2 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                <p className="font-medium text-[#B4741A]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight">
                Closing at 3:00 PM
              </p>
              <p className="text-sm text-[#8A7A5E]">Normally until 8:00 PM</p>
              <p className="text-sm text-[#8A7A5E]">Weather</p>
            </div>

            <p
              className="mt-3 text-[10px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated 1h ago · via OpenStatus
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-[#0B2E22]/12 py-2.5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-10 relative">
        <div className="rounded-[26px] bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight leading-snug">
                You post it once.
                <br />
                We put it everywhere.
              </p>
              <p className="mt-3 text-sm text-[#4E7A69] leading-relaxed">
                OpenStatus is the one place your live status lives. Everything
                else reads from it, and clears itself when the day is over.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {surfaces.map(([where, what, tier]) => (
                <div
                  key={where}
                  className="rounded-2xl bg-[#F7F6F1] px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium tracking-tight">{where}</p>
                    <span
                      className={
                        'text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full shrink-0 ' +
                        (tier === 'Free'
                          ? 'bg-[#E1F5EE] text-[#0F6E56]'
                          : 'bg-[#0B2E22] text-white')
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {tier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78766F]">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[26px] bg-[#0B2E22] text-white overflow-hidden">
          <div className="p-8 sm:p-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                The bit owners like most
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] leading-tight">
                Your website stops
                <br />
                telling people the
                <br />
                <span
                  className="text-[#9FE1CB]"
                  style={{ fontStyle: 'italic' }}
                >
                  wrong thing.
                </span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed max-w-md">
                Paste one line into your site. From then on it shows whatever is
                true today, taken from the posts you were already making. You
                never edit it again.
              </p>
            </div>

            <div className="rounded-2xl bg-white text-[#0B2E22] p-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                On their own website
              </p>
              <div className="mt-3 rounded-xl bg-[#FDF3E3] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                  <p className="text-sm font-medium text-[#B4741A]">
                    Closing early today
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Open until 3:00 PM
                </p>
                <p className="text-xs text-[#8A7A5E]">Normally until 8:00 PM</p>
              </div>
              <p
                className="mt-3 text-[10px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Kept current by OpenStatus
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Simple pricing.
              <br />
              Real value.
            </h2>
            <p className="mt-3 text-[#4E7A69] leading-relaxed">
              Free keeps your page current. Unlimited puts that status wherever
              your customers already are.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-7">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Free
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $0
              <span className="ml-2 text-base font-normal text-[#78766F]">
                forever
              </span>
            </p>
            <p className="mt-3 text-sm text-[#4E7A69]">
              They check, and it is always right.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#78766F]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full border border-[#0B2E22]/20 font-medium hover:border-[#0B2E22] transition"
            >
              Get started free
            </a>
          </div>

          <div className="rounded-[26px] bg-[#0B2E22] text-white p-7">
            <div className="flex items-center justify-between">
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Unlimited
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#1D9E75]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Most popular
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $15
              <span className="ml-2 text-base font-normal text-white/60">
                / month
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9FE1CB]">
              or $150 a year, saving 17%
            </p>
            <p className="mt-3 text-sm text-white/70">
              You reach them, wherever they are.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full bg-[#1D9E75] font-medium hover:bg-white hover:text-[#0B2E22] transition"
            >
              Start with Unlimited
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[26px] bg-white px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[#1D9E75]">
              <Keyhole size={40} />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">
                Keep posting there.
              </p>
              <p className="text-[#4E7A69]">We will take it from there.</p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#0B2E22] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.2em] text-[#78766F]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Log in
          </a>
        </div>
      </footer>
    </div>
  );
}
const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing', 'Free'],
  ['Your own website', 'A live status block above your hours', 'Unlimited'],
  ['Your Before You Go page', 'Shareable, QR-able, always current', 'Free'],
  ['Your regulars', 'A text when something actually changes', 'Unlimited'],
];

const freeFeatures = [
  ['Before You Go page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Up to 5 automatic updates a month', 'We catch changes and update your page'],
  ['Automatic expiry', 'Updates clear when they stop being true'],
  ['Regular hours', 'Your normal opening times, always shown'],
  ['Directions, menu, call, website', 'The things people actually tap'],
];

const proFeatures = [
  ['Website embed', 'The same live status on your own site'],
  ['SMS alerts for your customers', 'Subscribers hear about changes instantly'],
  ['Unlimited automatic updates', 'No monthly cap'],
  ['Customer subscriber list', 'See and manage who has opted in'],
  ['Full analytics', 'Views, taps and what people acted on'],
  ['More update types', 'Sold out, cash only, parking, location'],
  ['Facebook monitoring', 'Works with your Facebook posts too'],
  ['Your colours', 'Match the page to your brand'],
];

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#kh)" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className="shrink-0 mt-1 text-[#1D9E75]"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#F7F6F1] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <section className="relative min-h-[640px] overflow-hidden">
        <img
          src="/street.jpg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1410]/95 via-[#0B1410]/70 to-[#0B1410]/20" />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[#9FE1CB]">
              <Keyhole size={24} />
            </span>
            <span className="text-lg font-bold tracking-[0.02em]">OPENSTATUS</span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-[#0F3A2B] rounded-full hover:bg-[#1D9E75] transition"
            >
              Get started free
            </a>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 grid gap-12 lg:grid-cols-[1.15fr_auto] lg:items-start">
          <div className="text-white max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3.5 py-2 rounded-full border border-white/25">
              <span className="text-[#9FE1CB]">
                <Keyhole size={13} />
              </span>
              Before you go
            </span>

            <h1 className="mt-7 text-6xl font-bold tracking-[-0.035em] leading-[0.98]">
              One update.
              <br />
              <span className="text-[#C9CFC0] italic">
                Everywhere
                <br />
                it matters.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
              Keep posting on Instagram like you always do. OpenStatus turns
              those updates into live information on your page, your website and
              in your customers&rsquo; hands.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#0F3A2B] font-medium hover:bg-[#1D9E75] transition"
              >
                Get started free
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full bg-white text-[#0B2E22] font-medium hover:bg-[#E1F5EE] transition"
              >
                See an example
              </a>
            </div>
          </div>

          <div className="w-full max-w-[330px] bg-white rounded-[22px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <img
                src="/images.png"
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#0B2E22]/10"
              />
              <div>
                <p className="font-bold text-sm tracking-tight">Herban Market</p>
                <p className="text-xs text-[#4E7A69]">
                  Grocery &amp; coffee · Columbia, TN
                </p>
              </div>
            </div>

            <p
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-2 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                <p className="font-medium text-[#B4741A]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight">
                Closing at 3:00 PM
              </p>
              <p className="text-sm text-[#8A7A5E]">Normally until 8:00 PM</p>
              <p className="text-sm text-[#8A7A5E]">Weather</p>
            </div>

            <p
              className="mt-3 text-[10px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated 1h ago · via OpenStatus
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-[#0B2E22]/12 py-2.5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-10 relative">
        <div className="rounded-[26px] bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight leading-snug">
                You post it once.
                <br />
                We put it everywhere.
              </p>
              <p className="mt-3 text-sm text-[#4E7A69] leading-relaxed">
                OpenStatus is the one place your live status lives. Everything
                else reads from it, and clears itself when the day is over.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {surfaces.map(([where, what, tier]) => (
                <div key={where} className="rounded-2xl bg-[#F7F6F1] px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium tracking-tight">{where}</p>
                    <span
                      className={
                        'text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full shrink-0 ' +
                        (tier === 'Free'
                          ? 'bg-[#E1F5EE] text-[#0F6E56]'
                          : 'bg-[#0B2E22] text-white')
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {tier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78766F]">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[26px] bg-[#0B2E22] text-white overflow-hidden">
          <div className="p-8 sm:p-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                The bit owners like most
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] leading-tight">
                Your website stops
                <br />
                telling people the
                <br />
                <span className="text-[#9FE1CB] italic">wrong thing.</span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed max-w-md">
                Paste one line into your site. From then on it shows whatever is
                true today, taken from the posts you were already making. You
                never edit it again.
              </p>
            </div>

            <div className="rounded-2xl bg-white text-[#0B2E22] p-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                On their own website
              </p>
              <div className="mt-3 rounded-xl bg-[#FDF3E3] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                  <p className="text-sm font-medium text-[#B4741A]">
                    Closing early today
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Open until 3:00 PM
                </p>
                <p className="text-xs text-[#8A7A5E]">Normally until 8:00 PM</p>
              </div>
              <p
                className="mt-3 text-[10px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Kept current by OpenStatus
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Simple pricing.
              <br />
              Real value.
            </h2>
            <p className="mt-3 text-[#4E7A69] leading-relaxed">
              Free keeps your page current. Unlimited puts that status wherever
              your customers already are.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-7">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Free
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $0
              <span className="ml-2 text-base font-normal text-[#78766F]">
                forever
              </span>
            </p>
            <p className="mt-3 text-sm text-[#4E7A69]">
              They check, and it is always right.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#78766F]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full border border-[#0B2E22]/20 font-medium hover:border-[#0B2E22] transition"
            >
              Get started free
            </a>
          </div>

          <div className="rounded-[26px] bg-[#0B2E22] text-white p-7">
            <div className="flex items-center justify-between">
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Unlimited
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#1D9E75]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Most popular
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $15
              <span className="ml-2 text-base font-normal text-white/60">
                / month
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9FE1CB]">
              or $150 a year, saving 17%
            </p>
            <p className="mt-3 text-sm text-white/70">
              You reach them, wherever they are.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full bg-[#1D9E75] font-medium hover:bg-white hover:text-[#0B2E22] transition"
            >
              Start with Unlimited
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[26px] bg-white px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[#1D9E75]">
              <Keyhole size={40} />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">
                Keep posting there.
              </p>
              <p className="text-[#4E7A69]">We will take it from there.</p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#0B2E22] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.2em] text-[#78766F]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Log in
          </a>
        </div>
      </footer>
    </div>
  );
}
const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing', 'Free'],
  ['Your own website', 'A live status block above your hours', 'Unlimited'],
  ['Your Before You Go page', 'Shareable, QR-able, always current', 'Free'],
  ['Your regulars', 'A text when something actually changes', 'Unlimited'],
];

const freeFeatures = [
  ['Before You Go page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Up to 5 automatic updates a month', 'We catch changes and update your page'],
  ['Automatic expiry', 'Updates clear when they stop being true'],
  ['Regular hours', 'Your normal opening times, always shown'],
  ['Directions, menu, call, website', 'The things people actually tap'],
];

const proFeatures = [
  ['Website embed', 'The same live status on your own site'],
  ['SMS alerts for your customers', 'Subscribers hear about changes instantly'],
  ['Unlimited automatic updates', 'No monthly cap'],
  ['Customer subscriber list', 'See and manage who has opted in'],
  ['Full analytics', 'Views, taps and what people acted on'],
  ['More update types', 'Sold out, cash only, parking, location'],
  ['Facebook monitoring', 'Works with your Facebook posts too'],
  ['Your colours', 'Match the page to your brand'],
];

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#kh)" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className="shrink-0 mt-1 text-[#1D9E75]"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#F7F6F1] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <section className="relative min-h-[640px] overflow-hidden">
        <img
          src="/street.jpg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1410]/95 via-[#0B1410]/70 to-[#0B1410]/20" />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[#9FE1CB]">
              <Keyhole size={24} />
            </span>
            <span className="text-lg font-bold tracking-[0.02em]">
              OPENSTATUS
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-[#0F3A2B] rounded-full hover:bg-[#1D9E75] transition"
            >
              Get started free
            </a>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 grid gap-12 lg:grid-cols-[1.15fr_auto] lg:items-start">
          <div className="text-white max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3.5 py-2 rounded-full border border-white/25">
              <span className="text-[#9FE1CB]">
                <Keyhole size={13} />
              </span>
              Before you go
            </span>

            <h1 className="mt-7 text-6xl font-bold tracking-[-0.035em] leading-[0.98]">
              One update.
              <br />
              <span
                className="text-[#C9CFC0]"
                style={{ fontStyle: 'italic' }}
              >
                Everywhere
                <br />
                it matters.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
              Keep posting on Instagram like you always do. OpenStatus turns
              those updates into live information on your page, your website and
              in your customers&rsquo; hands.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#0F3A2B] font-medium hover:bg-[#1D9E75] transition"
              >
                Get started free
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full bg-white text-[#0B2E22] font-medium hover:bg-[#E1F5EE] transition"
              >
                See an example
              </a>
            </div>
          </div>

          <div className="w-full max-w-[330px] bg-white rounded-[22px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <img
                src="/images.png"
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#0B2E22]/10"
              />
              <div>
                <p className="font-bold text-sm tracking-tight">Herban Market</p>
                <p className="text-xs text-[#4E7A69]">
                  Grocery &amp; coffee · Columbia, TN
                </p>
              </div>
            </div>

            <p
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-2 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                <p className="font-medium text-[#B4741A]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight">
                Closing at 3:00 PM
              </p>
              <p className="text-sm text-[#8A7A5E]">Normally until 8:00 PM</p>
              <p className="text-sm text-[#8A7A5E]">Weather</p>
            </div>

            <p
              className="mt-3 text-[10px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated 1h ago · via OpenStatus
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-[#0B2E22]/12 py-2.5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-10 relative">
        <div className="rounded-[26px] bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight leading-snug">
                You post it once.
                <br />
                We put it everywhere.
              </p>
              <p className="mt-3 text-sm text-[#4E7A69] leading-relaxed">
                OpenStatus is the one place your live status lives. Everything
                else reads from it, and clears itself when the day is over.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {surfaces.map(([where, what, tier]) => (
                <div
                  key={where}
                  className="rounded-2xl bg-[#F7F6F1] px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium tracking-tight">{where}</p>
                    <span
                      className={
                        'text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full shrink-0 ' +
                        (tier === 'Free'
                          ? 'bg-[#E1F5EE] text-[#0F6E56]'
                          : 'bg-[#0B2E22] text-white')
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {tier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78766F]">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[26px] bg-[#0B2E22] text-white overflow-hidden">
          <div className="p-8 sm:p-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                The bit owners like most
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] leading-tight">
                Your website stops
                <br />
                telling people the
                <br />
                <span
                  className="text-[#9FE1CB]"
                  style={{ fontStyle: 'italic' }}
                >
                  wrong thing.
                </span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed max-w-md">
                Paste one line into your site. From then on it shows whatever is
                true today, taken from the posts you were already making. You
                never edit it again.
              </p>
            </div>

            <div className="rounded-2xl bg-white text-[#0B2E22] p-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                On their own website
              </p>
              <div className="mt-3 rounded-xl bg-[#FDF3E3] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                  <p className="text-sm font-medium text-[#B4741A]">
                    Closing early today
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Open until 3:00 PM
                </p>
                <p className="text-xs text-[#8A7A5E]">Normally until 8:00 PM</p>
              </div>
              <p
                className="mt-3 text-[10px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Kept current by OpenStatus
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Simple pricing.
              <br />
              Real value.
            </h2>
            <p className="mt-3 text-[#4E7A69] leading-relaxed">
              Free keeps your page current. Unlimited puts that status wherever
              your customers already are.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-7">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Free
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $0
              <span className="ml-2 text-base font-normal text-[#78766F]">
                forever
              </span>
            </p>
            <p className="mt-3 text-sm text-[#4E7A69]">
              They check, and it is always right.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#78766F]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full border border-[#0B2E22]/20 font-medium hover:border-[#0B2E22] transition"
            >
              Get started free
            </a>
          </div>

          <div className="rounded-[26px] bg-[#0B2E22] text-white p-7">
            <div className="flex items-center justify-between">
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Unlimited
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#1D9E75]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Most popular
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $15
              <span className="ml-2 text-base font-normal text-white/60">
                / month
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9FE1CB]">
              or $150 a year, saving 17%
            </p>
            <p className="mt-3 text-sm text-white/70">
              You reach them, wherever they are.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full bg-[#1D9E75] font-medium hover:bg-white hover:text-[#0B2E22] transition"
            >
              Start with Unlimited
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[26px] bg-white px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[#1D9E75]">
              <Keyhole size={40} />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">
                Keep posting there.
              </p>
              <p className="text-[#4E7A69]">We will take it from there.</p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#0B2E22] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.2em] text-[#78766F]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Log in
          </a>
        </div>
      </footer>
    </div>
  );
}
const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing', 'Free'],
  ['Your own website', 'A live status block above your hours', 'Unlimited'],
  ['Your Before You Go page', 'Shareable, QR-able, always current', 'Free'],
  ['Your regulars', 'A text when something actually changes', 'Unlimited'],
];

const freeFeatures = [
  ['Before You Go page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Up to 5 automatic updates a month', 'We catch changes and update your page'],
  ['Automatic expiry', 'Updates clear when they stop being true'],
  ['Regular hours', 'Your normal opening times, always shown'],
  ['Directions, menu, call, website', 'The things people actually tap'],
];

const proFeatures = [
  ['Website embed', 'The same live status on your own site'],
  ['SMS alerts for your customers', 'Subscribers hear about changes instantly'],
  ['Unlimited automatic updates', 'No monthly cap'],
  ['Customer subscriber list', 'See and manage who has opted in'],
  ['Full analytics', 'Views, taps and what people acted on'],
  ['More update types', 'Sold out, cash only, parking, location'],
  ['Facebook monitoring', 'Works with your Facebook posts too'],
  ['Your colours', 'Match the page to your brand'],
];

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#kh)" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      className="shrink-0 mt-1 text-[#1D9E75]"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#F7F6F1] text-[#0B2E22]"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <section className="relative min-h-[640px] overflow-hidden">
        <img
          src="/street.jpg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1410]/95 via-[#0B1410]/70 to-[#0B1410]/20" />

        <header className="relative max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-[#9FE1CB]">
              <Keyhole size={24} />
            </span>
            <span className="text-lg font-bold tracking-[0.02em]">
              OPENSTATUS
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-[#0F3A2B] rounded-full hover:bg-[#1D9E75] transition"
            >
              Get started free
            </a>
          </nav>
        </header>

        <div className="relative max-w-6xl mx-auto px-6 pt-10 pb-20 grid gap-12 lg:grid-cols-[1.15fr_auto] lg:items-start">
          <div className="text-white max-w-xl">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] px-3.5 py-2 rounded-full border border-white/25">
              <span className="text-[#9FE1CB]">
                <Keyhole size={13} />
              </span>
              Before you go
            </span>

            <h1 className="mt-7 text-6xl font-bold tracking-[-0.035em] leading-[0.98]">
              One update.
              <br />
              <span
                className="text-[#C9CFC0]"
                style={{ fontStyle: 'italic' }}
              >
                Everywhere
                <br />
                it matters.
              </span>
            </h1>

            <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-md">
              Keep posting on Instagram like you always do. OpenStatus turns
              those updates into live information on your page, your website and
              in your customers&rsquo; hands.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#0F3A2B] font-medium hover:bg-[#1D9E75] transition"
              >
                Get started free
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full bg-white text-[#0B2E22] font-medium hover:bg-[#E1F5EE] transition"
              >
                See an example
              </a>
            </div>
          </div>

          <div className="w-full max-w-[330px] bg-white rounded-[22px] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3">
              <img
                src="/images.png"
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#0B2E22]/10"
              />
              <div>
                <p className="font-bold text-sm tracking-tight">Herban Market</p>
                <p className="text-xs text-[#4E7A69]">
                  Grocery &amp; coffee · Columbia, TN
                </p>
              </div>
            </div>

            <p
              className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Before you go
            </p>

            <div className="mt-2 rounded-2xl bg-[#FDF3E3] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                <p className="font-medium text-[#B4741A]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight">
                Closing at 3:00 PM
              </p>
              <p className="text-sm text-[#8A7A5E]">Normally until 8:00 PM</p>
              <p className="text-sm text-[#8A7A5E]">Weather</p>
            </div>

            <p
              className="mt-3 text-[10px] text-[#8AA79B]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Updated 1h ago · via OpenStatus
            </p>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px]">
              {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
                <span
                  key={l}
                  className="rounded-xl border border-[#0B2E22]/12 py-2.5"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 -mt-10 relative">
        <div className="rounded-[26px] bg-white p-8">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div>
              <p className="text-2xl font-bold tracking-tight leading-snug">
                You post it once.
                <br />
                We put it everywhere.
              </p>
              <p className="mt-3 text-sm text-[#4E7A69] leading-relaxed">
                OpenStatus is the one place your live status lives. Everything
                else reads from it, and clears itself when the day is over.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {surfaces.map(([where, what, tier]) => (
                <div
                  key={where}
                  className="rounded-2xl bg-[#F7F6F1] px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium tracking-tight">{where}</p>
                    <span
                      className={
                        'text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full shrink-0 ' +
                        (tier === 'Free'
                          ? 'bg-[#E1F5EE] text-[#0F6E56]'
                          : 'bg-[#0B2E22] text-white')
                      }
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {tier}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#78766F]">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-[26px] bg-[#0B2E22] text-white overflow-hidden">
          <div className="p-8 sm:p-12 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                The bit owners like most
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em] leading-tight">
                Your website stops
                <br />
                telling people the
                <br />
                <span
                  className="text-[#9FE1CB]"
                  style={{ fontStyle: 'italic' }}
                >
                  wrong thing.
                </span>
              </h2>
              <p className="mt-5 text-white/70 leading-relaxed max-w-md">
                Paste one line into your site. From then on it shows whatever is
                true today, taken from the posts you were already making. You
                never edit it again.
              </p>
            </div>

            <div className="rounded-2xl bg-white text-[#0B2E22] p-6">
              <p
                className="text-[10px] uppercase tracking-[0.25em] text-[#4E7A69]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                On their own website
              </p>
              <div className="mt-3 rounded-xl bg-[#FDF3E3] px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF9F27]" />
                  <p className="text-sm font-medium text-[#B4741A]">
                    Closing early today
                  </p>
                </div>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Open until 3:00 PM
                </p>
                <p className="text-xs text-[#8A7A5E]">Normally until 8:00 PM</p>
              </div>
              <p
                className="mt-3 text-[10px] text-[#8AA79B]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Kept current by OpenStatus
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight leading-tight">
              Simple pricing.
              <br />
              Real value.
            </h2>
            <p className="mt-3 text-[#4E7A69] leading-relaxed">
              Free keeps your page current. Unlimited puts that status wherever
              your customers already are.
            </p>
          </div>

          <div className="rounded-[26px] bg-white p-7">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Free
            </p>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $0
              <span className="ml-2 text-base font-normal text-[#78766F]">
                forever
              </span>
            </p>
            <p className="mt-3 text-sm text-[#4E7A69]">
              They check, and it is always right.
            </p>

            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#78766F]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full border border-[#0B2E22]/20 font-medium hover:border-[#0B2E22] transition"
            >
              Get started free
            </a>
          </div>

          <div className="rounded-[26px] bg-[#0B2E22] text-white p-7">
            <div className="flex items-center justify-between">
              <p
                className="text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Unlimited
              </p>
              <span
                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-[#1D9E75]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Most popular
              </span>
            </div>
            <p className="mt-3 text-5xl font-bold tracking-tight">
              $15
              <span className="ml-2 text-base font-normal text-white/60">
                / month
              </span>
            </p>
            <p className="mt-1 text-sm text-[#9FE1CB]">
              or $150 a year, saving 17%
            </p>
            <p className="mt-3 text-sm text-white/70">
              You reach them, wherever they are.
            </p>

            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>

            <a
              href="/signup"
              className="mt-7 block text-center py-3 rounded-full bg-[#1D9E75] font-medium hover:bg-white hover:text-[#0B2E22] transition"
            >
              Start with Unlimited
            </a>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[26px] bg-white px-8 py-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="text-[#1D9E75]">
              <Keyhole size={40} />
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">
                Keep posting there.
              </p>
              <p className="text-[#4E7A69]">We will take it from there.</p>
            </div>
          </div>
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#0B2E22] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.2em] text-[#78766F]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Log in
          </a>
        </div>
      </footer>
    </div>
  );
}
