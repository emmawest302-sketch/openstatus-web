'use client';

import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type PublicMapBlockProps = { name: string; location: string; businessId: string };

export default function PublicMapBlock({ name, location, businessId }: PublicMapBlockProps) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  return <a href={href} target="_blank" rel="noreferrer" onClick={() => trackOpenStatusEvent(businessId, 'directions_click', 'map')} className="relative col-span-2 min-h-[190px] overflow-hidden rounded-[26px] border border-white/45 bg-[#DCE5D0]/70 text-[#171A16] shadow-[0_14px_36px_rgba(0,0,0,.10)] backdrop-blur-2xl">
    <div className="absolute inset-0 opacity-70" style={{backgroundImage:'linear-gradient(28deg,transparent 45%,rgba(255,255,255,.82) 46%,rgba(255,255,255,.82) 51%,transparent 52%),linear-gradient(108deg,transparent 36%,rgba(255,255,255,.68) 37%,rgba(255,255,255,.68) 42%,transparent 43%),linear-gradient(165deg,transparent 55%,rgba(255,255,255,.55) 56%,rgba(255,255,255,.55) 60%,transparent 61%)'}} />
    <div className="absolute left-[58%] top-[39%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#263829] shadow-[0_8px_22px_rgba(0,0,0,.25)]"><span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></div>
    <div className="absolute inset-x-3 bottom-3 flex items-end justify-between rounded-[20px] border border-white/70 bg-white/65 p-4 shadow-lg backdrop-blur-2xl"><div><span className="text-[8px] font-bold uppercase tracking-[.14em] text-black/40">Directions</span><strong className="mt-1 block text-[17px] tracking-[-.04em]">{name}</strong><span className="mt-1 block max-w-[210px] truncate text-[10px] text-black/50">{location}</span></div><span className="rounded-full bg-black/70 px-3 py-2 text-[9px] font-bold text-white backdrop-blur-xl">Open maps ↗</span></div>
  </a>;
}
