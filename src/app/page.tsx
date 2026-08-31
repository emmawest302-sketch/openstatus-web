const steps = [
  ['01', 'Sign up', 'Free account. Two minutes.'],
  ['02', 'Connect Instagram', 'One time. Never again.'],
  ['03', 'We read your posts', 'Anything a customer needs today.'],
  ['04', 'Your page updates', 'On its own. You do nothing.'],
  ['05', 'Customers know', 'Before they get in the car.'],
];

const examples = [
  [
    'Croissants are gone for today, more tomorrow morning!',
    'Croissants sold out',
    'More tomorrow morning',
  ],
  [
    'Closing at 3 today, roads are getting bad out there',
    'Closing early today',
    'Closing at 3:00 PM · Weather',
  ],
  [
    'We are parked at The Factory until 7 tonight!',
    "Today's location",
    'The Factory · Until 7:00 PM',
  ],
];

function Arrow({ light = false }: { light?: boolean }) {
  return (
    <span
      className={
        'inline-flex items-center justify-center w-7 h-7 rounded-full border shrink-0 ' +
        (light ? 'border-[#0B0B0B]' : 'border-white')
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path
          d="M5 12h13M12 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#0B0B0B] text-white overflow-x-hidden"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">OPENSTATUS</span>
        <nav className="flex items-center gap-2">
          <a
            href="/login"
            className="px-4 py-2 text-xs uppercase tracking-widest border border-white/30 rounded-full hover:border-white transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 text-xs uppercase tracking-widest bg-[#1D9E75] text-[#0B0B0B] font-bold rounded-full hover:bg-white transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Get started
          </a>
        </nav>
      </header>

      <section className="relative max-w-6xl mx-auto px-6 pt-10 pb-24">
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -right-40 -top-24 w-[620px] opacity-[0.13]"
          aria-hidden="true"
        >
          <mask id="khb">
            <rect width="100" height="100" fill="#fff" />
            <circle cx="50" cy="42" r="13" fill="#000" />
            <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
          </mask>
          <circle cx="50" cy="50" r="48" fill="#1D9E75" mask="url(#khb)" />
        </svg>

        <p
          className="text-[11px] uppercase tracking-[0.25em] text-[#1D9E75]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          For local businesses
        </p>

        <h1 className="relative mt-6 text-[13vw] md:text-[8.5vw] font-bold leading-[0.85] tracking-[-0.04em] whitespace-nowrap">
          YOUR BIO KNOWS
        </h1>
        <h1 className="relative text-[13vw] md:text-[8.5vw] font-bold leading-[0.85] tracking-[-0.04em] text-[#1D9E75] whitespace-nowrap">
          WHAT&rsquo;S HAPPENING
        </h1>

        <div className="relative mt-10 grid gap-10 md:grid-cols-2 md:items-end">
          <p className="text-lg text-white/70 leading-relaxed max-w-md">
            One link in your Instagram bio. Today&rsquo;s hours, what
            you&rsquo;re out of, where you&rsquo;re parked. You never update it.
          </p>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <a
              href="/signup"
              className="inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[#1D9E75] text-[#0B0B0B] font-bold hover:bg-white transition"
            >
              Get your link
              <Arrow light />
            </a>
            <a
              href="/herban"
              className="inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full border border-white/30 hover:border-white transition"
            >
              See a live page
              <Arrow />
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p
            className="text-[11px] uppercase tracking-[0.25em] text-white/40"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Why this exists
          </p>
          <p className="mt-6 text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            A snow storm closed the shop at two. It went up on Instagram right
            away. People still showed up at four.
          </p>
          <p
            className="mt-8 text-sm uppercase tracking-widest text-[#1D9E75]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            You already posted it
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <p
          className="text-[11px] uppercase tracking-[0.25em] text-white/40"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          You post, we translate
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {examples.map(([caption, headline, detail]) => (
            <div
              key={headline}
              className="rounded-3xl border border-white/10 p-6 hover:border-[#1D9E75] transition"
            >
              <p
                className="text-xs text-white/50 leading-relaxed"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                &ldquo;{caption}&rdquo;
              </p>
              <div className="my-5 text-[#1D9E75]">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <path
                    d="M12 5v14M5 12l7 7 7-7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-xl font-bold tracking-tight">{headline}</p>
              <p className="mt-1 text-sm text-white/60">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <p
            className="text-[11px] uppercase tracking-[0.25em] text-white/40"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            How it works
          </p>
          <div className="mt-8 divide-y divide-white/10">
            {steps.map(([n, title, body]) => (
              <div
                key={n}
                className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-5"
              >
                <span
                  className="text-[#1D9E75] text-sm w-8"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {n}
                </span>
                <span className="text-2xl font-bold tracking-tight min-w-[240px]">
                  {title}
                </span>
                <span className="text-white/60">{body}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-20 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 p-8">
            <p
              className="text-[11px] uppercase tracking-[0.25em] text-white/40"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Link in bio tools ask
            </p>
            <p className="mt-4 text-2xl font-bold tracking-tight text-white/60">
              Where do you want to go?
            </p>
          </div>
          <div className="rounded-3xl bg-[#1D9E75] text-[#0B0B0B] p-8">
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              OpenStatus asks
            </p>
            <p className="mt-4 text-2xl font-bold tracking-tight">
              What do you need to know before you go?
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl sm:text-7xl font-bold tracking-[-0.04em] leading-[0.9]">
            ALL YOUR INFO.
            <br />
            <span className="text-[#1D9E75]">ONE LINK.</span>
          </h2>
          <a
            href="/signup"
            className="inline-flex items-center gap-3 mt-10 pl-7 pr-2 py-2.5 rounded-full bg-[#1D9E75] text-[#0B0B0B] font-bold hover:bg-white transition"
          >
            Get your OpenStatus link
            <Arrow light />
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div
          className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.25em] text-white/40"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-white transition">
            Sign in
          </a>
        </div>
      </footer>
    </div>
  );
}
