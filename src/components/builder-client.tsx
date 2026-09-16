'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── types ──────────────────────────────────────────────────────────────────────
type Tone = 'default' | 'muted' | 'accent';
type BlockSize = 'half' | 'full';
type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
interface DayHours { open: string; close: string; closed: boolean; }
type WeeklyHours = Record<WeekDay, DayHours>;
interface OpenStatusBlock {
  id: string; title: string; sub: string; icon: string; on: boolean; tone: Tone;
  url?: string; size?: BlockSize; color?: string; coverPhoto?: string;
  menuType?: 'url' | 'pdf' | 'photos'; menuFile?: string;
  appleMapsUrl?: string; reviewStars?: number; reviewCount?: number;
  provider?: string;
  yelpUrl?: string; googleUrl?: string; tripAdvisorUrl?: string;
  blockStyle?: string;
}
interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[]; bg: string; bgImage?: string;
  socials: Record<string, string>;
  location?: string; tags?: string[]; weeklyHours?: WeeklyHours;
  likeCount?: number; dislikeCount?: number;
}
interface Business {
  id: string; name: string; slug: string;
  avatar_url?: string; description?: string; category?: string;
}

// ── constants ──────────────────────────────────────────────────────────────────
const BG_PRESETS = [
  '#f8f5f0','#fafafa','#f0f4ff','#fff0f5','#f0fdf4',
  '#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c',
];
const BLOCK_COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#0a0a0a'];
const ORDER_PROVIDERS = [
  { key:'doordash',  label:'DoorDash'  },
  { key:'ubereats',  label:'Uber Eats' },
  { key:'grubhub',   label:'Grubhub'   },
  { key:'square',    label:'Square'    },
  { key:'toast',     label:'Toast'     },
  { key:'other',     label:'Other'     },
];
const BOOK_PROVIDERS = [
  { key:'resy',       label:'Resy'         },
  { key:'opentable',  label:'OpenTable'    },
  { key:'calendly',   label:'Calendly'     },
  { key:'squareappts',label:'Square Appts' },
  { key:'acuity',     label:'Acuity'       },
  { key:'mindbody',   label:'Mindbody'     },
  { key:'other',      label:'Other'        },
];
const SOCIAL_PLATFORMS = [
  { key:'instagram', label:'Instagram' },
  { key:'tiktok',    label:'TikTok'    },
  { key:'facebook',  label:'Facebook'  },
  { key:'twitter',   label:'Twitter / X'},
  { key:'youtube',   label:'YouTube'   },
];
const BLOCK_STYLES: Record<string, { key:string; label:string; icon:string }[]> = {
  hours:    [{ key:'row',    label:'Status row', icon:'≡' }, { key:'clock',  label:'Clock',   icon:'◷' }, { key:'banner', label:'Banner', icon:'▬' }],
  location: [{ key:'photo',  label:'Photo',      icon:'⬜' }, { key:'pin',    label:'Pin card', icon:'◉' }, { key:'compact',label:'Compact',icon:'≡' }],
  menu:     [{ key:'photo',  label:'Photo',      icon:'⬜' }, { key:'card',   label:'Card',    icon:'▭' }, { key:'dark',   label:'Dark',   icon:'◼' }],
  order:    [{ key:'brand',  label:'Brand',      icon:'🅱' }, { key:'hero',   label:'Hero',    icon:'⬛' }, { key:'cta',    label:'CTA',    icon:'▷' }],
  book:     [{ key:'brand',  label:'Brand',      icon:'🅱' }, { key:'cal',    label:'Calendar',icon:'▦' }, { key:'cta',    label:'CTA',    icon:'▷' }],
  socials:  [{ key:'icons',  label:'Icon row',   icon:'◉◉' }, { key:'list',  label:'List',    icon:'≡' }],
  website:  [{ key:'photo',  label:'Photo',      icon:'⬜' }, { key:'link',   label:'Link row',icon:'≡' }],
};

const FEATURE_TAGS = [
  'Delivery','Takeout','Dine-in','Curbside pickup','Catering',
  'Dog friendly','Kid friendly','Wheelchair accessible','Free WiFi',
  'Outdoor seating','Patio','Rooftop',
  'Vegan options','Vegetarian','Gluten-free','Halal','Kosher','Organic',
  'LGBTQ+ friendly','Happy hour','Live music','Sports bar','Late night',
  'Cash only','Contactless pay',
  'Restaurant','Café','Bar','Bakery','Coffee shop','Brewery',
  'Food truck','Non-profit','Retail','Salon','Spa','Gym','Pop-up','Market',
];
const DAYS: { key: WeekDay; label: string }[] = [
  { key:'mon',label:'Monday' },{ key:'tue',label:'Tuesday' },{ key:'wed',label:'Wednesday' },
  { key:'thu',label:'Thursday' },{ key:'fri',label:'Friday' },{ key:'sat',label:'Saturday' },{ key:'sun',label:'Sunday' },
];
const DEFAULT_WEEK_HOURS: WeeklyHours = {
  mon:{ open:'09:00',close:'17:00',closed:false },tue:{ open:'09:00',close:'17:00',closed:false },
  wed:{ open:'09:00',close:'17:00',closed:false },thu:{ open:'09:00',close:'17:00',closed:false },
  fri:{ open:'09:00',close:'21:00',closed:false },sat:{ open:'10:00',close:'21:00',closed:false },
  sun:{ open:'10:00',close:'16:00',closed:false },
};
const DEFAULT_BLOCKS: OpenStatusBlock[] = [
  { id:'hours',   title:'Hours & status',        sub:'Live open / closed status',  icon:'clock',on:true, tone:'default',color:'#059669',size:'full' },
  { id:'location',title:'Location & directions', sub:'Tap for directions',          icon:'pin',  on:true, tone:'default',color:'#2563eb',size:'full' },
  { id:'menu',    title:'Menu',                  sub:'Tap to view',                icon:'menu', on:false,tone:'default',color:'#d97706',menuType:'url',size:'full' },
  { id:'order',   title:'Online ordering',       sub:'DoorDash, Uber Eats & more', icon:'bag',  on:false,tone:'default',color:'#dc2626',size:'half' },
  { id:'book',    title:'Reservations',          sub:'Book a table',               icon:'cal',  on:false,tone:'default',color:'#7c3aed',size:'half' },
  { id:'socials', title:'Follow us',             sub:'Social media links',         icon:'share',on:false,tone:'default',color:'#db2777',size:'full' },
  { id:'website', title:'Website',               sub:'Link to your site',          icon:'globe',on:false,tone:'default',color:'#0891b2',size:'full' },
];

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt12(t: string) {
  const [h,m] = t.split(':').map(Number);
  const ap = h>=12?'PM':'AM', hr=h%12||12;
  return m===0?`${hr} ${ap}`:`${hr}:${m.toString().padStart(2,'0')} ${ap}`;
}
function getLiveStatus(hours?: WeeklyHours): { status:'open'|'closed'; todayLabel:string } {
  if (!hours) return { status:'closed', todayLabel:'Set your hours' };
  const keys: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const today = hours[keys[new Date().getDay()]];
  if (today.closed) return { status:'closed', todayLabel:'Closed today' };
  const [oh,om]=today.open.split(':').map(Number), [ch,cm]=today.close.split(':').map(Number);
  const now=new Date().getHours()*60+new Date().getMinutes();
  return { status: now>=oh*60+om&&now<ch*60+cm?'open':'closed', todayLabel:`Today ${fmt12(today.open)} – ${fmt12(today.close)}` };
}
function starsToPercent(stars: number) { return Math.round((stars/5)*100); }

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string,unknown>;
  const saved = Array.isArray(r.blocks) ? r.blocks as OpenStatusBlock[] : [];
  return {
    blocks:       DEFAULT_BLOCKS.map(def => { const f=saved.find(b=>b.id===def.id); return f?{...def,...f}:{...def}; }),
    bg:           typeof r.bg==='string'?r.bg:'#f8f5f0',
    bgImage:      typeof r.bgImage==='string'?r.bgImage:undefined,
    socials:      (r.socials&&typeof r.socials==='object')?r.socials as Record<string,string>:{},
    location:     typeof r.location==='string'?r.location:undefined,
    tags:         Array.isArray(r.tags)?r.tags as string[]:[],
    weeklyHours:  (r.weeklyHours&&typeof r.weeklyHours==='object')?r.weeklyHours as WeeklyHours:{...DEFAULT_WEEK_HOURS},
    likeCount:    typeof r.likeCount==='number'?r.likeCount:0,
    dislikeCount: typeof r.dislikeCount==='number'?r.dislikeCount:0,
  };
}

