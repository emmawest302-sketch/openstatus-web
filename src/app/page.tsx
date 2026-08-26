const steps = [
  {
    n: '01',
    title: 'Connect once',
    body: 'Link Instagram and your Google listing. Five clicks, then you never come back.',
  },
  {
    n: '02',
    title: 'Post like normal',
    body: 'Closing early for snow? Say so on Instagram the way you already do.',
  },
  {
    n: '03',
    title: 'Hours fix themselves',
    body: 'We read it and update where people actually look you up.',
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

      <section className="max-w-5xl mx-auto px-6 pt-14 pb-12">
        <span className="inline-block text-xs px-3 py-1.5 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
          For small businesses
        </span>
        <h1 className="mt-6 text-5xl sm:text-6xl font-medium tracking-tighter leading-[0.95] max-w-3xl">
          You said you were closed.
          <br />
          <span className="text-[#1D9E75]">Google didn't know.</span>
        </h1>
        <p className="mt-6 text-lg text-[#44443F] max-w-xl leading-relaxed">
          OpenStatus reads the updates you already post and keeps your real
          hours right everywhere people check. You post once. That's it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/signup"
            className="px-6 py-3 rounded-full bg-[#1D9E75] text-white font-medium hover:bg-[#0F6E56] transition"
          >
            Connect your business
          </a>
          <a
            href="/login"
            className="px-6 py-3 rounded-full border border-[#0B0B0B] font-medium hover:bg-[#0B0B0B] hover:text-white transition"
          >
            I have an account
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="rounded-3xl bg-[#0B0B0B] text-white p-8 sm:p-12">
          <p className="text-2xl sm:text-3xl font-medium tracking-tight leading-snug max-w-3xl">
            A snow storm closed the shop at two. It went up on Instagram right
            away. People still showed up at four, because Google still said open
            till eight.
          </p>
          <p className="mt-6 text-[#9FE1CB]">
            That's the whole reason this exists.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-medium tracking-tight mb-10">
          How it works
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl bg-white border border-[#EAE7DF] p-6"
            >
              <span className="text-sm text-[#1D9E75] font-medium">{s.n}</span>
              <h3 className="mt-3 text-lg font-medium tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-[#5F5E5A] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-medium tracking-tight mb-3">
          Where your hours land
        </h2>
        <p className="text-[#5F5E5A] mb-8 max-w-xl">
          We'd rather tell you what works today than promise everything and
          explain later.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#1D9E75] text-white p-6">
            <p className="font-medium text-lg">Google Maps</p>
            <p className="mt-1 text-sm text-[#E1F5EE]">Live</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#EAE7DF] p-6">
            <p className="font-medium text-lg">Apple Maps</p>
            <p className="mt-1 text-sm text-[#5F5E5A]">Coming soon</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#EAE7DF] p-6">
            <p className="font-medium text-lg">Your status page</p>
            <p className="mt-1 text-sm text-[#5F5E5A]">Live</p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-[#E1F5EE] p-10 sm:p-14 text-center">
          <h2 className="text-4xl font-medium tracking-tighter leading-tight">
            Stop losing people
            <br />
            to old hours.
          </h2>
          <p className="mt-4 text-[#0F6E56]">Setup takes five minutes, once.</p>
          <a
            href="/signup"
            className="inline-block mt-8 px-7 py-3 rounded-full bg-[#0B0B0B] text-white font-medium hover:bg-[#1D9E75] transition"
          >
            Get started
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
