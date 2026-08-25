const steps = [
  {
    n: '01',
    title: 'Connect once',
    body: 'Sign in, link your Instagram and your Google Business Profile. Five clicks. You never have to come back.',
  },
  {
    n: '02',
    title: 'We watch your posts',
    body: 'Closing early for a snow storm? Post it like you already do. We read the caption and understand what it means.',
  },
  {
    n: '03',
    title: 'Your hours update themselves',
    body: 'The change goes straight to where customers actually look. No second app, no dashboard to remember.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-white">
            OpenStatus
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="px-4 py-2 text-sm bg-white text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <p className="text-sm font-medium text-blue-400 mb-4">
          For small businesses that already post updates
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight max-w-3xl">
          You posted that you were closed. Your customers checked Google.
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          OpenStatus reads the updates you already put on Instagram and keeps
          your real hours current everywhere people look them up. You post once.
          We handle the rest.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <a
            href="/signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Connect your business
          </a>
          <a
            href="/login"
            className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold rounded-lg transition"
          >
            I already have an account
          </a>
        </div>
      </section>

      <section className="border-y border-slate-800/60 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-slate-300 leading-relaxed max-w-3xl text-lg">
            A snow storm closed the shop at two. It went up on Instagram right
            away. People still showed up at four, because the sign on the door
            was the only place that said so and Google still said open till
            eight. Nobody had time to go update four different websites. That is
            the whole reason this exists.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-white mb-12">How it works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="text-sm font-mono text-blue-400">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-2 text-slate-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-white mb-3">
            Where your hours go
          </h2>
          <p className="text-slate-400 mb-8 max-w-2xl">
            We would rather tell you exactly what works today than promise
            everything and explain later.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
            <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">
              <p className="font-semibold text-white">Google Maps</p>
              <p className="mt-1 text-sm text-emerald-400">Live</p>
            </div>
            <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">
              <p className="font-semibold text-white">Apple Maps</p>
              <p className="mt-1 text-sm text-amber-400">Coming soon</p>
            </div>
            <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/40">
              <p className="font-semibold text-white">Your status page</p>
              <p className="mt-1 text-sm text-emerald-400">Live</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800/60 bg-slate-900/40">
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white">
            Stop losing customers to old hours.
          </h2>
          <p className="mt-4 text-slate-400">
            Setup takes about five minutes, once.
          </p>
          <a
            href="/signup"
            className="inline-block mt-8 px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Get started
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-wrap gap-4 items-center justify-between text-sm text-slate-500">
          <span>OpenStatus</span>
          <a href="/login" className="hover:text-slate-300 transition">
            Sign in
          </a>
        </div>
      </footer>
    </div>
  );
}
