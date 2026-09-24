'use client';

import { brandGlyph } from '@/lib/brand-icons';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

// Accepts both Record<string,string> (builder format) and legacy Social[] format
type SocialsInput = Record<string, string> | Array<{ id?: string; label: string; url?: string; on?: boolean }>;

function href(value: string) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

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
  if (Array.isArray(socials)) {
    // Legacy array format: [{id, label, url, on}]
    return socials
      .filter(s => s.on !== false && s.url?.trim())
      .map(s => ({ key: s.label.toLowerCase(), url: s.url ?? '', label: s.label }));
  }
  // Record format: {instagram: 'url', tiktok: ''}
  return PLATFORMS
    .filter(p => socials[p.key]?.trim())
    .map(p => ({ key: p.key, url: socials[p.key], label: p.label }));
}

export default function PublicSocialLinks({ socials, businessId }: { socials: SocialsInput; businessId: string }) {
  const items = normalizeSocials(socials);
  if (!items.length) return null;

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
        const u = href(url);
        return (
          <a
            key={key}
            href={u}
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
              background: 'rgba(0,0,0,0.06)',
              color: '#292929',
              textDecoration: 'none',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            {platform?.icon ?? <span style={{ fontSize: 13, fontWeight: 700 }}>{label.slice(0, 2)}</span>}
          </a>
        );
      })}
    </div>
  );
}
