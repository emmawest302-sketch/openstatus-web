'use client';

import Link from 'next/link';

// ─── SOCIAL ICONS ─────────────────────────────────────────────────────────────

function IconInstagram({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function IconTikTok({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
    </svg>
  );
}

function IconLinkedIn({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── HERO — solid blue ── */}
      <section className="relative flex-1 flex flex-col overflow-hidden" style={{ minHeight: '100svh', background: 'linear-gradient(180deg, #3d7fc1 0%, #5296d8 40%, #6eaee4 100%)' }}>

        {/* ── NAV ── */}
        <nav className="relative z-10 w-full px-8 pt-7 flex items-center justify-between">
          <span className="text-white font-bold text-xl tracking-tight select-none drop-shadow-sm">
            OpenStatus
          </span>
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-white text-sm font-medium hover:text-white/75 transition-colors drop-shadow-sm"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-white text-[#111] text-sm font-semibold px-5 py-2 rounded-full hover:bg-white/90 transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* ── HEADLINE + CTA ── */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 pt-14">
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-white leading-[1.14] tracking-[-0.02em] max-w-2xl drop-shadow-sm">
            One Link is all your<br />customers need to stay up to date.
          </h1>

          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 bg-[#AADF1E] text-[#111] font-semibold px-8 py-3.5 rounded-full text-base hover:bg-[#99cf0e] transition-colors shadow-md"
          >
            Start Now for Free <span aria-hidden>→</span>
          </Link>
        </div>

        {/* spacer — lets the cloud chain fill the lower viewport naturally */}
        <div className="flex-1 min-h-[300px] sm:min-h-[420px]" />
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0f0f0f] py-7 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left — tagline */}
          <div className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.18em] leading-relaxed">
            FOR SMALL BUSINESSES<br />GO FURTHER.
          </div>

          {/* Center — nav links */}
          <div className="flex items-center gap-8">
            {['Features', 'Pricing', 'Support', 'Contact'].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase()}`}
                className="text-white/45 text-sm hover:text-white/70 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right — social + copyright */}
          <div className="flex items-center gap-5">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors">
              <IconInstagram size={18} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors">
              <IconTikTok size={16} />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/70 transition-colors">
              <IconLinkedIn size={18} />
            </a>
            <span className="w-px h-4 bg-white/15" />
            <span className="text-white/25 text-xs">© 2024 OpenStatus. All rights reserved.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
