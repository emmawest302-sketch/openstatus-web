'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── STATUS ───────────────────────────────────────────────────────────────────

const STATUS_CYCLE = ['Open', 'Busy', 'Closing Early', 'Closed'] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_DOT: Record<Status, string> = {
  Open: 'bg-emerald-500',
  Busy: 'bg-amber-400',
  'Closing Early': 'bg-orange-400',
  Closed: 'bg-red-400',
};

const STATUS_LABEL: Record<Status, string> = {
  Open: 'Open now',
  Busy: 'Busy right now',
  'Closing Early': 'Closing early today',
  Closed: 'Closed today',
};

// ─── ICONS ────────────────────────────────────────────────────────────────────

const ICON_PROPS = {
  fill: 'none' as const,
  stroke: 'currentColor' as const,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconMapPin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUtensils({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function IconShoppingBag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" x2="21" y1="6" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconCalendar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function IconBarChart({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...ICON_PROPS}>
      <line x1="18" x2="18" y1="20" y2="10" />
      <line x1="12" x2="12" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </svg>
  );
}

function IconCheck({ size = 9, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconX({ size = 8, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── PHONE PREVIEW ────────────────────────────────────────────────────────────

function PhonePreview({ status }: { status: Status }) {
  return (
    <div className="w-[220px] rounded-[36px] bg-white shadow-2xl border border-black/8 overflow-hidden select-none">
      <div className="relative h-[252px] overflow-hidden">
        <Image
          src="/emmas-header.webp"
          alt="Breakfast plates on a café table"
          fill
          sizes="220px"
          className="object-cover object-center"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/65" />

        <div className="absolute inset-x-0 top-0 z-10 px-5 pt-3 flex justify-between text-[9px] font-medium text-white/80">
          <span>9:41</span>
          <span>●●●</span>
        </div>

        <div className="absolute inset-x-0 top-10 z-10 px-4 text-center text-white">
          <div className="w-[58px] h-[58px] rounded-full bg-white mx-auto mb-2.5 flex items-center justify-center shadow-lg ring-1 ring-black/5">
            <span className="text-[11px] font-black tracking-[-0.05em] text-neutral-900">EMMA&rsquo;S</span>
          </div>
          <p className="text-[9px] font-medium text-white/85">123 Main Street · Franklin, TN</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            {['Coffee', 'Breakfast', 'Bakery'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/30 bg-black/20 px-2 py-1 text-[7px] font-medium text-white/90 backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl border border-white/25 bg-neutral-950/65 px-3.5 py-3 text-white shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.16em] text-white/60">Live status</p>
              <p className="mt-1 text-base font-semibold tracking-tight transition-all duration-500">{STATUS_LABEL[status]}</p>
            </div>
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500',
                STATUS_DOT[status],
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pt-3">
        {['Website', 'Directions', 'Call'].map((label) => (
          <div key={label} className="rounded-xl bg-[#F5F5F5] px-1 py-2.5 text-center text-[9px] font-semibold text-neutral-700">
            {label}
          </div>
        ))}
      </div>

      <div className="px-3 pb-5 pt-2 space-y-2">
        {[
          { label: "Today's hours", sub: '7:00 AM – 3:00 PM' },
          { label: 'Usual weekly hours', sub: 'View the full schedule' },
        ].map((b) => (
          <div key={b.label} className="flex items-center rounded-xl bg-[#F5F5F5] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-tight text-neutral-800">{b.label}</p>
              <p className="text-[8px] leading-tight text-neutral-400">{b.sub}</p>
            </div>
            <span className="ml-auto flex-shrink-0 text-xs text-neutral-300">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center mb-3 text-white/60">
        {icon}
      </div>
      <p className="font-semibold text-white text-sm mb-1.5">{title}</p>
      <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── ANALYTICS BAR ────────────────────────────────────────────────────────────

function AnalyticsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-medium tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

// ─── BRAND SHOWCASE ───────────────────────────────────────────────────────────

const BRAND_SHOWCASE_CARDS = [
  {
    name: 'Aster Salon',
    status: 'Appointments today',
    mark: 'A',
    image: '/brand-showcase/aster-salon.webp',
    alt: 'A salon guest relaxing with a face mask',
    position: 'object-[center_28%]',
    tilt: 'lg:-rotate-1',
  },
  {
    name: 'Southbound',
    status: 'Kitchen open until 10',
    mark: 'S',
    image: '/brand-showcase/southbound.webp',
    alt: 'Avocado toast plated with fresh vegetables and edible flowers',
    position: 'object-center',
    tilt: 'lg:rotate-1',
  },
  {
    name: 'Marlow Goods',
    status: '4 spots left tonight',
    mark: 'M',
    image: '/brand-showcase/marlow-goods.webp',
    alt: 'Fresh ingredients being prepared behind the counter',
    position: 'object-center',
    tilt: 'lg:-rotate-1',
  },
  {
    name: 'FieldHouse',
    status: 'Open until 8',
    mark: 'F',
    image: '/brand-showcase/fieldhouse.webp',
    alt: 'Protective tanning goggles under purple studio lights',
    position: 'object-center',
    tilt: 'lg:rotate-1',
  },
] as const;

function BrandShowcaseCard({ card }: { card: (typeof BRAND_SHOWCASE_CARDS)[number] }) {
  return (
    <article
      className={cn(
        'group relative isolate min-h-[310px] overflow-hidden rounded-[30px] bg-neutral-900 shadow-[0_24px_70px_rgba(0,0,0,0.10)] sm:min-h-[360px]',
        card.tilt,
      )}
    >
      <Image
        src={card.image}
        alt={card.alt}
        fill
        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 24vw"
        className={cn('object-cover transition-transform duration-700 group-hover:scale-[1.03]', card.position)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/75" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-6 text-white">
        <span className="text-3xl font-black italic tracking-[-0.08em] drop-shadow-md">{card.mark}</span>
        <span className="flex items-center gap-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.2em] drop-shadow-md">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          Live
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
        <h3 className="text-2xl font-bold tracking-[-0.04em] drop-shadow-md">{card.name}</h3>
        <p className="mt-1 text-sm text-white/80 drop-shadow-md">{card.status}</p>
      </div>
    </article>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_CYCLE.length), 3500);
    return () => clearInterval(t);
  }, []);

  const currentStatus = STATUS_CYCLE[statusIdx];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-sm">OpenStatus</span>
          <div className="flex items-center gap-5">
            <a href="#how" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
              How it works
            </a>
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
              Features
            </a>
            <a href="#examples" className="text-sm text-white/50 hover:text-white transition-colors hidden md:block">
              Examples
            </a>
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-white text-black font-semibold px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors"
            >
              Create your page
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-14">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-3 py-1 text-xs text-white/55 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Free to start — no credit card
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.1] tracking-[-0.025em] mb-5">
              The live page<br />
              for your business.
            </h1>
            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              Hours, directions, your menu, ordering, reservations — one link, always current. Stop sending customers on a scavenger hunt.
            </p>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors text-sm"
              >
                Build your page — free
              </Link>
              <a
                href="#how"
                className="border border-white/15 text-white/65 px-6 py-3 rounded-xl hover:border-white/30 hover:text-white transition-colors text-sm"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-white/[0.04] blur-[80px] rounded-full scale-150 pointer-events-none" />
            <PhonePreview status={currentStatus} />
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="border-t border-white/8 bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-[-0.02em] mb-4">
              Your info is scattered.<br />
              <span className="text-white/30">Customers give up before they find you.</span>
            </h2>
            <p className="text-white/35 text-sm leading-relaxed max-w-sm mx-auto">
              Hours on Google, menu in your bio, booking link buried somewhere — one link fixes all of it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-5">Before</p>
              <div className="space-y-3">
                {[
                  'Hours on Google (when someone updates them)',
                  'Menu linked from your Instagram bio',
                  'Booking platform buried in a link tree',
                  'Address buried three clicks into your website',
                  'Phone number nowhere to be found',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-red-500/12 flex items-center justify-center flex-shrink-0">
                      <IconX size={7} color="rgb(252 165 165)" />
                    </span>
                    <p className="text-[12px] text-white/35 leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-5">With OpenStatus</p>
              <div className="space-y-3">
                {[
                  'Live hours and status — always accurate',
                  'Menu, ordering, and booking in one place',
                  'Tap-to-navigate directions from your page',
                  'One link for everywhere: bio, Google, signage',
                  'Updated in seconds from your phone',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <IconCheck size={8} color="rgb(52 211 153)" />
                    </span>
                    <p className="text-[12px] text-white/65 leading-snug">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BRAND SHOWCASE ── */}
      <section id="examples" className="overflow-hidden bg-white text-neutral-950">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-10 lg:py-32">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-black/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Looks like you
            </span>
            <h2 className="mt-9 text-5xl font-medium leading-[0.95] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
              Your brand<br />stays the hero.
            </h2>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-500 sm:text-lg">
              Logo, photography, colors and layout. Your OpenStatus should feel like your business built its own mobile page — not like a generic stack of buttons.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {BRAND_SHOWCASE_CARDS.map((card) => (
              <BrandShowcaseCard key={card.name} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATUS ── */}
      <section className="border-t border-white/8">
        <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live status
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-[-0.02em] mb-4">
              Your status, always current.
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mb-10 max-w-sm mx-auto lg:mx-0">
              Open, closing early, running a special — update in seconds from your phone. Customers see it before they start driving.
            </p>
            <div className="space-y-2 max-w-sm mx-auto lg:mx-0 text-left">
              {STATUS_CYCLE.map((s) => (
                <div
                  key={s}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-500',
                    currentStatus === s
                      ? 'border-white/12 bg-white/[0.05]'
                      : 'border-transparent',
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-500', STATUS_DOT[s])} />
                  <span className={cn(
                    'text-sm font-medium transition-all duration-500',
                    currentStatus === s ? 'text-white' : 'text-white/25',
                  )}>
                    {STATUS_LABEL[s]}
                  </span>
                  {currentStatus === s && (
                    <span className="ml-auto text-[10px] text-white/30 font-medium">Now showing</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-white/[0.03] blur-[80px] rounded-full scale-150 pointer-events-none" />
            <PhonePreview status={currentStatus} />
          </div>
        </div>
      </section>

      {/* ── STAT BAR ── */}
      <section className="border-t border-white/8 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: '2,481', label: 'Customer visits' },
            { value: '642', label: 'Direction taps' },
            { value: '381', label: 'Menu views' },
            { value: '219', label: 'Orders placed' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl lg:text-3xl font-bold text-white">{value}</p>
              <p className="text-white/35 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-[-0.02em] mb-3">Up and running in minutes</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">No developer. No monthly fee to start.</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-10">
          {[
            {
              step: '01',
              title: 'Build your page',
              desc: 'Pick your blocks — hours, menu, ordering, reservations, map — and customize colors and layout to match your brand.',
            },
            {
              step: '02',
              title: 'Share your link',
              desc: 'Add openstatus.co/yourname to your Instagram bio, Google listing, receipts, and signage. One link, everywhere.',
            },
            {
              step: '03',
              title: 'Customers find everything',
              desc: 'Live hours, tap-to-navigate directions, your menu, ordering and booking links — all in one place, on any phone.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step}>
              <p className="text-7xl font-black text-white/[0.04] leading-none mb-3 select-none">{step}</p>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-[-0.02em] mb-3">Every block has a job</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            Turn on only what&apos;s relevant to your business.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<IconMapPin size={18} />}
            title="Location & directions"
            desc="Live map and your address. Customers tap once to get turn-by-turn directions, so they never get lost."
          />
          <FeatureCard
            icon={<IconClock size={18} />}
            title="Live hours & status"
            desc="Open, closed, or busy — update in seconds from your phone. Your status shows before customers even start driving."
          />
          <FeatureCard
            icon={<IconUtensils size={18} />}
            title="Menu"
            desc="Link a URL, upload a PDF, or connect your photos. Your menu is always one tap away, never buried."
          />
          <FeatureCard
            icon={<IconShoppingBag size={18} />}
            title="Online ordering"
            desc="Add your DoorDash, Uber Eats, Grubhub, or own ordering site. All your channels, one block."
          />
          <FeatureCard
            icon={<IconCalendar size={18} />}
            title="Reservations & booking"
            desc="Connect OpenTable, Resy, Calendly, Square, or any booking URL. Customers book without leaving your page."
          />
          <FeatureCard
            icon={<IconBarChart size={18} />}
            title="Analytics"
            desc="See which blocks get tapped, where traffic comes from, and what drives real visits — so you can focus on what works."
          />
        </div>
      </section>

      {/* ── ANALYTICS ── */}
      <section className="border-t border-white/8 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-[-0.02em] mb-4">
              Know what customers<br />actually want
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm">
              See exactly which blocks get tapped, so you can stop guessing and start promoting the right things — whether that&apos;s your menu, your hours, or your ordering link.
            </p>
            <ul className="space-y-3">
              {[
                'Block tap counts and weekly trends',
                'Traffic sources — Instagram, Google, direct',
                'Peak times and day-of-week patterns',
                'Directions vs menu vs ordering split',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/55">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <IconCheck size={8} color="rgb(52 211 153)" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-shrink-0 bg-[#111] border border-white/8 rounded-2xl p-5 w-full lg:w-72">
            <div className="flex justify-between items-center mb-5">
              <p className="text-xs font-medium text-white/60">Last 30 days</p>
              <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-2 py-0.5">Corner Café</span>
            </div>
            <AnalyticsBar label="Directions" value={642} max={700} color="bg-blue-500" />
            <AnalyticsBar label="Menu views" value={381} max={700} color="bg-purple-500" />
            <AnalyticsBar label="Orders" value={219} max={700} color="bg-emerald-500" />
            <AnalyticsBar label="Booking clicks" value={97} max={700} color="bg-amber-400" />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-28 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/25 mb-6">
          Start for free
        </p>
        <h2 className="text-4xl lg:text-5xl font-bold tracking-[-0.025em] mb-4 leading-[1.1]">
          Your customers are looking.<br />
          <span className="text-white/35">Give them one place to land.</span>
        </h2>
        <p className="text-white/30 text-sm mb-10 max-w-xs mx-auto">
          No credit card. No developer. Live in minutes.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-black font-semibold px-8 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
        >
          Build your page — free
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/8 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-white/25 text-xs">
          <span>© 2026 OpenStatus</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-white/50 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-white/50 transition-colors">Sign up free</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