// ── icons ──────────────────────────────────────────────────────────────────────
function LucidePin({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function LucideClock({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function LucideList({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function LucideShoppingBag({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function LucideCalendar({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function LucideShare({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}
function LucideGlobe({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function LucideGrip({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" fill={color}/><circle cx="9" cy="5" r="1" fill={color}/><circle cx="9" cy="19" r="1" fill={color}/><circle cx="15" cy="12" r="1" fill={color}/><circle cx="15" cy="5" r="1" fill={color}/><circle cx="15" cy="19" r="1" fill={color}/></svg>;
}
function LucideX({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function LucideChevronRight({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function LucideStar({ size=12,color='currentColor',filled=false }: { size?: number; color?: string; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?color:'none'} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function LucideImage({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
function LucideThumbsUp({ size=12,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>;
}
function LucideThumbsDown({ size=12,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>;
}
function LucideFileText({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function LucideLayoutGrid({ size=14,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
function LucideLayoutList({ size=14,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="5"/><rect x="3" y="11" width="18" height="5"/><rect x="3" y="19" width="18" height="2"/></svg>;
}

function BlockIcon({ id, size=16, color='currentColor' }: { id:string; size?:number; color?:string }) {
  switch(id) {
    case 'location': return <LucidePin size={size} color={color}/>;
    case 'hours':    return <LucideClock size={size} color={color}/>;
    case 'menu':     return <LucideList size={size} color={color}/>;
    case 'order':    return <LucideShoppingBag size={size} color={color}/>;
    case 'book':     return <LucideCalendar size={size} color={color}/>;
    case 'socials':  return <LucideShare size={size} color={color}/>;
    default:         return <LucideGlobe size={size} color={color}/>;
  }
}

// Brand icons
function IconInstagram({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig)"/>
      <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.7" fill="none"/>
      <circle cx="17.2" cy="6.8" r="1.1" fill="white"/>
    </svg>
  );
}
function IconTikTok({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#010101"/>
      <path d="M17.5 5.5a3.8 3.8 0 0 1-2.9-3.3V2H11.8v13.1a2.2 2.2 0 0 1-4.4 0 2.2 2.2 0 0 1 2.2-2.2c.2 0 .4 0 .6.1V9.9a5.9 5.9 0 0 0-5.9 5.9 5.9 5.9 0 0 0 11.8 0V9a7.5 7.5 0 0 0 4.3 1.3V7.1a3.8 3.8 0 0 1-2.9-1.6z" fill="white"/>
    </svg>
  );
}
function IconFacebook({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="white"/>
    </svg>
  );
}
function IconTwitterX({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#000"/>
      <path d="M17.5 4h2.5l-5.4 6.2 6.3 8.3h-5L12 13.4l-4.4 5.1H4.6l5.8-6.6L4.4 4h5.1l3.5 4.6L17.5 4zm-.9 12.9h1.4L7.1 5.5H5.6l11 11.4z" fill="white"/>
    </svg>
  );
}
function IconYouTube({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#FF0000"/>
      <path d="M21.4 8a2.6 2.6 0 0 0-1.8-1.8C18 5.8 12 5.8 12 5.8s-6 0-7.5.4A2.6 2.6 0 0 0 2.6 8C2.2 9.5 2.2 12 2.2 12s0 2.5.4 4a2.6 2.6 0 0 0 1.8 1.8C6 18.2 12 18.2 12 18.2s6 0 7.5-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.5.4-4 .4-4s0-2.5-.3-4z" fill="white"/>
      <polygon points="10 15 15.5 12 10 9" fill="#FF0000"/>
    </svg>
  );
}
function SocialIcon({ platform, size=22 }: { platform:string; size?:number }) {
  switch(platform) {
    case 'instagram': return <IconInstagram size={size}/>;
    case 'tiktok':    return <IconTikTok size={size}/>;
    case 'facebook':  return <IconFacebook size={size}/>;
    case 'twitter':   return <IconTwitterX size={size}/>;
    case 'youtube':   return <IconYouTube size={size}/>;
    default:          return <LucideGlobe size={size} color="#9B9B9B"/>;
  }
}

// ── Brand provider icons ──────────────────────────────────────────────────────
function IconDoorDash({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#FF3008"/>
      {/* D letterform — door shape */}
      <path d="M9 9h7.5C20.1 9 23 11.9 23 16s-2.9 7-6.5 7H9V9z" fill="white" opacity="0.95"/>
      <path d="M12 12.5h4.2c1.8 0 3.3 1.6 3.3 3.5s-1.5 3.5-3.3 3.5H12v-7z" fill="#FF3008"/>
    </svg>
  );
}
function IconUberEats({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#09091A"/>
      {/* fork left */}
      <path d="M11 8v5.5M11 13.5a2.5 2.5 0 0 0 0 5V24" stroke="white" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
      {/* circle right */}
      <circle cx="20" cy="16" r="5" stroke="#06C167" strokeWidth="2" fill="none"/>
    </svg>
  );
}
function IconGrubhub({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#F63440"/>
      {/* G mark */}
      <path d="M20.5 13.5C19.4 11.6 17.4 10.5 15 10.5 11.4 10.5 8.5 13.4 8.5 17s2.9 6.5 6.5 6.5c3.3 0 6-2.4 6.4-5.5H15v-2h8.5v1.5c0 4.7-3.8 8.5-8.5 8.5C10.1 26 6 21.9 6 17S10.1 8 15 8c3 0 5.7 1.5 7.3 3.8l-1.8 1.7z" fill="white"/>
    </svg>
  );
}
function IconSquare({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#000"/>
      {/* Square logo mark — rounded square inside */}
      <rect x="9" y="9" width="14" height="14" rx="3" fill="white"/>
      <rect x="12" y="12" width="8" height="8" rx="1.5" fill="#000"/>
    </svg>
  );
}
function IconToast({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#FF4C00"/>
      <path d="M9 12h14M16 12v12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
function IconOpenTable({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#DA3743"/>
      {/* fork */}
      <path d="M11 8v16M11 11c0 0 3.5 1.5 3.5 4s-3.5 4-3.5 4" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* knife */}
      <path d="M20 8l-1.5 8H20v8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function IconResy({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#000"/>
      {/* Bold R */}
      <path d="M11 8h7a4 4 0 0 1 0 8h-7V8z" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M18 16l5 8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="11" y1="8" x2="11" y2="24" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconCalendly({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#006BFF"/>
      <rect x="7" y="10" width="18" height="15" rx="2.5" stroke="white" strokeWidth="1.9" fill="none"/>
      <path d="M7 15h18" stroke="white" strokeWidth="1.5"/>
      <path d="M12 7v5M20 7v5" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
      <circle cx="12" cy="20" r="1.2" fill="white"/>
      <circle cx="16" cy="20" r="1.2" fill="white"/>
      <circle cx="20" cy="20" r="1.2" fill="white"/>
    </svg>
  );
}
function IconAcuity({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#5C2D91"/>
      {/* A shape */}
      <path d="M16 8l7 16h-14L16 8z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="11.5" y1="19" x2="20.5" y2="19" stroke="white" strokeWidth="2"/>
    </svg>
  );
}
function IconMindbody({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#1D1D1D"/>
      {/* M shape */}
      <path d="M7 22V10l5 7 5-7v12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* person dot */}
      <circle cx="24" cy="12" r="2.5" fill="white"/>
      <path d="M24 15v7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconYelp({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#D32323"/>
      {/* Yelp star/burst */}
      <path d="M16 5l2 6.5H24l-5 3.8 2 6.5L16 18l-5 3.8 2-6.5-5-3.8h6z" fill="white"/>
    </svg>
  );
}
function IconGoogle({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="white" stroke="#EBEBEB" strokeWidth="1"/>
      {/* Google G */}
      <path d="M24 16.3c0-.6-.1-1.2-.2-1.8H16v3.4h4.5c-.2 1-.8 1.9-1.7 2.4v2h2.7C23 20.6 24 18.6 24 16.3z" fill="#4285F4"/>
      <path d="M16 25c2.3 0 4.2-.7 5.5-2l-2.7-2c-.7.5-1.7.8-2.8.8-2.2 0-4-1.4-4.6-3.4H8.6v2.1C9.9 23.1 12.7 25 16 25z" fill="#34A853"/>
      <path d="M11.4 18.4c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6v-2.1H8.6C8 14.5 7.5 15.7 7.5 17s.5 2.5 1.1 3.5l2.8-2.1z" fill="#FBBC05"/>
      <path d="M16 11.8c1.3 0 2.4.4 3.3 1.3l2.4-2.4C20.2 9.2 18.3 8.5 16 8.5c-3.3 0-6.1 1.9-7.4 4.7l2.8 2.1c.6-2 2.4-3.5 4.6-3.5z" fill="#EA4335"/>
    </svg>
  );
}
function IconTripAdvisor({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#34E0A1"/>
      {/* Owl eyes (TripAdvisor's icon) */}
      <circle cx="11" cy="17" r="4" fill="white"/>
      <circle cx="21" cy="17" r="4" fill="white"/>
      <circle cx="11" cy="17" r="2.2" fill="#000"/>
      <circle cx="21" cy="17" r="2.2" fill="#000"/>
      <circle cx="11.7" cy="16.3" r="0.7" fill="white"/>
      <circle cx="21.7" cy="16.3" r="0.7" fill="white"/>
      {/* Beak */}
      <path d="M14.5 21c.6.9 1.5 1.4 2 1.4s1.4-.5 2-1.4" stroke="#000" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
      {/* Eyebrows */}
      <path d="M7 14c1-2 2.5-3 4-3M25 14c-1-2-2.5-3-4-3" stroke="#000" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function ProviderIcon({ providerKey, size=32 }: { providerKey: string; size?: number }) {
  switch(providerKey) {
    case 'doordash':   return <IconDoorDash size={size}/>;
    case 'ubereats':   return <IconUberEats size={size}/>;
    case 'grubhub':    return <IconGrubhub size={size}/>;
    case 'square':
    case 'squareappts':return <IconSquare size={size}/>;
    case 'toast':      return <IconToast size={size}/>;
    case 'opentable':  return <IconOpenTable size={size}/>;
    case 'resy':       return <IconResy size={size}/>;
    case 'calendly':   return <IconCalendly size={size}/>;
    case 'acuity':     return <IconAcuity size={size}/>;
    case 'mindbody':   return <IconMindbody size={size}/>;
    default:           return <LucideGlobe size={size} color="#9B9B9B"/>;
  }
}

// ── UI primitives ──────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={e=>{ e.stopPropagation(); onChange(!on); }}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${on?'bg-[#0A0A0A]':'bg-[#D4D4D4]'}`}
      aria-pressed={on}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on?'translate-x-5':'translate-x-0'}`}/>
    </button>
  );
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-2">{children}</p>;
}
function Input({ value,onChange,placeholder,type='text' }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-white border border-[#EBEBEB] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
    />
  );
}
function PillSelect({ options,selected,onSelect }: { options:string[]; selected:string; onSelect:(v:string)=>void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o=>(
        <button key={o} onClick={()=>onSelect(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected===o?'bg-[#0A0A0A] text-white border-[#0A0A0A]':'border-[#EBEBEB] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

// Brand provider picker — logo cards
function BrandProviderPicker({ providers, selectedKey, onSelect }: {
  providers: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string, label: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {providers.map(({ key, label }) => {
        const active = selectedKey === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key, label)}
            className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all ${active ? 'border-[#0A0A0A] bg-[#F5F5F5] shadow-sm' : 'border-[#EBEBEB] hover:border-[#C0C0C0] bg-white'}`}
          >
            {key === 'other'
              ? <div className="w-8 h-8 rounded-xl border-2 border-dashed border-[#D4D4D4] flex items-center justify-center"><LucideGlobe size={14} color="#9B9B9B"/></div>
              : <ProviderIcon providerKey={key} size={32}/>
            }
            <span className={`text-[10px] font-semibold leading-tight text-center ${active ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Analog clock face for hours block
function ClockFace({ size=52, color='#059669' }: { size?: number; color?: string }) {
  const now = new Date();
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const hAngle = (h / 12) * 360 + (m / 60) * 30 - 90;
  const mAngle = (m / 60) * 360 - 90;
  const cx = size / 2, cy = size / 2, r = size / 2 - 2;
  const pt = (angle: number, len: number) => ({
    x: cx + len * Math.cos((angle * Math.PI) / 180),
    y: cy + len * Math.sin((angle * Math.PI) / 180),
  });
  const hh = pt(hAngle, r * 0.52); const mh = pt(mAngle, r * 0.72);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill={`${color}18`} stroke={color} strokeWidth="1.5"/>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = (i/12)*360-90;
        const inn = pt(a, r*0.8), out = pt(a, r*0.92);
        return <line key={i} x1={inn.x} y1={inn.y} x2={out.x} y2={out.y} stroke={color} strokeWidth={i%3===0?1.8:0.8} strokeLinecap="round"/>;
      })}
      <line x1={cx} y1={cy} x2={hh.x} y2={hh.y} stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1={cx} y1={cy} x2={mh.x} y2={mh.y} stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx={cx} cy={cy} r="2.2" fill={color}/>
    </svg>
  );
}

// Block visual style picker
function BlockStylePicker({ blockId, selected, onSelect }: {
  blockId: string; selected: string; onSelect: (key: string) => void;
}) {
  const styles = BLOCK_STYLES[blockId];
  if (!styles) return null;
  return (
    <div>
      <FieldLabel>Block style</FieldLabel>
      <div className="flex gap-2 flex-wrap">
        {styles.map(s => (
          <button key={s.key} onClick={() => onSelect(s.key)}
            className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border transition-all ${selected===s.key?'border-[#0A0A0A] bg-[#F5F5F5] shadow-sm':'border-[#EBEBEB] hover:border-[#C0C0C0] bg-white'}`}>
            <span className="text-base leading-none">{s.icon}</span>
            <span className={`text-[10px] font-semibold ${selected===s.key?'text-[#0A0A0A]':'text-[#6B6B6B]'}`}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Accent color picker with hex input
function AccentColorPicker({ value, onChange }: { value?: string; onChange:(v:string)=>void }) {
  const colorRef = useRef<HTMLInputElement>(null);
  const [hex, setHex] = useState(value??'#2563eb');
  function commit(v: string) { setHex(v); if(/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v); }
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {BLOCK_COLORS.map((c,i)=>(
          <button key={i} onClick={()=>{ commit(c); }}
            className="w-7 h-7 rounded-full transition-all"
            style={{ background:c, outline:(value??'')=== c?`2px solid ${c}`:'none', outlineOffset:2 }}
          />
        ))}
        {/* custom swatch */}
        <button
          onClick={()=>colorRef.current?.click()}
          className="w-7 h-7 rounded-full border-2 border-dashed border-[#D4D4D4] flex items-center justify-center hover:border-[#0A0A0A] transition-colors"
          title="Custom color">
          <span className="text-[10px] text-[#9B9B9B]">+</span>
        </button>
        <input ref={colorRef} type="color" value={value??'#2563eb'} onChange={e=>{commit(e.target.value);}} className="opacity-0 absolute w-0 h-0"/>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg border border-[#EBEBEB] flex-shrink-0" style={{ background:value??'#2563eb' }}/>
        <input value={hex} onChange={e=>commit(e.target.value)} placeholder="#000000"
          className="flex-1 bg-white border border-[#EBEBEB] rounded-lg px-3 py-1.5 text-xs text-[#0A0A0A] font-mono focus:outline-none focus:border-[#0A0A0A] transition-colors"
        />
      </div>
    </div>
  );
}

// Photo upload field
function PhotoField({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v:string)=>void;
  placeholder?: string; hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  }
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {hint && <p className="text-xs text-[#9B9B9B] mb-3 leading-snug">{hint}</p>}
      {value
        ? (
          <div className="relative group rounded-xl overflow-hidden border border-[#EBEBEB]">
            <img src={value} className="w-full h-32 object-cover" alt=""/>
            <button onClick={()=>onChange('')}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <LucideX size={12} color="white"/>
            </button>
          </div>
        )
        : (
          <div>
            <div
              onClick={()=>fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-[#D4D4D4] bg-[#FAFAFA] h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0A0A0A] hover:bg-[#F5F5F5] transition-all">
              <LucideImage size={18} color="#9B9B9B"/>
              <p className="text-[12px] text-[#9B9B9B]">Click to upload</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-px bg-[#EBEBEB]"/>
              <span className="text-[10px] text-[#C0C0C0]">or paste URL</span>
              <div className="flex-1 h-px bg-[#EBEBEB]"/>
            </div>
            <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder??'https://…'}
              className="mt-2 w-full bg-white border border-[#EBEBEB] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>
        )
      }
    </div>
  );
}

// PDF upload field
function PdfField({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) onChange(ev.target.result as string); };
    reader.readAsDataURL(file);
  }
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {value
        ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#EBEBEB] bg-[#FAFAFA] px-4 py-3">
            <LucideFileText size={18} color="#0A0A0A"/>
            <span className="text-sm text-[#0A0A0A] font-medium flex-1 truncate">PDF uploaded</span>
            <button onClick={()=>onChange('')} className="text-[11px] text-[#9B9B9B] hover:text-[#0A0A0A] transition-colors font-medium">Remove</button>
          </div>
        )
        : (
          <div>
            <div
              onClick={()=>fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-[#D4D4D4] bg-[#FAFAFA] h-20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0A0A0A] hover:bg-[#F5F5F5] transition-all">
              <LucideFileText size={18} color="#9B9B9B"/>
              <p className="text-[12px] text-[#9B9B9B]">Upload PDF</p>
            </div>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile}/>
          </div>
        )
      }
    </div>
  );
}

// Time select
function TimeSelect({ value,onChange }: { value:string; onChange:(v:string)=>void }) {
  const times:string[]=[];
  for(let h=0;h<24;h++) for(const m of [0,30]) times.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="bg-white border border-[#EBEBEB] rounded-lg px-2.5 py-1.5 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] cursor-pointer appearance-none">
      {times.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

// ── Screen preview (no phone frame) ───────────────────────────────────────────
function LivePhonePreview({ business,config }: { business:Business|null; config:OpenStatusPageConfig }) {
  const activeBlocks = config.blocks.filter(b=>b.on);
  // Hours always first in preview
  const sortedBlocks = [
    ...activeBlocks.filter(b=>b.id==='hours'),
    ...activeBlocks.filter(b=>b.id!=='hours'),
  ];
  const isDark = ['#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c'].includes(config.bg);
  const tx = isDark?'text-white':'text-[#0A0A0A]';
  const sx = isDark?'text-white/50':'text-[#6B6B6B]';
  const { status, todayLabel } = getLiveStatus(config.weeklyHours);
  const locBlock = config.blocks.find(b=>b.id==='location');
  const reviewPct = locBlock?.reviewStars&&locBlock.reviewStars>0 ? starsToPercent(locBlock.reviewStars) : null;

  return (
    <div className="mx-auto" style={{ width:290 }}>
      <div
        className="rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8"
        style={{ background:config.bg, minHeight:560 }}
      >
        {/* Hero — full bleed when photo set, compact header otherwise */}
        {config.bgImage ? (
          /* ── Full-bleed photo hero ── */
          <div className="relative overflow-hidden" style={{ minHeight: 200 }}>
            <img src={config.bgImage} className="w-full object-cover" style={{ height: 220 }} alt=""/>
            {/* gradient overlay — dark at bottom for legibility */}
            <div className="absolute inset-0" style={{ background:'linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,rgba(0,0,0,0.62) 100%)' }}/>
            {/* Content overlaid */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 px-4 text-center">
              {business?.avatar_url
                ?<img src={business.avatar_url} className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-md mb-2" alt=""/>
                :<div className="w-11 h-11 rounded-full border-2 border-white/80 bg-white/20 backdrop-blur-sm flex items-center justify-center text-[11px] font-black text-white mb-2">
                  {(business?.name??'B').slice(0,1).toUpperCase()}
                </div>
              }
              <p className="font-bold text-[14px] text-white drop-shadow-sm">{business?.name??'Your Business'}</p>
              {config.location && <p className="text-[9px] text-white/65 truncate px-2 mt-0.5">{config.location}</p>}
              {/* Review + like/dislike */}
              <div className="flex items-center justify-center gap-2 mt-2">
                {reviewPct && (
                  <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-0.5">
                    <LucideStar size={8} color="#fbbf24" filled/>
                    <span className="text-[8px] font-semibold text-white">{reviewPct}%</span>
                    {locBlock?.reviewCount&&<span className="text-[7px] text-white/60"> · {locBlock.reviewCount.toLocaleString()}</span>}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/15 backdrop-blur-sm">
                    <LucideThumbsUp size={8} color="rgba(255,255,255,0.7)"/>
                    <span className="text-[8px] font-medium text-white/80">{(config.likeCount??0)+24}</span>
                  </button>
                  <button className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/15 backdrop-blur-sm">
                    <LucideThumbsDown size={8} color="rgba(255,255,255,0.7)"/>
                    <span className="text-[8px] font-medium text-white/80">{(config.dislikeCount??0)+2}</span>
                  </button>
                </div>
              </div>
              {(config.tags??[]).length>0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                  {(config.tags??[]).slice(0,3).map(t=>(
                    <span key={t} className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/70">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── No photo: compact header ── */
          <div className="px-4 pb-3 text-center pt-8">
            {business?.avatar_url
              ?<img src={business.avatar_url} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" alt=""/>
              :<div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-[10px] font-black tracking-tight ${isDark?'bg-white/10 text-white':'bg-black/8 text-black'}`}>
                {(business?.name??'B').slice(0,1).toUpperCase()}
              </div>
            }
            <p className={`font-bold text-[13px] ${tx}`}>{business?.name??'Your Business'}</p>
            {config.location && <p className={`text-[9px] ${sx} truncate px-2 mt-0.5`}>{config.location}</p>}
            <div className="flex items-center justify-center gap-3 mt-2">
              {reviewPct && (
                <div className="flex items-center gap-1">
                  <LucideStar size={9} color="#f59e0b" filled/>
                  <span className="text-[9px] font-semibold" style={{ color:'#f59e0b' }}>{reviewPct}%</span>
                  {locBlock?.reviewCount&&<span className={`text-[8px] ${sx}`}> · {locBlock.reviewCount.toLocaleString()}</span>}
                </div>
              )}
              {reviewPct && <span className={`text-[8px] ${sx}`}>·</span>}
              <div className="flex items-center gap-2">
                <button className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isDark?'bg-white/8 text-white/60':'bg-black/5 text-black/50'}`}>
                  <LucideThumbsUp size={8} color={isDark?'rgba(255,255,255,0.5)':'rgba(0,0,0,0.4)'}/>
                  <span className="text-[8px] font-medium">{(config.likeCount??0)+24}</span>
                </button>
                <button className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isDark?'bg-white/8 text-white/60':'bg-black/5 text-black/50'}`}>
                  <LucideThumbsDown size={8} color={isDark?'rgba(255,255,255,0.5)':'rgba(0,0,0,0.4)'}/>
                  <span className="text-[8px] font-medium">{(config.dislikeCount??0)+2}</span>
                </button>
              </div>
            </div>
            {(config.tags??[]).length>0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {(config.tags??[]).slice(0,3).map(t=>(
                  <span key={t} className={`text-[8px] px-2 py-0.5 rounded-full ${isDark?'bg-white/10 text-white/60':'bg-black/6 text-black/50'}`}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocks — support half/full layout */}
        <div className="px-3 pb-5">
          {sortedBlocks.length===0
            ?<p className={`text-center text-[10px] py-8 ${sx}`}>Toggle blocks to see them here</p>
            :<div className="grid grid-cols-2 gap-1.5">
              {sortedBlocks.map(b=>{
                const isHalf = b.size==='half' && b.id!=='hours';
                const cardBg = b.color?`${b.color}15`:(isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.04)');
                const bdr    = b.color?`${b.color}35`:(isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)');

                const bStyle = b.blockStyle ?? (b.id==='hours'?'row':b.id==='location'?'photo':'brand');
                const inner = (() => {

                  // ── HOURS ──
                  if(b.id==='hours') {
                    if(bStyle==='clock') return (
                      <div className="rounded-2xl px-3 py-2.5 border text-center" style={{ background:cardBg, borderColor:bdr }}>
                        <div className="flex justify-center mb-1.5"><ClockFace size={46} color={b.color??'#059669'}/></div>
                        <p className={`text-[10px] font-bold ${tx}`}>{status==='open'?'Open now':'Closed'}</p>
                        <p className={`text-[8px] ${sx}`}>{todayLabel}</p>
                      </div>
                    );
                    if(bStyle==='banner') return (
                      <div className="rounded-2xl px-4 py-4 text-center" style={{ background: status==='open'?`linear-gradient(135deg,${b.color??'#059669'},#10b981)`:`linear-gradient(135deg,#374151,#6b7280)` }}>
                        <p className="text-white font-black text-[20px] tracking-tight">{status==='open'?'OPEN':'CLOSED'}</p>
                        <p className="text-white/65 text-[8px] mt-0.5">{todayLabel}</p>
                      </div>
                    );
                    // default row
                    return (
                      <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                        <BlockIcon id={b.id} size={12} color={b.color}/>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-bold ${tx}`}>{status==='open'?'Open now':'Closed'}</p>
                          <p className={`text-[8px] ${sx}`}>Tap for hours</p>
                        </div>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status==='open'?'bg-emerald-400':'bg-red-400'}`}/>
                      </div>
                    );
                  }

                  // ── LOCATION ──
                  if(b.id==='location') {
                    if(bStyle==='pin') return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                        <div className="flex flex-col items-center justify-center py-3" style={{ background:'linear-gradient(135deg,#1e3a5f,#0f172a)',minHeight:60 }}>
                          <LucidePin size={18} color="white"/>
                          <p className="text-white text-[9px] font-semibold mt-1">{b.title}</p>
                        </div>
                        <div className="flex gap-1 px-2 py-1.5" style={{ background:cardBg }}>
                          {b.url&&<span className={`text-[7px] px-1.5 py-0.5 rounded ${isDark?'bg-white/10 text-white/40':'bg-black/8 text-black/40'}`}>Google Maps</span>}
                          {b.appleMapsUrl&&<span className={`text-[7px] px-1.5 py-0.5 rounded ${isDark?'bg-white/10 text-white/40':'bg-black/8 text-black/40'}`}>Apple Maps</span>}
                        </div>
                      </div>
                    );
                    if(bStyle==='compact') return (
                      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                        <LucidePin size={10} color={b.color}/>
                        <div className="min-w-0 flex-1"><p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p></div>
                        <span className={`text-xs ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                      </div>
                    );
                    // default photo
                    return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                        {b.coverPhoto
                          ?<img src={b.coverPhoto} className="w-full h-[54px] object-cover" alt=""/>
                          :<div className="h-[54px] flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1e3a5f,#111827)' }}>
                            <LucidePin size={16} color="white"/>
                          </div>
                        }
                        <div className="px-2.5 py-2" style={{ background:cardBg }}>
                          <p className={`text-[10px] font-semibold ${tx} leading-tight truncate`}>{b.title}</p>
                          <div className="flex gap-1 mt-1">
                            {b.url&&<span className={`text-[7px] px-1.5 py-0.5 rounded ${isDark?'bg-white/10 text-white/40':'bg-black/8 text-black/40'}`}>Google</span>}
                            {b.appleMapsUrl&&<span className={`text-[7px] px-1.5 py-0.5 rounded ${isDark?'bg-white/10 text-white/40':'bg-black/8 text-black/40'}`}>Apple</span>}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // ── ORDER / BOOK ──
                  if(b.id==='order'||b.id==='book') {
                    const hasProvider = b.provider && b.provider!=='other';
                    if(bStyle==='hero' && hasProvider) return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                        <div className="flex flex-col items-center justify-center py-3" style={{ background:cardBg, minHeight:64 }}>
                          <ProviderIcon providerKey={b.provider!} size={36}/>
                          <p className={`text-[9px] font-semibold ${tx} mt-1.5`}>{b.title}</p>
                        </div>
                      </div>
                    );
                    if(bStyle==='cta') return (
                      <div className="rounded-2xl px-3 py-3 border" style={{ background:b.color?`${b.color}15`:cardBg, borderColor:b.color?`${b.color}40`:bdr }}>
                        <div className="flex items-center gap-2">
                          {hasProvider&&<ProviderIcon providerKey={b.provider!} size={20}/>}
                          <p className={`text-[11px] font-bold flex-1 ${tx}`}>{b.title}</p>
                          <span style={{ color:b.color??'#0A0A0A' }} className="text-[14px] font-bold">→</span>
                        </div>
                      </div>
                    );
                    // default brand
                    return (
                      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2 border" style={{ background:cardBg, borderColor:bdr }}>
                        {hasProvider
                          ?<div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"><ProviderIcon providerKey={b.provider!} size={28}/></div>
                          :<BlockIcon id={b.id} size={10} color={b.color}/>
                        }
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                          {!isHalf&&<p className={`text-[8px] ${sx} truncate`}>{b.sub}</p>}
                        </div>
                        <span className={`text-xs flex-shrink-0 ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                      </div>
                    );
                  }

                  // ── MENU ──
                  if(b.id==='menu') {
                    if(bStyle==='dark') return (
                      <div className="rounded-2xl px-3 py-3 border" style={{ background:'#0A0A0A', borderColor:'#1A1A1A' }}>
                        <div className="flex items-center gap-2">
                          <BlockIcon id="menu" size={12} color="white"/>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-white truncate">{b.title}</p>
                            {!isHalf&&<p className="text-[8px] text-white/40 truncate">{b.sub}</p>}
                          </div>
                          <span className="text-white/20 text-xs">›</span>
                        </div>
                      </div>
                    );
                  }

                  // ── SOCIALS list style ──
                  if(b.id==='socials' && bStyle==='list') {
                    const activeSocials = SOCIAL_PLATFORMS.filter(s=>config.socials[s.key]);
                    return (
                      <div className="rounded-2xl border overflow-hidden" style={{ borderColor:bdr }}>
                        {activeSocials.length===0
                          ?<div className="flex items-center gap-2 px-2.5 py-2.5" style={{ background:cardBg }}>
                            <BlockIcon id="socials" size={10} color={b.color}/>
                            <p className={`text-[10px] font-semibold ${tx}`}>{b.title}</p>
                          </div>
                          :activeSocials.slice(0,3).map((s,i)=>(
                            <div key={s.key} className={`flex items-center gap-2 px-2.5 py-1.5 ${i>0?'border-t':''}` } style={{ background:cardBg, borderColor:bdr }}>
                              <SocialIcon platform={s.key} size={14}/>
                              <p className={`text-[9px] font-medium ${tx}`}>{s.label}</p>
                              <span className={`ml-auto text-xs ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                            </div>
                          ))
                        }
                      </div>
                    );
                  }

                  // ── Generic fallback (cover photo or simple row) ──
                  if(b.coverPhoto) return (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                      <img src={b.coverPhoto} className={`w-full object-cover ${isHalf?'h-[52px]':'h-[48px]'}`} alt=""/>
                      <div className="flex items-center gap-2 px-2.5 py-2" style={{ background:cardBg }}>
                        <BlockIcon id={b.id} size={10} color={b.color}/>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                          <p className={`text-[8px] ${sx} truncate`}>{b.sub}</p>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                      <BlockIcon id={b.id} size={10} color={b.color}/>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                        {!isHalf&&<p className={`text-[8px] ${sx} truncate`}>{b.sub}</p>}
                      </div>
                      <span className={`text-xs flex-shrink-0 ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                    </div>
                  );
                })();

                return (
                  <div key={b.id} className={isHalf?'col-span-1':'col-span-2'}>
                    {inner}
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
      <p className="text-center text-[11px] text-[#9B9B9B] mt-4 font-medium">openstatus.co/…</p>
    </div>
  );
}

// ── Block modal ────────────────────────────────────────────────────────────────
function BlockModal({ block,config,onUpdateBlock,onUpdateConfig,onClose }: {
  block:OpenStatusBlock; config:OpenStatusPageConfig;
  onUpdateBlock:(u:Partial<OpenStatusBlock>)=>void;
  onUpdateConfig:(u:Partial<OpenStatusPageConfig>)=>void;
  onClose:()=>void;
}) {
  const hours=config.weeklyHours??DEFAULT_WEEK_HOURS;
  const {status,todayLabel}=getLiveStatus(hours);
  function copyMonToWeekdays() {
    const mon=hours.mon;
    onUpdateConfig({ weeklyHours:{ ...hours, tue:{...mon},wed:{...mon},thu:{...mon},fri:{...mon} } });
  }
  useEffect(()=>{ document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=''; }; },[]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"/>
      <div
        className="relative bg-white rounded-[20px] w-full max-w-[720px] max-h-[88vh] flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.15)] border border-[#EBEBEB]"
        onClick={e=>e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#EBEBEB] flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F5] border border-[#EBEBEB] flex items-center justify-center flex-shrink-0">
            <BlockIcon id={block.id} size={16} color="#0A0A0A"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] text-[#0A0A0A] leading-tight">{block.title}</p>
            <p className="text-xs text-[#9B9B9B] leading-tight mt-0.5">{block.sub}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors flex-shrink-0">
            <LucideX size={14} color="#6B6B6B"/>
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* Always show title + subtitle for all blocks */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-[#F5F5F5]">
            <div><FieldLabel>Widget title</FieldLabel><Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/></div>
            <div><FieldLabel>Subtitle / tagline</FieldLabel><Input value={block.sub} onChange={v=>onUpdateBlock({sub:v})}/></div>
          </div>

          {/* ── LOCATION ── */}
          {block.id==='location' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="location" selected={block.blockStyle??'photo'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField
                label="Place photo"
                value={block.coverPhoto??''}
                onChange={v=>onUpdateBlock({coverPhoto:v})}
                hint="Shown instead of a map. Use a photo from your Google Business profile."
              />
              <div>
                <FieldLabel>Google Maps URL</FieldLabel>
                <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="Paste from Google Maps → Share → Copy link"/>
              </div>
              <div>
                <FieldLabel>Apple Maps URL</FieldLabel>
                <Input value={block.appleMapsUrl??''} onChange={v=>onUpdateBlock({appleMapsUrl:v})} placeholder="Paste from Apple Maps → Share → Copy link"/>
              </div>
              {/* Review platforms */}
              <div>
                <FieldLabel>Review profiles</FieldLabel>
                <p className="text-xs text-[#9B9B9B] mb-3">Paste your listings — we pull your rating automatically</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0"><IconYelp size={28}/></div>
                    <Input value={block.yelpUrl??''} onChange={v=>onUpdateBlock({yelpUrl:v})} placeholder="Paste your Yelp listing URL…"/>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0"><IconGoogle size={28}/></div>
                    <Input value={block.googleUrl??''} onChange={v=>onUpdateBlock({googleUrl:v})} placeholder="Paste your Google Business profile URL…"/>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0"><IconTripAdvisor size={28}/></div>
                    <Input value={block.tripAdvisorUrl??''} onChange={v=>onUpdateBlock({tripAdvisorUrl:v})} placeholder="Paste your TripAdvisor listing URL…"/>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Combined star rating (0–5)</FieldLabel>
                  <Input type="number" value={block.reviewStars?.toString()??''} onChange={v=>onUpdateBlock({reviewStars:parseFloat(v)||undefined})} placeholder="e.g. 4.7"/>
                  {block.reviewStars&&block.reviewStars>0&&(
                    <p className="text-[11px] text-[#6B6B6B] mt-1.5 flex items-center gap-1">
                      <LucideStar size={10} color="#f59e0b" filled/>
                      {block.reviewStars} stars → <strong>{starsToPercent(block.reviewStars)}% positive</strong>
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Total review count</FieldLabel>
                  <Input type="number" value={block.reviewCount?.toString()??''} onChange={v=>onUpdateBlock({reviewCount:parseInt(v)||undefined})} placeholder="e.g. 312"/>
                </div>
              </div>
              <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3">
                <p className="text-[11px] text-[#166534] font-medium">The star rating and like/dislike buttons appear in the header of your page, under your business name — alongside your OpenStatus community score.</p>
              </div>
            </div>
          )}

          {/* ── HOURS ── */}
          {block.id==='hours' && (
            <div className="space-y-6">
              <BlockStylePicker blockId="hours" selected={block.blockStyle??'row'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border ${status==='open'?'bg-[#F0FDF4] border-[#BBF7D0]':'bg-[#FAFAFA] border-[#EBEBEB]'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">{status==='open'?'Open now':'Closed right now'}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{todayLabel}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <FieldLabel>Weekly hours</FieldLabel>
                  <button onClick={copyMonToWeekdays} className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors font-medium">
                    Copy Mon → weekdays
                  </button>
                </div>
                <div className="rounded-2xl border border-[#EBEBEB] overflow-hidden">
                  {DAYS.map(({key,label},i)=>{
                    const day=hours[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 px-4 ${i<DAYS.length-1?'border-b border-[#F5F5F5]':''}`} style={{ height:58 }}>
                        <span className="text-[13px] font-medium text-[#0A0A0A] w-24 flex-shrink-0">{label}</span>
                        <button
                          onClick={()=>onUpdateConfig({weeklyHours:{...hours,[key]:{...day,closed:!day.closed}}})}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 font-semibold ${day.closed?'border-[#EBEBEB] text-[#9B9B9B] bg-white':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
                        >
                          {day.closed?'Closed':'Open'}
                        </button>
                        {!day.closed&&(
                          <div className="flex items-center gap-1.5 flex-1">
                            <TimeSelect value={day.open}  onChange={v=>onUpdateConfig({weeklyHours:{...hours,[key]:{...day,open:v }}})}/>
                            <span className="text-[#C0C0C0] text-xs">–</span>
                            <TimeSelect value={day.close} onChange={v=>onUpdateConfig({weeklyHours:{...hours,[key]:{...day,close:v}}})}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── MENU ── */}
          {block.id==='menu' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="menu" selected={block.blockStyle??'photo'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} hint="Optional banner photo shown at the top of the menu block."/>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={()=>onUpdateBlock({menuType:'pdf'})}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='pdf'?'border-[#0A0A0A] bg-[#F5F5F5]':'border-[#EBEBEB] hover:border-[#0A0A0A]'}`}>
                  <LucideFileText size={20} color={block.menuType==='pdf'?'#0A0A0A':'#9B9B9B'}/>
                  <span className="text-[11px] font-semibold text-[#0A0A0A]">Upload PDF</span>
                </button>
                <button
                  onClick={()=>onUpdateBlock({menuType:'photos'})}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='photos'?'border-[#0A0A0A] bg-[#F5F5F5]':'border-[#EBEBEB] hover:border-[#0A0A0A]'}`}>
                  <LucideImage size={20} color={block.menuType==='photos'?'#0A0A0A':'#9B9B9B'}/>
                  <span className="text-[11px] font-semibold text-[#0A0A0A]">Photos</span>
                </button>
                <button
                  onClick={()=>onUpdateBlock({menuType:'url'})}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='url'?'border-[#0A0A0A] bg-[#F5F5F5]':'border-[#EBEBEB] hover:border-[#0A0A0A]'}`}>
                  <LucideGlobe size={20} color={block.menuType==='url'?'#0A0A0A':'#9B9B9B'}/>
                  <span className="text-[11px] font-semibold text-[#0A0A0A]">Link</span>
                </button>
              </div>
              {block.menuType==='pdf'&&<PdfField label="PDF file" value={block.menuFile??''} onChange={v=>onUpdateBlock({menuFile:v})}/>}
              {block.menuType==='photos'&&(
                <div>
                  <FieldLabel>Photo gallery URL</FieldLabel>
                  <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="Link to your photo gallery or album…"/>
                </div>
              )}
              {block.menuType==='url'&&(
                <div>
                  <FieldLabel>Menu link</FieldLabel>
                  <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/>
                </div>
              )}
            </div>
          )}

          {/* ── ORDER ── */}
          {block.id==='order' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="order" selected={block.blockStyle??'brand'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} hint="Optional photo shown behind the block."/>
              <div>
                <FieldLabel>Platform</FieldLabel>
                <BrandProviderPicker
                  providers={ORDER_PROVIDERS}
                  selectedKey={block.provider??''}
                  onSelect={(key,label)=>onUpdateBlock({ provider:key, sub:label })}
                />
              </div>
              <div><FieldLabel>Link to your listing</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="Paste your DoorDash / Uber Eats / Grubhub link…"/></div>
            </div>
          )}

          {/* ── BOOK ── */}
          {block.id==='book' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="book" selected={block.blockStyle??'brand'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})}/>
              <div>
                <FieldLabel>Platform</FieldLabel>
                <BrandProviderPicker
                  providers={BOOK_PROVIDERS}
                  selectedKey={block.provider??''}
                  onSelect={(key,label)=>onUpdateBlock({ provider:key, sub:label })}
                />
              </div>
              <div><FieldLabel>Booking link</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="Paste your Resy / OpenTable / Calendly link…"/></div>
            </div>
          )}

          {/* ── SOCIALS ── */}
          {block.id==='socials' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="socials" selected={block.blockStyle??'icons'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} hint="Optional photo behind the social links block."/>
              <div className="space-y-3">
              <FieldLabel>Your social links</FieldLabel>
              {SOCIAL_PLATFORMS.map(({key,label})=>(
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                  <Input value={config.socials[key]??''} onChange={v=>onUpdateConfig({socials:{...config.socials,[key]:v}})} placeholder={`${label} URL…`}/>
                </div>
              ))}
              </div>
            </div>
          )}

          {/* ── WEBSITE / generic ── */}
          {(block.id==='website'||!['location','hours','menu','order','book','socials'].includes(block.id)) && (
            <div className="space-y-5">
              {block.id==='website'&&(
                <>
                  <BlockStylePicker blockId="website" selected={block.blockStyle??'photo'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
                  <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})}/>
                  <div><FieldLabel>Website URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>
                </>
              )}
            </div>
          )}

          {/* Widget layout (all except hours) */}
          {block.id!=='hours' && (
            <div className="mt-6 pt-6 border-t border-[#F5F5F5]">
              <FieldLabel>Widget width</FieldLabel>
              <p className="text-xs text-[#9B9B9B] mb-3">Half-width blocks sit side by side</p>
              <div className="flex gap-2">
                <button
                  onClick={()=>onUpdateBlock({size:'full'})}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${(!block.size||block.size==='full')?'border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A]':'border-[#EBEBEB] text-[#6B6B6B] hover:border-[#0A0A0A]'}`}>
                  <LucideLayoutList size={14} color="currentColor"/>
                  Full width
                </button>
                <button
                  onClick={()=>onUpdateBlock({size:'half'})}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${block.size==='half'?'border-[#0A0A0A] bg-[#F5F5F5] text-[#0A0A0A]':'border-[#EBEBEB] text-[#6B6B6B] hover:border-[#0A0A0A]'}`}>
                  <LucideLayoutGrid size={14} color="currentColor"/>
                  Half width
                </button>
              </div>
            </div>
          )}

          {/* Accent color */}
          <div className="mt-6 pt-6 border-t border-[#F5F5F5]">
            <FieldLabel>Accent color</FieldLabel>
            <AccentColorPicker value={block.color} onChange={v=>onUpdateBlock({color:v})}/>
          </div>

        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EBEBEB] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">
            Cancel
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-[#0A0A0A] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────
export default function BuilderClient({ business,initialConfig }: {
  business:Business|null; initialConfig:OpenStatusPageConfig;
}) {
  const [config,setConfig]=useState<OpenStatusPageConfig>(initialConfig??normalizeOpenStatusPageConfig(undefined));
  const [tab,setTab]=useState<'blocks'|'style'|'preview'>('blocks');
  const [openId,setOpenId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [dragId,setDragId]=useState<string|null>(null);
  const [dragOverId,setDragOverId]=useState<string|null>(null);

  // Hours always first in the block list
  const allBlocks = config.blocks;
  const blocks = [
    ...allBlocks.filter(b=>b.id==='hours'),
    ...allBlocks.filter(b=>b.id!=='hours'),
  ];

  const openBlock=allBlocks.find(b=>b.id===openId)??null;
  const {status:liveStatus,todayLabel}=getLiveStatus(config.weeklyHours);

  function updateBlock(id:string, u:Partial<OpenStatusBlock>) {
    setConfig(c=>({...c,blocks:c.blocks.map(b=>b.id===id?{...b,...u}:b)}));
  }
  function toggleBlock(id:string) {
    updateBlock(id,{on:!allBlocks.find(b=>b.id===id)?.on});
  }
  function handleDrop(targetId: string) {
    if (!dragId || dragId===targetId || dragId==='hours' || targetId==='hours') { setDragId(null); setDragOverId(null); return; }
    setConfig(c => {
      const bs = [...c.blocks];
      const fi = bs.findIndex(b=>b.id===dragId), ti = bs.findIndex(b=>b.id===targetId);
      if(fi<0||ti<0) return c;
      const [moved] = bs.splice(fi,1); bs.splice(ti,0,moved);
      return { ...c, blocks: bs };
    });
    setDragId(null); setDragOverId(null);
  }

  async function save() {
    setSaving(true);
    try { await supabase.auth.updateUser({data:{openstatus_page:config}}); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A]" style={{ fontFamily:"'Poppins', system-ui, sans-serif" }}>

      {/* header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#EBEBEB]">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-black">O</span>
            </div>
            <span className="text-sm font-semibold text-[#0A0A0A] truncate">{business?.name??'Your page'}</span>
            <LucideChevronRight size={14} color="#C0C0C0"/>
            <span className="text-sm text-[#9B9B9B] hidden sm:block">Builder</span>
          </div>
          <button onClick={save} disabled={saving}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0 ${saved?'bg-[#DCFCE7] text-[#166534]':saving?'bg-[#F5F5F5] text-[#9B9B9B]':'bg-[#0A0A0A] text-white hover:bg-[#333]'}`}>
            {saving?'Saving…':saved?'✓ Saved':'Save'}
          </button>
        </div>
      </header>

      {/* tab bar */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-[#EBEBEB]">
        <div className="max-w-[1280px] mx-auto px-6 flex gap-0">
          {(['blocks','style','preview'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`py-3 px-1 mr-6 text-[13px] font-semibold capitalize transition-colors border-b-2 -mb-px ${tab===t?'text-[#0A0A0A] border-[#0A0A0A]':'text-[#9B9B9B] border-transparent hover:text-[#6B6B6B]'}`}>
              {t==='blocks'?'Blocks':t==='style'?'Style':'Preview'}
            </button>
          ))}
        </div>
      </div>

      {/* workspace */}
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="lg:grid lg:grid-cols-[1fr_310px] lg:gap-20">

          {/* LEFT */}
          <div className="min-w-0">

            {/* BLOCKS */}
            {tab==='blocks' && (
              <div>
                <div className="mb-8">
                  <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-1">YOUR PAGE</p>
                  <h2 className="text-2xl font-bold text-[#0A0A0A] leading-tight">Build your page</h2>
                  <p className="text-[#6B6B6B] text-sm mt-1">Hours are always shown first. Tap any block to customize it.</p>
                </div>
                <div className="rounded-2xl border border-[#EBEBEB] overflow-hidden">
                  {blocks.map((block,i)=>(
                    <div key={block.id}
                      className={`flex items-center gap-3 px-4 cursor-pointer transition-all hover:bg-[#FAFAFA]
                        ${i<blocks.length-1?'border-b border-[#F5F5F5]':''}
                        ${block.id==='hours'?'bg-[#FAFFFE]':''}
                        ${dragOverId===block.id&&dragId!==block.id?'border-l-2 border-l-[#0A0A0A] bg-[#F5F5F5]':''}
                        ${dragId===block.id?'opacity-40':''}
                      `}
                      style={{ height:64 }}
                      draggable={block.id!=='hours'}
                      onDragStart={()=>{ if(block.id!=='hours') setDragId(block.id); }}
                      onDragOver={e=>{ e.preventDefault(); setDragOverId(block.id); }}
                      onDragLeave={()=>setDragOverId(null)}
                      onDrop={()=>handleDrop(block.id)}
                      onDragEnd={()=>{ setDragId(null); setDragOverId(null); }}
                      onClick={()=>setOpenId(block.id)}
                    >
                      {block.id!=='hours'
                        ?<div className="flex-shrink-0 cursor-grab opacity-30 hover:opacity-70 transition-opacity"><LucideGrip size={14} color="#6B6B6B"/></div>
                        :<div className="w-[14px] flex-shrink-0"/>
                      }
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${block.on?'bg-[#F5F5F5] border-[#EBEBEB]':'bg-[#FAFAFA] border-[#F0F0F0]'}`}
                        style={block.on&&block.color?{ backgroundColor:`${block.color}12`, borderColor:`${block.color}30` }:{}}>
                        <BlockIcon id={block.id} size={15} color={block.on?(block.color??'#0A0A0A'):'#C0C0C0'}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-semibold leading-tight ${block.on?'text-[#0A0A0A]':'text-[#9B9B9B]'}`}>{block.title}</p>
                          {block.id==='hours' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${liveStatus==='open'?'bg-[#DCFCE7] text-[#166534]':'bg-[#F5F5F5] text-[#9B9B9B]'}`}>
                              {liveStatus==='open'?'● Open':'● Closed'}
                            </span>
                          )}
                          {block.size==='half'&&<span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#F5F5F5] text-[#9B9B9B] flex-shrink-0">½</span>}
                        </div>
                        <p className="text-xs text-[#9B9B9B] leading-tight mt-0.5 truncate">
                          {block.id==='hours'?todayLabel:block.sub}
                        </p>
                      </div>
                      <LucideChevronRight size={14} color="#C0C0C0"/>
                      <Toggle on={block.on} onChange={()=>toggleBlock(block.id)}/>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="mt-10">
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-1">FEATURES & VIBE</p>
                    <p className="text-sm text-[#6B6B6B]">Select all that apply — shown as tags on your page.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FEATURE_TAGS.map(tag=>{
                      const active=(config.tags??[]).includes(tag);
                      return (
                        <button key={tag}
                          onClick={()=>setConfig(c=>({...c,tags:active?(c.tags??[]).filter(t=>t!==tag):[...(c.tags??[]),tag]}))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active?'bg-[#0A0A0A] text-white border-[#0A0A0A]':'border-[#EBEBEB] text-[#6B6B6B] bg-white hover:border-[#0A0A0A] hover:text-[#0A0A0A]'}`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STYLE */}
            {tab==='style' && (
              <div className="space-y-10">
                <div>
                  <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-1">PAGE STYLE</p>
                  <h2 className="text-2xl font-bold text-[#0A0A0A] leading-tight">Customize the look</h2>
                  <p className="text-[#6B6B6B] text-sm mt-1">Your background, photos, and social profiles.</p>
                </div>

                {/* Meta Business note */}
                <div className="rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] px-4 py-3.5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#1877F2] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">Connected to Meta Business?</p>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-snug">Your Facebook cover photo and logo will auto-fill when you connect your account.</p>
                  </div>
                </div>

                {/* Background photo */}
                <PhotoField
                  label="Background / cover photo"
                  value={config.bgImage??''}
                  onChange={v=>setConfig(c=>({...c,bgImage:v||undefined}))}
                  hint="Full-width hero image at the top of your page. Leave blank to use background color only."
                />

                {/* Background color */}
                <div>
                  <FieldLabel>Page background color</FieldLabel>
                  <p className="text-xs text-[#9B9B9B] mb-4">Used behind and below your cover photo</p>
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {BG_PRESETS.map(c=>(
                      <button key={c} onClick={()=>setConfig(p=>({...p,bg:c}))}
                        className="aspect-square rounded-2xl border-2 transition-all hover:scale-105"
                        style={{ background:c, borderColor:config.bg===c?'#0A0A0A':'#EBEBEB' }}
                      />
                    ))}
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="w-9 h-9 rounded-xl border border-[#EBEBEB]" style={{ background:config.bg }}/>
                    <span className="text-xs text-[#9B9B9B]">{config.bg} · or enter any hex</span>
                    <input type="color" value={config.bg} onChange={e=>setConfig(c=>({...c,bg:e.target.value}))} className="opacity-0 absolute w-0 h-0"/>
                  </label>
                  <input
                    value={config.bg}
                    onChange={e=>{ if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setConfig(c=>({...c,bg:e.target.value})); }}
                    placeholder="#f8f5f0"
                    className="mt-2 w-36 bg-white border border-[#EBEBEB] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] font-mono placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
                  />
                </div>

                {/* Socials */}
                <div>
                  <FieldLabel>Social profiles</FieldLabel>
                  <p className="text-xs text-[#9B9B9B] mb-4">Add links — they'll appear on your page</p>
                  <div className="space-y-3">
                    {SOCIAL_PLATFORMS.map(({key,label})=>(
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                        <Input value={config.socials[key]??''} onChange={v=>setConfig(c=>({...c,socials:{...c.socials,[key]:v}}))} placeholder={`${label} URL…`}/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW (mobile only) */}
            {tab==='preview' && (
              <div className="lg:hidden flex flex-col items-center py-8">
                <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-8">What customers see</p>
                <LivePhonePreview business={business} config={config}/>
              </div>
            )}
          </div>

          {/* RIGHT: sticky preview */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-6 text-center">Live preview</p>
              <LivePhonePreview business={business} config={config}/>
            </div>
          </div>

        </div>
      </div>

      {/* modal */}
      {openBlock && (
        <BlockModal
          block={openBlock} config={config}
          onUpdateBlock={u=>updateBlock(openBlock.id,u)}
          onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
          onClose={()=>setOpenId(null)}
        />
      )}

    </div>
  );
}
