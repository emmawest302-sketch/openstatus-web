'use client';

import { trackOpenStatusEvent } from '@/components/analytics-tracker';

// Accepts both Record<string,string> (builder format) and legacy Social[] format
type SocialsInput = Record<string, string> | Array<{ id?: string; label: string; url?: string; on?: boolean }>;

function href(value: string) {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )},
  { key: 'tiktok', label: 'TikTok', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.57a8.16 8.16 0 0 0 4.77 1.52V7.64a4.85 4.85 0 0 1-1-.95z"/>
    </svg>
  )},
  { key: 'facebook', label: 'Facebook', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )},
  { key: 'twitter', label: 'X', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )},
  { key: 'youtube', label: 'YouTube', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  )},
];

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
