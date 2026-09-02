const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing'],
  ['Your own website', 'A live status block above your hours'],
  ['Your status page', 'Shareable, QR-able, always current'],
  ['Your regulars', 'A text when something actually changes'],
];

const freeFeatures = [
  ['Your own status page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Unlimited automatic updates', 'Closing early, closed today, opening late'],
  ['Automatic expiry', 'Back to normal on its own, every time'],
  ['Regular hours', 'Always shown, always current'],
  ['Quick links', 'Menu, order, directions, reserve and more'],
  ['Website embed', 'The same live status on your own site'],
  ['Manual override', 'Set or correct anything yourself'],
];

const proFeatures = [
  ['Who is checking', 'How many people, and when'],
  ['What they tapped', 'Directions, menu, order, website'],
  ['Change performance', 'How many people saw a closure notice'],
  ['Trends over time', 'Busiest days, busiest hours'],
  ['SMS alerts', 'Text your opted-in customers when things change'],
  ['Subscriber list', 'See and manage who has opted in'],
  ['More customisation', 'Match the page to your brand'],
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

function Tick({ light = false }: { light?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" className={'shrink-0 mt-1 ' + (light ? 'text-[#AAC1AD]' : 'text-[#537987]')} aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SampleCard() {
  return (
    <div className="w-full max-w-[330px] rounded-[26px] bg-white border border-[#E9633E]/20 p-5 shadow-[0_20px_60px_rgba(83,121,135,0.2)]">
      <div className="flex items-center gap-3">
        <img src="/images.png" alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[#AAC1AD]/40" />
        <div>
          <p className="font-bold text-[15px] tracking-tight text-[#1A1A18]">Herban Market</p>
          <p className="text-xs text-[#6C6A62]">Grocery &amp; coffee · Columbia, TN</p>
        </div>
      </div>
      <p className="mt-5 text-[10px] uppercase tracking-[0.25em] text-[#537987] font-bold">Before you go</p>
      <div className="mt-2 rounded-[18px] bg-[#EAAA42]/15 border border-[#EAAA42]/30 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E9633E]" />
          <p className="font-medium text-[#E9633E] text-sm">Closing early today</p>
        </div>
        <p className="mt-2 text-[22px] font-bold tracking-tight text-[#1A1A18]">Closing at 3:00 PM</p>
        <p className="text-sm text-[#6C6A62]">Normally until 8:00 PM</p>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-[11px] text-[#537987]">
        {['Directions', 'Menu', 'Call', 'Website'].map((l) => (
          <span key={l} className="rounded-xl border border-[#537987]/20 py-2.5 bg-[#537987]/5">{l}</span>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1A1A18]" style={{ fontFamily: 'var(--font-display)' }}>

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[#FAF8F4]/90 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[#537987]"><Keyhole size={24} /></span>
            <span className="text-lg font-bold tracking-[0.02em] text-[#537987]">OPENSTATUS</span>
          </div>
          <nav className="flex items-center gap-2">
            <a href="/login" className="px-4 py-2 text-sm text-[#6C6A62] hover:text-[#1A1A18] transition">Log in</a>
            <a href="/signup" className="px-5 py-2.5 text-sm font-semibold bg-[#537987] text-white rounded-full hover:bg-[#E9633E] transition">Get started free</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 rounded-full bg-[#E9633E]/10 text-[#E9633E] border border-[#E9633E]/20">
            ✦ no app download required
          </span>
          <h1 className="mt-7 text-6xl font-bold tracking-[-0.04em] leading-[0.95]">
            Your hours change.<br />
            <span className="text-[#E9633E]">Your link doesn&rsquo;t.</span>
          </h1>
          <p className="mt-6 text-xl text-[#6C6A62] leading-relaxed max-w-md">
            Post on Instagram like you always do. OpenStatus turns it into live info on your status page, your website, and in your customers&rsquo; hands.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/signup" className="px-7 py-3.5 rounded-full bg-[#537987] text-white font-semibold hover:bg-[#E9633E] transition text-base">Get your link — it&rsquo;s free</a>
            <a href="/herban" className="px-7 py-3.5 rounded-full bg-white border border-black/10 font-semibold text-[#1A1A18] hover:border-[#537987] transition text-base">See an example →</a>
          </div>
          <p className="mt-5 text-sm text-[#9B998F]">Free forever. No credit card. Takes 2 minutes.</p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <SampleCard />
        </div>
      </section>

      {/* BANNER */}
      <section className="bg-[#537987] py-5">
        <p className="text-center text-white/80 text-sm tracking-wider uppercase font-semibold">
          Live status pages for local businesses · no app needed
        </p>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A0AF72]">How it works</span>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.03em] leading-tight">
              You post it once.<br />
              <span className="text-[#537987]">We put it everywhere.</span>
            </h2>
            <p className="mt-4 text-[#6C6A62] leading-relaxed max-w-md">
              OpenStatus watches your Instagram for what actually matters — early closures, special hours, pop-up events. It reads them so your customers don&rsquo;t have to guess.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {surfaces.map(([where, what], i) => {
              const colors = [
                'bg-[#E9633E]/8 border-[#E9633E]/20',
                'bg-[#EAAA42]/8 border-[#EAAA42]/20',
                'bg-[#A0AF72]/10 border-[#A0AF72]/20',
                'bg-[#537987]/8 border-[#537987]/20',
              ];
              const dots = ['bg-[#E9633E]', 'bg-[#EAAA42]', 'bg-[#A0AF72]', 'bg-[#537987]'];
              return (
                <div key={where} className={`rounded-[20px] border p-5 ${colors[i]}`}>
                  <span className={`w-2 h-2 rounded-full inline-block mb-3 ${dots[i]}`} />
                  <p className="font-semibold tracking-tight">{where}</p>
                  <p className="mt-1 text-sm text-[#6C6A62]">{what}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WEBSITE EMBED */}
      <section className="bg-[#1C2D32] py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="rounded-[24px] bg-white/5 border border-white/10 p-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#AAC1AD] font-bold">On their website</p>
            <div className="mt-3 rounded-[18px] bg-[#EAAA42]/20 border border-[#EAAA42]/30 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E9633E]" />
                <p className="text-sm font-medium text-[#E9633E]">Closing early today</p>
              </div>
              <p className="mt-1.5 text-xl font-bold tracking-tight text-white">Open until 3:00 PM</p>
              <p className="text-xs text-[#AAC1AD]">Normally until 8:00 PM</p>
            </div>
            <p className="mt-3 text-[10px] text-white/40 font-mono">Kept current by OpenStatus</p>
          </div>
          <div className="text-white">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3A58A]">Website embed</span>
            <h2 className="mt-3 text-4xl font-bold tracking-[-0.03em] leading-tight">
              Your website stops<br />telling people the{' '}
              <span className="text-[#EAAA42] italic">wrong thing.</span>
            </h2>
            <p className="mt-4 text-white/60 leading-relaxed">
              Paste one line into your site. From then on it shows whatever&rsquo;s actually true — taken from the posts you were already making. Free, like the rest of it.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A0AF72]">Pricing</span>
          <h2 className="mt-3 text-4xl font-bold tracking-[-0.03em] leading-tight">
            The status is free.{' '}
            <span className="text-[#537987] italic">Always.</span>
          </h2>
          <p className="mt-4 text-[#6C6A62] leading-relaxed">
            We don&rsquo;t charge a business to keep its customers informed. Pay only if you want to know who&rsquo;s checking — and reach them directly.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[26px] bg-white border border-black/8 p-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A0AF72]">Free</span>
            <p className="mt-3 text-5xl font-bold tracking-tight">$0<span className="ml-2 text-base font-normal text-[#6C6A62]">forever</span></p>
            <p className="mt-3 text-[#1A1A18] font-semibold">Keep customers in the know.</p>
            <p className="mt-1 text-sm text-[#6C6A62]">Live status, current hours, everything they need before they go.</p>
            <ul className="mt-6 space-y-3">
              {freeFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-[#6C6A62]">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <a href="/signup" className="mt-7 block text-center py-3.5 rounded-full bg-[#1A1A18] text-white font-semibold hover:bg-[#537987] transition">Get started free</a>
          </div>
          <div className="rounded-[26px] bg-[#537987] text-white p-8">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#AAC1AD]">Pro</span>
            <p className="mt-3 text-5xl font-bold tracking-tight">$15<span className="ml-2 text-base font-normal text-white/60">/ month</span></p>
            <p className="mt-1 text-sm text-[#AAC1AD]">or $150 a year — saving 17%</p>
            <p className="mt-3 font-semibold">Know who is checking.</p>
            <p className="mt-1 text-sm text-white/70">Analytics, insight, and tools to reach the people paying attention.</p>
            <ul className="mt-6 space-y-3">
              {proFeatures.map(([title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <Tick light />
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <a href="/signup" className="mt-7 block text-center py-3.5 rounded-full bg-[#E9633E] font-semibold hover:bg-[#EAAA42] hover:text-[#1A1A18] transition">Start with Pro</a>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="rounded-[30px] bg-[#E9633E] px-8 py-14 text-center text-white">
          <span className="text-[#EAAA42] text-3xl">✦</span>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.03em]">Keep posting there.</h2>
          <p className="mt-2 text-white/80 text-lg">We&rsquo;ll take it from there.</p>
          <a href="/signup" className="mt-8 inline-block px-8 py-4 rounded-full bg-white text-[#E9633E] font-bold text-base hover:bg-[#FAF8F4] transition">Get your OpenStatus link →</a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-black/10 text-[11px] uppercase tracking-[0.2em] text-[#9B998F]">
          <div className="flex items-center gap-2">
            <span className="text-[#537987]"><Keyhole size={16} /></span>
            <span>OpenStatus</span>
          </div>
          <a href="/login" className="hover:text-[#537987] transition">Log in</a>
        </div>
      </footer>
    </div>
  );
}
