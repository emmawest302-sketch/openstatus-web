'use client';

import { brandGlyph } from '@/lib/brand-icons';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';
import { platformKeyFor, socialHref } from '@/lib/social-url';

// Accepts both Record<string,string> (builder format) and legacy Social[] format
type SocialsInput = Record<string, string> | Array<{ id?: string; label: string; url?: string; on?: boolean }>;

/**
 * Official marks, one ink. These were hand-drawn approximations (the YouTube
 * one even painted its play triangle solid white, which breaks on any dark
 * page), and they disagreed with the builder preview's coloured set. Both now
 * come from the same generated paths in lib/brand-icons.
 */
const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok'    },
  { key: 'facebook',  label: 'Facebook'  },
  { key: 'twitter',   label: 'X'         },
  { key: 'youtube',   label: 'YouTube'   },
].map(p => {
  const glyph = brandGlyph(p.key);
  return {
    ...p,
    icon: glyph
      ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={glyph.path}/>
        </svg>
      )
      : null,
  };
});

function normalizeSocials(socials: SocialsInput): Array<{ key: string; url: string; label: string }> {
  const out: Array<{ key: string; url: string; label: string }> = [];

  if (Array.isArray(socials)) {
    for (const s of socials) {
      if (s.on === false) continue;
      const href = socialHref(s.url ?? '');
      if (!href) continue;
      const key = platformKeyFor(s.id ?? s.label ?? '') ?? platformKeyFor(href) ?? '';
      if (!key) continue;
      out.push({ key, url: href, label: PLATFORMS.find(p => p.key === key)?.label ?? s.label });
    }
  } else {
    for (const p of PLATFORMS) {
      const href = socialHref(socials[p.key] ?? '');
      if (!href) continue;
      out.push({ key: p.key, url: href, label: p.label });
    }
  }

  // One button per platform, in the order PLATFORMS declares, so two legacy
  // entries for the same network don't render twice.
  const seen = new Set<string>();
  return out
    .filter(i => (seen.has(i.key) ? false : (seen.add(i.key), true)))
    .sort((a, b) => PLATFORMS.findIndex(p => p.key === a.key) - PLATFORMS.findIndex(p => p.key === b.key));
}

export default function PublicSocialLinks({
  socials, businessId, dark = false,
}: { socials: SocialsInput; businessId: string; dark?: boolean }) {
  const items = normalizeSocials(socials);
  if (!items.length) return null;

  // These were a hardcoded #292929 on a 6%-black circle, with no idea whether
  // the page behind them was light or dark. On any dark background the whole
  // row was charcoal on charcoal.
  const ink = dark ? 'rgba(255,255,255,0.86)' : '#292929';
  const chip = dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
  const chipHover = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '8px 0 4px',
    }}>
      {items.map(({ key, url, label }) => {
        const platform = PLATFORMS.find(p => p.key === key);
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            onClick={() => trackOpenStatusEvent(businessId, 'social_click', key)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              background: chip,
              color: ink,
              textDecoration: 'none',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = chipHover; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = chip; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            {platform?.icon ?? <span style={{ fontSize: 13, fontWeight: 700 }}>{label.slice(0, 2)}</span>}
          </a>
        );
      })}
    </div>
  );
}
