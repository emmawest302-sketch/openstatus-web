const ignored = [
  'New fall drinks are here!!! Come try the maple latte',
  'Meet Sarah, our new barista. She makes a mean flat white',
  'Happy Sunday everyone, hope you get some rest',
];

const surfaced = [
  ['Closing at 2 today for maintenance.', 'Closing early today', 'Closing at 2:00 PM'],
  ['Heads up, we are cash only today, card reader is down.', 'Cash only today', 'Card reader is down'],
  ['Croissants are gone, more tomorrow morning!', 'Croissants sold out', 'More tomorrow morning'],
];

const steps = [
  ['01', 'Sign up', 'Free account. Two minutes.'],
  ['02', 'Connect Instagram', 'One time. Never again.'],
  ['03', 'We read your posts', 'Only what changes a visit.'],
  ['04', 'Your page updates', 'On its own. You do nothing.'],
  ['05', 'Customers know', 'Before they get in the car.'],
];

function Arrow({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={
        'inline-flex items-center justify-center w-7 h-7 rounded-full border shrink-0 ' +
        (dark ? 'border-[#0B2E22]' : 'border-white')
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      {children}
    </p>
  );
}

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#EFF7F2] text-[#0B2E22] overflow-x-hidden"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">OPENSTATUS</span>
        <nav className="flex items-center gap-2">
          <a
            href="/login"
            className="px-4 py-2 text-xs uppercase tracking-widest border border-[#0B2E22]/25 rounded-full hover:border-[#0B2E22] transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 text-xs uppercase tracking-widest bg-[#0B2E22] text-[#EFF7F2] font-bold rounded-full hover:bg-[#1D9E75] transition"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Get started
          </a>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        <Label>Before you go</Label>
        <h1 className="mt-6 text-[11vw] md:text-[6.6vw] font-bold leading-[0.88] tracking-[-0.045em]">
          YOUR CUSTOMERS
          <br />
          SHOULD KNOW
          <br />
          <span className="text-[#1D9E75]">WHAT CHANGED.</span>
        </h1>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-lg text-[#2C5648] leading-relaxed max-w-lg">
              OpenStatus is not another page of links. It is the one link in your
              Instagram bio that tells customers what changed today, pulled
              straight from what you already posted.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-[#1D9E75] text-white font-bold hover:bg-[#0F6E56] transition"
              >
                Get your link
                <Arrow />
              </a>
              <a
                href="/herban"
                className="inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full border border-[#0B2E22]/25 hover:border-[#0B2E22] transition"
              >
                See a live page
                <Arrow dark />
              </a>
            </div>
          </div>

          <div className="rounded-[28px] overflow-hidden">
            <img
              src="/hero.jpg.jpg"
              alt="Two people eating outside a local shop"
              className="w-full h-[340px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-[28px] bg-white p-8 sm:p-10">
          <Label>You post, we filter</Label>
          <p className="mt-4 text-xl text-[#2C5648] max-w-2xl leading-relaxed">
            We ask one question about everything you post. Could this change
            somebody&rsquo;s decision to visit today? Almost always the answer is
            no, and we stay quiet.
          </p>

          <div className="mt-8 grid gap-3">
            {ignored.map((c) => (
              <div
                key={c}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#F5F5F2] px-5 py-3.5"
              >
                <span
                  className="text-[10px] uppercase tracking-[0.2em] text-[#9C9A93] shrink-0"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Ignored
                </span>
                <span className="text-sm text-[#78766F]">{c}</span>
              </div>
            ))}

            {surfaced.map(([caption, headline, detail]) => (
              <div
                key={headline}
                className="rounded-2xl bg-[#E1F5EE] px-5 py-4 border border-[#1D9E75]/30"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] text-[#0F6E56] shrink-0"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Surfaced
                  </span>
                  <span className="text-sm text-[#2C5648]">{caption}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-[#1D9E75]/25">
                  <p className="font-bold tracking-tight">{headline}</p>
                  <p className="text-sm text-[#2C5648]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-[28px] overflow-hidden relative">
          <img
            src="/street.jpg.jpg"
            alt="Two people sitting outside a shopfront"
            className="w-full h-[420px] object-cover"
          />
          <div className="absolute inset-0 bg-[#0B2E22]/60" />
          <div className="absolute inset-0 flex items-end p-8 sm:p-12">
            <div>
              <p className="text-2xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
                A snow storm closed the shop at two. It went up on Instagram
                right away. People still showed up at four.
              </p>
              <p
                className="mt-5 text-[11px] uppercase tracking-[0.25em] text-[#9FE1CB]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                You already posted it
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <Label>Where each one fits</Label>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Instagram', 'Tells your story'],
            ['Your website', 'Explains who you are'],
            ['Google', 'Says where you are'],
            ['OpenStatus', "What's happening right now"],
          ].map(([who, what], i) => (
            <div
              key={who}
              className={
                'rounded-2xl p-5 ' +
                (i === 3
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-white text-[#0B2E22]')
              }
            >
              <p className="font-bold tracking-tight">{who}</p>
              <p
                className={
                  'mt-1 text-sm ' + (i === 3 ? 'text-[#E1F5EE]' : 'text-[#78766F]')
                }
              >
                {what}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <Label>How it works</Label>
        <div className="mt-4 divide-y divide-[#0B2E22]/10">
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
              <span className="text-[#78766F]">{body}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[28px] bg-[#0B2E22] text-white p-10 sm:p-16 text-center">
          <h2 className="text-4xl sm:text-6xl font-bold tracking-[-0.04em] leading-[0.92]">
            YOUR MOST IMPORTANT
            <br />
            <span className="text-[#9FE1CB]">UPDATES. IMPOSSIBLE</span>
            <br />
            TO MISS.
          </h2>
          <a
            href="/signup"
            className="inline-flex items-center gap-3 mt-10 pl-7 pr-2 py-2.5 rounded-full bg-[#1D9E75] text-white font-bold hover:bg-white hover:text-[#0B2E22] transition"
          >
            Get your OpenStatus link
            <Arrow />
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div
          className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-[#0B2E22]/10 text-[11px] uppercase tracking-[0.25em] text-[#4E7A69]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-[#0B2E22] transition">
            Sign in
          </a>
        </div>
      </footer>
    </div>
  );
}
