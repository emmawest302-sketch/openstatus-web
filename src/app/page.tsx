'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const STATUS_CYCLE = ['Open', 'Busy', 'Closed'] as const;
type Status = (typeof STATUS_CYCLE)[number];

const STATUS_COLORS: Record<Status, string> = {
  Open: 'bg-emerald-500',
  Busy: 'bg-amber-400',
  Closed: 'bg-red-400',
};

const STATUS_LABEL: Record<Status, string> = {
  Open: 'Open now',
  Busy: 'Busy — order ahead',
  Closed: 'Closed',
};

function PhonePreview({ status }: { status: Status }) {
  return (
    <div className="w-[220px] rounded-[36px] bg-white shadow-2xl border border-neutral-100 overflow-hidden select-none">
      <div className="px-5 pt-3 pb-1 flex justify-between text-[9px] text-neutral-400">
        <span>9:41</span>
        <span>●●●</span>
      </div>
      <div className="px-5 pt-2 pb-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 mx-auto mb-2 flex items-center justify-center text-xl">
          ☕
        </div>
        <p className="font-semibold text-sm text-neutral-800">Corner Café</p>
        <p className="text-[10px] text-neutral-400 mb-2.5">Hayes Valley · San Francisco</p>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-all duration-500',
            STATUS_COLORS[status],
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="px-3 pb-5 space-y-2">
        {[
          { icon: '🗺️', label: 'Get directions', sub: '0.4 mi away' },
          { icon: '🍽️', label: 'View menu', sub: 'Updated today' },
          { icon: '📦', label: 'Order online', sub: 'Uber Eats · DoorDash' },
          { icon: '📅', label: 'Reserve a table', sub: 'OpenTable' },
        ].map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2.5 bg-neutral-50 rounded-xl px-3 py-2.5"
          >
            <span className="text-base">{b.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-800 leading-tight">{b.label}</p>
              <p className="text-[10px] text-neutral-400 leading-tight">{b.sub}</p>
            </div>
            <span className="ml-auto text-neutral-300 text-xs flex-shrink-0">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="text-2xl mb-3">{icon}</div>
      <p className="font-semibold text-white text-sm mb-1.5">{title}</p>
      <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function AnalyticsBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-medium tabular-nums">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStatusIdx((i) => (i + 1) % STATUS_CYCLE.length), 3500);
    return () => clearInterval(t);
  }, []);

  const currentStatus = STATUS_CYCLE[statusIdx];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold tracking-tight text-sm">OpenStatus</span>
          <div className="flex items-center gap-6">
            <a href="#how" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
              How it works
            </a>
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block">
              Features
            </a>
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-white text-black font-medium px-4 py-1.5 rounded-full hover:bg-white/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-14">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/6 border border-white/10 rounded-full px-3 py-1 text-xs text-white/55 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Free to get started — no credit card
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-[1.15] mb-5">
              One link.<br />
              Everything your<br />
              customers need.
            </h1>
            <p className="text-white/50 text-lg leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
              OpenStatus gives your business a single, beautiful page — with live hours, directions, your menu, ordering links, reservations, and more.
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

          {/* Phone mockup */}
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full scale-150 pointer-events-none" />
            <PhonePreview status={currentStatus} />
          </div>
        </div>
      </section>

      {/* ── STAT BAR ───────────────────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-white/[0.02]">
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

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3">Up and running in minutes</h2>
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
              title: 'Customers get everything',
              desc: 'Live hours, tap-to-navigate directions, your menu, order and booking links — all in one place, on any phone.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="relative">
              <p className="text-7xl font-black text-white/[0.035] leading-none mb-3 select-none">
                {step}
              </p>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Every block has a job</h2>
          <p className="text-white/40 text-sm max-w-xs mx-auto">
            Turn on only what's relevant to your business.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon="📍"
            title="Location & directions"
            desc="Live map and your address. Customers tap once to get turn-by-turn directions, so they never get lost."
          />
          <FeatureCard
            icon="🕐"
            title="Live hours & status"
            desc="Open, closed, or busy — update in seconds from your phone. Your status shows before customers even start driving."
          />
          <FeatureCard
            icon="🍽️"
            title="Menu"
            desc="Link a URL, upload a PDF, or connect your photos. Your menu is always one tap away, never buried."
          />
          <FeatureCard
            icon="📦"
            title="Online ordering"
            desc="Add your DoorDash, Uber Eats, Grubhub, or own ordering site. All your channels, one block."
          />
          <FeatureCard
            icon="📅"
            title="Reservations & booking"
            desc="Connect OpenTable, Resy, Calendly, Square, or any booking URL. Customers book without leaving your page."
          />
          <FeatureCard
            icon="📊"
            title="Analytics"
            desc="See which blocks get tapped, where traffic comes from, and what drives real visits — so you can focus on what works."
          />
        </div>
      </section>

      {/* ── ANALYTICS ──────────────────────────────────────────────────────── */}
      <section className="border-t border-white/8 bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">
              Know what customers<br />actually want
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-8 max-w-sm">
              See exactly which blocks get tapped, so you can stop guessing and start promoting the right things — whether that's your menu, your hours, or your ordering link.
            </p>
            <ul className="space-y-3">
              {[
                'Block tap counts and weekly trends',
                'Traffic sources — Instagram, Google, direct',
                'Peak times and day-of-week patterns',
                'Directions vs menu vs ordering split',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/55">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Analytics card */}
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

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-28 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Your customers are already looking.
        </h2>
        <p className="text-white/40 text-sm mb-10 max-w-xs mx-auto">
          Give them one link that answers every question.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-black font-semibold px-8 py-3.5 rounded-xl text-sm hover:bg-white/90 transition-colors"
        >
          Build your OpenStatus — free
        </Link>
        <p className="text-white/20 text-xs mt-4">No credit card. No monthly fee to start.</p>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
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
