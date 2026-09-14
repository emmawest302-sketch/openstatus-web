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

export default function PublicActionBlock({ block, businessId }: PublicActionBlockProps) {
  const wide = block.id === 'website';
  const tone = block.tone === 'dark'
    ? 'bg-black text-white'
    : block.tone === 'glass'
      ? 'border border-white/70 bg-white/65 text-black backdrop-blur-xl'
      : 'bg-white text-black';
  const href = safeUrl(block.url);
  const classes = `${wide ? 'col-span-2' : ''} ${tone} flex min-h-[126px] flex-col justify-between rounded-[24px] p-4 transition ${href ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : ''}`;
  const content = <><span className="text-[8px] font-bold uppercase tracking-[.14em] opacity-45">{block.id}</span><div className="flex items-end justify-between gap-3"><div><strong className="block text-[18px] tracking-[-.04em]">{block.title}</strong><span className="mt-1 block text-[9px] opacity-55">{block.sub}</span></div><span aria-hidden="true">{block.icon || '↗'}</span></div></>;

  return href ? <a href={href} target="_blank" rel="noreferrer" className={classes} aria-label={`${block.title}: ${block.sub}`} onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}>{content}</a> : <div className={classes}>{content}</div>;
}
