const steps = [
  {
    n: '1',
    title: 'Sign up',
    body: 'Create your free OpenStatus account. Takes a couple of minutes.',
  },
  {
    n: '2',
    title: 'Connect Instagram',
    body: 'Securely link your Instagram business account. One time, that is it.',
  },
  {
    n: '3',
    title: 'We do the work',
    body: 'Our system reads your posts for anything a customer needs to know today.',
  },
  {
    n: '4',
    title: 'Your page updates',
    body: 'Sold out, closing early, new location. It lands on your page on its own.',
  },
  {
    n: '5',
    title: 'Customers know',
    body: 'They see what matters before they get in the car.',
  },
];

const examples = [
  {
    caption: 'Croissants are gone for today, more tomorrow morning!',
    headline: 'Croissants sold out',
    detail: 'More tomorrow morning',
  },
  {
    caption: 'Closing at 3 today, roads are getting bad out there',
    headline: 'Closing early today',
    detail: 'Closing at 3:00 PM · Weather',
  },
  {
    caption: 'We are parked at The Factory until 7 tonight!',
    headline: "Today's location",
    detail: 'The Factory · Until 7:00 PM',
  },
];

function Keyhole({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="#1D9E75" mask="url(#kh)" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#0B0B0B]">
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Keyhole size={30} />
          <span className="text-xl font-medium tracking-tight">OpenStatus</span>
        </div>
        <nav className="flex items-center gap-2">
          <a
            href="/login"
            className="px-4 py-2 text-sm rounded-full border border-[#0B0B0B] hover:bg-[#0B0B0B] hover:text-white transition"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 text-sm rounded-full bg-[#0B0B0B] text-white hover:bg-[#1D9E75] transition"
          >
            Get started
          </a>
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
              For local businesses
            </span>
            <h1 className="mt-6 text-5xl font-medium tracking-tighter leading-[0.95]">
              Your bio knows
              <br />
              <span className="text-[#1D9E75]">what&rsquo;s happening.</span>
            </h1>
            <p className="mt-6 text-lg text-[#44443F] leading-relaxed">
              One link in your Instagram bio. It shows today&rsquo;s hours, what
              you&rsquo;re out of, where you&rsquo;re parked, and everything
              else a customer needs before they visit. You never update it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/signup"
                className="px-6 py-3 rounded-full bg-[#1D9E75] text-white font-medium hover:bg-[#0F6E56] transition"
              >
                Get your OpenStatus link
              </a>
              <a
                href="/herban"
                className="px-6 py-3 rounded-full border border-[#0B0B0B] font-medium hover:bg-[#0B0B0B] hover:text-white transition"
              >
                See a live page
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-[#EAE7DF] p-6">
            <p className="text-xs text-[#9C9A93]">In their Instagram bio</p>
            <div className="mt-3 rounded-2xl border border-[#EAE7DF] p-4">
              <p className="font-medium">The Floured Apron</p>
              <p className="text-sm text-[#5F5E5A]">Bakery &amp; Cafe</p>
              <p className="mt-2 text-sm">Scratch made. Always.</p>
              <p className="mt-3 text-sm text-[#0F6E56]">
                Know before you go
                <br />
                openstatus.co/flouredapron
              </p>
            </div>

            <p className="mt-6 text-xs text-[#9C9A93]">
              What their customers see
            </p>
            <div className="mt-3 rounded-2xl bg-[#FBFAF7] border border-[#EAE7DF] p-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                <p className="text-sm font-medium">Open now · Closes at 5 PM</p>
              </div>
              <div className="mt-3 rounded-xl bg-white border border-[#EAE7DF] p-3">
                <p className="text-sm font-medium">Croissants sold out</p>
                <p className="text-xs text-[#5F5E5A]">More tomorrow morning</p>
                <p className="mt-1 text-xs text-[#9C9A93]">Posted 32 min ago</p>
              </div>
              <div className="mt-2 rounded-xl bg-[#FAEEDA] p-3">
                <p className="text-sm font-medium text-[#854F0B]">
                  Kitchen closes at 3 PM today
                </p>
                <p className="text-xs text-[#854F0B]">
                  Coffee and pastries until 5 PM
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-14">
        <div className="rounded-3xl bg-[#0B0B0B] text-white p-8 sm:p-12">
          <p className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug max-w-3xl">
            A snow storm closed the shop at two. It went up on Instagram right
            away. People still showed up at four, because nobody had time to
            update four different websites.
          </p>
          <p className="mt-6 text-[#9FE1CB]">
            You already posted it. We make sure your customers see it.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-medium tracking-tight">
          You post. We translate.
        </h2>
        <p className="mt-3 text-[#5F5E5A] max-w-xl">
          Our system reads what you wrote and turns it into something a customer
          can act on. Temporary things disappear on their own.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {examples.map((e) => (
            <div
              key={e.headline}
              className="rounded-2xl bg-white border border-[#EAE7DF] p-5"
            >
              <p className="text-sm text-[#5F5E5A] italic">
                &ldquo;{e.caption}&rdquo;
              </p>
              <div className="my-4 border-t border-[#EAE7DF]" />
              <p className="font-medium">{e.headline}</p>
              <p className="mt-0.5 text-sm text-[#5F5E5A]">{e.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-medium tracking-tight mb-10">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl bg-white border border-[#EAE7DF] p-5"
            >
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#E1F5EE] text-[#0F6E56] text-sm font-medium">
                {s.n}
              </span>
              <h3 className="mt-3 font-medium tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[#5F5E5A] leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl bg-white border border-[#EAE7DF] p-7">
            <p className="text-sm text-[#9C9A93]">Link in bio tools answer</p>
            <p className="mt-2 text-xl font-medium tracking-tight">
              Where do you want to go?
            </p>
          </div>
          <div className="rounded-3xl bg-[#E1F5EE] p-7">
            <p className="text-sm text-[#0F6E56]">OpenStatus answers</p>
            <p className="mt-2 text-xl font-medium tracking-tight text-[#0B0B0B]">
              What do you need to know before you go?
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-white border border-[#EAE7DF] p-10 sm:p-14 text-center">
          <h2 className="text-4xl font-medium tracking-tighter leading-tight">
            All your important
            <br />
            business info in one link.
          </h2>
          <p className="mt-4 text-[#5F5E5A]">
            Set it up once. It keeps itself current.
          </p>
          <a
            href="/signup"
            className="inline-block mt-8 px-7 py-3 rounded-full bg-[#0B0B0B] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get your OpenStatus link
          </a>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#EAE7DF] text-sm text-[#5F5E5A]">
        <div className="flex items-center gap-2">
          <Keyhole size={20} />
          <span>OpenStatus</span>
        </div>
        <a href="/login" className="hover:text-[#0B0B0B] transition">
          Sign in
        </a>
      </footer>
    </div>
  );
}
