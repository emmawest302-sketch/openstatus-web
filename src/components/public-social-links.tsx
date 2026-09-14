'use client';

import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type Social = { id?: string; label: string; url?: string; on?: boolean };
const marks: Record<string,string> = { instagram:'IG', facebook:'f', tiktok:'♪', youtube:'▶', linkedin:'in', pinterest:'P', x:'X', threads:'@' };
function href(value:string){const v=value.trim();if(!v)return '';return /^https?:\/\//i.test(v)?v:`https://${v}`}

export default function PublicSocialLinks({ socials, businessId }:{ socials: Social[]; businessId: string }) {
  const visible=socials.filter(s=>s.on!==false&&s.url?.trim());
  if(!visible.length)return null;
  return <div className="flex flex-wrap justify-center gap-2 px-4 py-4">{visible.map((social,i)=>{const url=href(social.url||'');const key=social.label.toLowerCase();return <a key={social.id||`${key}-${i}`} href={url} target="_blank" rel="noreferrer" aria-label={social.label} onClick={() => trackOpenStatusEvent(businessId, 'social_click', key)} className="grid h-11 min-w-11 place-items-center rounded-full border border-black/10 bg-white/70 px-3 text-[11px] font-bold text-black shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5"><span>{marks[key]||social.label.slice(0,2)}</span></a>})}</div>;
}
