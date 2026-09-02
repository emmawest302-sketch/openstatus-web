import Image from 'next/image';
import Link from 'next/link';

const freeFeatures = [
  'Your own openstatus.co link',
  'Instagram connection',
  'Unlimited automatic updates',
  'Automatic expiry',
  'Regular hours + quick links',
  'Website status embed',
  'Manual corrections',
];

const proFeatures = [
  'Visitor and tap analytics',
  'Change performance',
  'Busiest-day trends',
  'SMS alerts',
  'Subscriber management',
  'More brand control',
];

function Keyhole({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="keyhole-mask">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#keyhole-mask)" />
    </svg>
  );
}

function Arrow({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </svg>
  );
}

function Eyebrow({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p className={`font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${dark ? 'text-white/55' : 'text-black/55'}`}>
      {'// '}{children}
    </p>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F4F1E8] text-[#0A0A0A]" style={{ fontFamily: 'var(--font-display)' }}>
      <div className="bg-[#A7E348] px-4 py-2.5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black">
        The door changes. Your link keeps up. <span aria-hidden="true">↗</span>
      </div>

      <header className="relative z-50 border-b-2 border-black bg-[#F4F1E8]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="OpenStatus home">
            <span className="text-black"><Keyhole size={27} /></span>
            <span className="text-lg font-bold tracking-[-0.03em]">OPENSTATUS</span>
          </Link>

          <nav className="hidden items-center gap-8 font-mono text-[10px] font-bold uppercase tracking-[0.14em] md:flex" aria-label="Main navigation">
            <a href="#how" className="underline-offset-4 hover:underline">How it works</a>
            <a href="#pricing" className="underline-offset-4 hover:underline">Pricing</a>
            <Link href="/herban" className="underline-offset-4 hover:underline">Live example</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden border-2 border-black px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition hover:bg-black hover:text-white sm:block">
              Log in
            </Link>
            <Link href="/signup" className="flex items-center gap-2 border-2 border-black bg-black px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#A7E348] hover:text-black">
              Get your link <Arrow size={16} />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100svh-108px)] border-b-2 border-black bg-black text-white">
        <Image
          src="/image.png"
          alt="Two local business workers photographed with direct flash"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/42" />
        <div className="photo-vignette absolute inset-0" />
        <div className="noise absolute inset-0 opacity-35" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-108px)] max-w-[1440px] flex-col px-5 py-7 md:px-8 md:py-9">
          <div className="grid grid-cols-2 gap-4 font-mono text-[9px] font-bold uppercase leading-relaxed tracking-[0.16em] text-white/75 md:grid-cols-3 md:text-[10px]">
            <p>The hours online say open.<br />The lights say otherwise.</p>
            <p className="hidden text-center md:block">Live status for local businesses<br />No app required</p>
            <p className="text-right">Nashville, Franklin + beyond<br />Built for right now</p>
          </div>

          <div className="my-auto py-20 text-center">
            <Eyebrow dark>Know before you go</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-6xl text-[clamp(4rem,11vw,10rem)] font-bold uppercase leading-[0.78] tracking-[-0.075em]">
              Are they<br />
              <span className="text-[#A7E348]">actually open?</span>
            </h1>
            <p className="mx-auto mt-8 max-w-xl text-base font-medium leading-relaxed text-white/80 md:text-lg">
              One link that shows customers what is true right now—current hours, closures, sold-out items, pop-ups, and the updates they would otherwise miss.
            </p>
          </div>

          <div className="grid items-end gap-5 md:grid-cols-[1fr_auto_1fr]">
            <div className="hidden font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-white/55 md:block">
              Post like you already do.<br />OpenStatus handles the rest.
            </div>
            <Link href="/signup" className="group flex min-w-[250px] items-center justify-between border-2 border-white bg-white px-5 py-4 font-bold uppercase tracking-tight text-black transition hover:border-[#A7E348] hover:bg-[#A7E348]">
              Start free
              <span className="transition-transform group-hover:translate-x-1"><Arrow /></span>
            </Link>
            <Link href="/herban" className="justify-self-end font-mono text-[10px] font-bold uppercase tracking-[0.15em] underline decoration-1 underline-offset-4 hover:text-[#A7E348]">
              See a live business ↗
            </Link>
          </div>
        </div>
      </section>

      <div className="ticker border-b-2 border-black bg-[#A7E348] py-3 font-mono text-xs font-bold uppercase tracking-[0.2em]">
        <div className="ticker-track">
          <span>Closing early today&nbsp;&nbsp;◆&nbsp;&nbsp;Sold out&nbsp;&nbsp;◆&nbsp;&nbsp;Pop-up moved&nbsp;&nbsp;◆&nbsp;&nbsp;Opening late&nbsp;&nbsp;◆&nbsp;&nbsp;Private event&nbsp;&nbsp;◆&nbsp;&nbsp;</span>
          <span aria-hidden="true">Closing early today&nbsp;&nbsp;◆&nbsp;&nbsp;Sold out&nbsp;&nbsp;◆&nbsp;&nbsp;Pop-up moved&nbsp;&nbsp;◆&nbsp;&nbsp;Opening late&nbsp;&nbsp;◆&nbsp;&nbsp;Private event&nbsp;&nbsp;◆&nbsp;&nbsp;</span>
        </div>
      </div>

      <section className="border-b-2 border-black" id="how">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[0.75fr_1.25fr]">
          <div className="border-b-2 border-black p-6 md:p-10 lg:border-b-0 lg:border-r-2">
            <Eyebrow>What OpenStatus does</Eyebrow>
            <p className="mt-8 max-w-sm font-serif text-3xl italic leading-tight md:text-4xl">
              The internet should not make people guess whether the door will be open.
            </p>
          </div>
          <div className="p-6 md:p-10 lg:p-14">
            <h2 className="max-w-4xl text-[clamp(3.2rem,7.5vw,7.2rem)] font-bold uppercase leading-[0.83] tracking-[-0.065em]">
              One post.<br />One link.<br />The actual answer.
            </h2>
            <div className="mt-10 grid gap-6 border-t-2 border-black pt-7 md:grid-cols-2">
              <p className="max-w-md text-lg leading-relaxed">
                You post an update on Instagram. OpenStatus spots the useful part and turns it into a clean live notice for customers.
              </p>
              <p className="max-w-md text-lg leading-relaxed text-black/60">
                When the change is over, the notice expires automatically and your page goes back to showing regular hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid md:grid-cols-3">
            {[
              ['01', 'POST', 'Share the update where you already have your audience.'],
              ['02', 'OPENSTATUS READS', 'We identify only the details that could change someone’s trip.'],
              ['03', 'CUSTOMERS KNOW', 'Your status link and website show the current answer immediately.'],
            ].map(([number, title, body], index) => (
              <article key={number} className={`min-h-[320px] p-6 md:p-9 ${index < 2 ? 'border-b-2 border-black md:border-b-0 md:border-r-2' : ''}`}>
                <p className="font-mono text-xs font-bold tracking-[0.18em]">/{number}</p>
                <h3 className="mt-16 text-4xl font-bold uppercase tracking-[-0.05em] md:text-5xl">{title}</h3>
                <p className="mt-5 max-w-xs text-base leading-relaxed text-black/60">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#111] text-white">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">
          <div className="relative min-h-[520px] border-b-2 border-white/25 lg:border-b-0 lg:border-r-2">
            <Image src="/herban-market-franklin-sign-768x1024.jpg" alt="A local business sign" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover grayscale" />
            <div className="noise absolute inset-0 opacity-30" />
            <div className="absolute left-5 top-5 border border-white bg-black/75 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] backdrop-blur-sm">
              A real place deserves a real answer
            </div>
          </div>
          <div className="flex flex-col justify-between p-6 md:p-10 lg:p-14">
            <div>
              <Eyebrow dark>Live on every surface</Eyebrow>
              <h2 className="mt-5 text-[clamp(3.2rem,6vw,6.5rem)] font-bold uppercase leading-[0.84] tracking-[-0.06em]">
                Put it<br />where people<br /><span className="text-[#A7E348]">already look.</span>
              </h2>
            </div>
            <div className="mt-16 grid grid-cols-2 border-l border-t border-white/30 font-mono text-[10px] font-bold uppercase tracking-[0.12em] md:grid-cols-4">
              {['Instagram bio', 'Your website', 'QR code', 'Text alerts'].map((item) => (
                <div key={item} className="border-b border-r border-white/30 px-3 py-5">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-black bg-[#F4F1E8]" id="pricing">
        <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>Simple pricing</Eyebrow>
              <h2 className="mt-5 text-[clamp(3.5rem,7vw,7rem)] font-bold uppercase leading-[0.83] tracking-[-0.065em]">
                Status is<br /><span className="text-[#2F6B3B]">free.</span><br />Insight is pro.
              </h2>
              <p className="mt-8 max-w-md text-lg leading-relaxed text-black/60">
                Every business should be able to keep customers informed. Pay only when you want deeper insight and direct reach.
              </p>
            </div>

            <div className="border-2 border-black bg-white">
              <div className="grid md:grid-cols-2">
                <div className="border-b-2 border-black p-6 md:border-b-0 md:border-r-2 md:p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Free / forever</p>
                  <p className="mt-4 text-6xl font-bold tracking-[-0.06em]">$0</p>
                  <ul className="mt-8 space-y-3">
                    {freeFeatures.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm"><Check /><span>{item}</span></li>
                    ))}
                  </ul>
                  <Link href="/signup" className="group mt-9 flex items-center justify-between border-2 border-black bg-black px-4 py-3.5 text-sm font-bold uppercase text-white transition hover:bg-[#A7E348] hover:text-black">
                    Start free <Arrow size={18} />
                  </Link>
                </div>

                <div className="bg-[#A7E348] p-6 md:p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Pro / more signal</p>
                  <p className="mt-4 text-6xl font-bold tracking-[-0.06em]">$15<span className="ml-1 text-sm tracking-normal">/MO</span></p>
                  <ul className="mt-8 space-y-3">
                    {proFeatures.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm"><Check /><span>{item}</span></li>
                    ))}
                  </ul>
                  <Link href="/signup" className="group mt-9 flex items-center justify-between border-2 border-black bg-[#F4F1E8] px-4 py-3.5 text-sm font-bold uppercase transition hover:bg-black hover:text-white">
                    Start with Pro <Arrow size={18} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-b-2 border-black bg-[#2F6B3B] px-5 py-24 text-center text-white md:px-8 md:py-32">
        <div className="noise absolute inset-0 opacity-20" />
        <div className="relative mx-auto max-w-5xl">
          <Eyebrow dark>No more crossed fingers</Eyebrow>
          <h2 className="mt-6 text-[clamp(4rem,10vw,9rem)] font-bold uppercase leading-[0.8] tracking-[-0.075em]">
            Make the<br />link useful.
          </h2>
          <Link href="/signup" className="group mx-auto mt-10 flex max-w-sm items-center justify-between border-2 border-white bg-white px-5 py-4 font-bold uppercase text-black transition hover:border-[#A7E348] hover:bg-[#A7E348]">
            Get your OpenStatus link <Arrow />
          </Link>
          <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">Free forever · No credit card · Two-minute setup</p>
        </div>
      </section>

      <footer className="bg-[#0A0A0A] px-5 py-7 text-white md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2"><Keyhole size={18} /><span>OpenStatus</span></div>
          <p className="text-white/45">Know before you go.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-[#A7E348]">Log in</Link>
            <Link href="/signup" className="hover:text-[#A7E348]">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
