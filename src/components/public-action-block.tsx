'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type PublicActionBlockProps = { block: OpenStatusBlock; businessId: string };

function safeUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return '';
  if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) return raw;
  return `https://${raw}`;
}

type ProviderInfo = { name: string; color: string };

function detectProvider(url = ''): ProviderInfo | null {
  const v = url.toLowerCase();
  if (v.includes('doordash')) return { name: 'DoorDash', color: '#E63946' };
  if (v.includes('ubereats')) return { name: 'Uber Eats', color: '#06C167' };
  if (v.includes('grubhub')) return { name: 'Grubhub', color: '#F03940' };
  if (v.includes('squareup') || v.includes('square.site')) return { name: 'Square', color: '#1A1A1A' };
  if (v.includes('toasttab')) return { name: 'Toast', color: '#FF6B2B' };
  if (v.includes('calendly')) return { name: 'Calendly', color: '#0069FF' };
  if (v.includes('shopify')) return { name: 'Shopify', color: '#5A8A3B' };
  if (v.includes('opentable')) return { name: 'OpenTable', color: '#DA3743' };
  return null;
}

function BlockIcon({ id }: { id: string }) {
  const base = id.split('-')[0];
  const paths: Record<string, string> = {
    order: 'M7 8h10l-1 11H8L7 8zm2-3h6l1 3H8l1-3z',
    menu: 'M6 7h12M6 12h12M6 17h12',
    book: 'M7 4v3M17 4v3M5 9h14M6 6h12a1 1 0 011 1v12H5V7a1 1 0 011-1z',
    website: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21m0-18C9.8 5.5 8.7 8.5 8.7 12s1.1 6.5 3.3 9M3.5 12h17',
    call: 'M7 4l3 4-2 2c1.5 3 3 4.5 6 6l2-2 4 3-2 3c-1 1-3 .5-5-.5C8 17 5 14 3.5 9 3 7 3 5.5 4 5l3-1z',
    email: 'M4 6h16v12H4V6zm0 1l8 6 8-6',
    map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
    shop: 'M6 2l-1 4h14l-1-4H6zM5 6v14h14V6H5z',
    gift: 'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
    catering: 'M3 11l19-9-9 19-2-8-8-2z',
    events: 'M8 6V4M16 6V4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    careers: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    custom: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d={paths[base] ?? 'M5 12h14M14 7l5 5-5 5'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PublicActionBlock({ block, businessId }: PublicActionBlockProps) {
  const wide = block.id === 'website';
  const href = safeUrl(block.url);
  const provider = detectProvider(block.url);

  const classes = [
    wide ? 'col-span-2' : '',
    'border border-white/55 bg-white/72 text-black backdrop-blur-2xl',
    'flex min-h-[116px] flex-col justify-between rounded-[24px] p-4',
    'shadow-[0_14px_36px_rgba(0,0,0,.10)] transition',
    href ? 'cursor-pointer hover:-translate-y-0.5 hover:bg-white/82 active:scale-[.98]' : '',
  ].filter(Boolean).join(' ');

  const badge = provider
    ? (
      <span
        className="inline-flex items-center rounded-full px-2 py-1 text-[8px] font-bold text-white"
        style={{ backgroundColor: provider.color }}
      >
        {provider.name}
      </span>
    )
    : (
      <span className="grid h-8 w-8 place-items-center rounded-full border border-black/8 bg-white/60 text-black/45">
        <BlockIcon id={block.id} />
      </span>
    );

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[8px] font-bold uppercase tracking-[.14em] text-black/40">{block.title}</span>
        {badge}
      </div>
      <div>
        <strong className="block text-[18px] leading-tight tracking-[-.04em]">{block.title}</strong>
        {block.sub && <span className="mt-1 block text-[9px] text-black/50">{block.sub}</span>}
      </div>
    </>
  );

  return href
    ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes}
        onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
      >
        {content}
      </a>
    )
    : <div className={classes}>{content}</div>;
}
