'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── types ──────────────────────────────────────────────────────────────────────
type Tone = 'default' | 'muted' | 'accent';
type BlockSize = 'half' | 'full' | 'third';
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
  address?: string;
  lat?: number;
  lng?: number;
  reviews?: Array<{author:string;rating:number;text:string;time:string}>;
  _googleFetching?: boolean; _googleError?: string;
}
export interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[]; bg: string; bgImage?: string;
  socials: Record<string, string>;
  location?: string; tags?: string[]; weeklyHours?: WeeklyHours;
  likeCount?: number; dislikeCount?: number;
  themeColor?: string; placeId?: string;
}
interface Business {
  id: string; name: string; slug: string;
  avatar_url?: string; tagline?: string; category?: string; onboarded_at?: string | null;
}

// ── constants ──────────────────────────────────────────────────────────────────
const BG_PRESETS = [
  // Row 1: light neutrals
  '#ffffff','#fafafa','#f8f5f0','#f5f0e8','#fef9f0',
  // Row 2: pinks/reds
  '#fde8e8','#fbbfbf','#f87171','#ef4444','#dc2626',
  // Row 3: oranges/yellows
  '#fed7aa','#fb923c','#fbbf24','#facc15','#eab308',
  // Row 4: greens
  '#bbf7d0','#4ade80','#22c55e','#16a34a','#166534',
  // Row 5: blues/purples
  '#bfdbfe','#60a5fa','#3b82f6','#1d4ed8','#7c3aed',
  // Row 6: darks
  '#e5e7eb','#6b7280','#374151','#1c1c1c','#0a0a0a',
];
const BLOCK_COLORS = ['#1B5E20','#388E3C','#FF7043','#FFAB40','#A5D6A7','#0a0a0a','#2563eb','#dc2626'];
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
const BLOCK_STYLES: Record<string, { key:string; label:string }[]> = {
  hours:    [{ key:'minimal', label:'Minimal' }, { key:'clock',  label:'Clock'   }, { key:'hero',    label:'Hero'    }],
  location: [{ key:'photo',   label:'Photo'   }, { key:'place',  label:'Place'   }, { key:'minimal', label:'Minimal' }],
  menu:     [{ key:'photo',   label:'Photo'   }, { key:'card',   label:'Card'    }, { key:'dark',    label:'Dark'    }],
  order:    [{ key:'brand',   label:'Brand'   }, { key:'hero',   label:'Hero'    }, { key:'cta',     label:'CTA'     }],
  book:     [{ key:'brand',   label:'Brand'   }, { key:'cal',    label:'Calendar'}, { key:'cta',     label:'CTA'     }],
  website:  [{ key:'photo',   label:'Photo'   }, { key:'link',   label:'Link'    }],
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
  { id:'website', title:'Website',               sub:'Link to your site',          icon:'globe',  on:false,tone:'default',color:'#0891b2',size:'full' },
  { id:'updates', title:'Instagram updates',     sub:'Latest posts from Instagram',icon:'updates',on:false,tone:'default',color:'#E1306C',size:'full' },
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
  const isEmpty = !raw || (typeof raw==='object' && Object.keys(raw as object).length===0);
  const saved = Array.isArray(r.blocks) ? r.blocks as OpenStatusBlock[] : [];
  // When nothing has been configured yet, default to orange bg + all blocks on
  const defaultBlocks = isEmpty
    ? DEFAULT_BLOCKS.map(b=>({...b,on:true}))
    : DEFAULT_BLOCKS.map(def => { const f=saved.find(b=>b.id===def.id); return f?{...def,...f}:{...def}; });
  return {
    blocks:       defaultBlocks,
    bg:           typeof r.bg==='string'?r.bg:(isEmpty?'#FFAB40':'#f8f5f0'),
    bgImage:      typeof r.bgImage==='string'?r.bgImage:undefined,
    socials:      (r.socials&&typeof r.socials==='object')?r.socials as Record<string,string>:{},
    location:     typeof r.location==='string'?r.location:undefined,
    tags:         Array.isArray(r.tags)?r.tags as string[]:[],
    weeklyHours:  (r.weeklyHours&&typeof r.weeklyHours==='object')?r.weeklyHours as WeeklyHours:{...DEFAULT_WEEK_HOURS},
    likeCount:    typeof r.likeCount==='number'?r.likeCount:0,
    dislikeCount: typeof r.dislikeCount==='number'?r.dislikeCount:0,
    themeColor:   typeof r.themeColor==='string'?r.themeColor:undefined,
    placeId:      typeof r.placeId==='string'?r.placeId:undefined,
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
    case 'updates':  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
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
    default:          return <LucideGlobe size={size} color="#858585"/>;
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
      <rect width="32" height="32" rx="7" fill="white" stroke="#DEDEDC" strokeWidth="1"/>
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
    default:           return <LucideGlobe size={size} color="#858585"/>;
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
  return <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-widest mb-2">{children}</p>;
}
function Input({ value,onChange,placeholder,type='text' }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-white border border-[#DEDEDC] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
    />
  );
}
function PillSelect({ options,selected,onSelect }: { options:string[]; selected:string; onSelect:(v:string)=>void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o=>(
        <button key={o} onClick={()=>onSelect(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected===o?'bg-[#0A0A0A] text-white border-[#0A0A0A]':'border-[#DEDEDC] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'}`}>
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
            className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all ${active ? 'border-[#0A0A0A] bg-[#EEEEEC] shadow-sm' : 'border-[#DEDEDC] hover:border-[#C0C0C0] bg-white'}`}
          >
            {key === 'other'
              ? <div className="w-8 h-8 rounded-xl border-2 border-dashed border-[#D4D4D4] flex items-center justify-center"><LucideGlobe size={14} color="#858585"/></div>
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
function StyleThumb({ blockId, styleKey }: { blockId: string; styleKey: string }) {
  // Hours
  if (blockId === 'hours') {
    if (styleKey === 'minimal') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] bg-white flex items-center px-2 gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
        <div className="flex-1 space-y-1"><div className="h-1.5 bg-[#E0E0E0] rounded-full w-full"/><div className="h-1 bg-[#F0F0F0] rounded-full w-3/4"/></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#E0E0E0]"/>
      </div>
    );
    if (styleKey === 'clock') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] bg-white flex flex-col items-center justify-center gap-0.5">
        <div className="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#C0C0C0] relative">
          <div className="absolute left-1/2 top-1/2 w-[1px] h-[5px] bg-[#888] rounded origin-bottom" style={{ transform:'translate(-50%,-100%) rotate(-35deg)' }}/>
          <div className="absolute left-1/2 top-1/2 w-[1px] h-[4px] bg-[#666] rounded origin-bottom" style={{ transform:'translate(-50%,-100%) rotate(60deg)' }}/>
        </div>
        <div className="h-[5px] bg-[#F0F0F0] rounded-full w-10"/>
      </div>
    );
    if (styleKey === 'hero') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-500 to-emerald-600 flex flex-col items-center justify-center gap-0.5">
        <span className="text-[9px] font-black text-white tracking-tight leading-none">OPEN</span>
        <div className="h-[4px] bg-white/30 rounded-full w-10"/>
      </div>
    );
  }
  // Location
  if (blockId === 'location') {
    if (styleKey === 'photo') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] overflow-hidden">
        <div className="h-[22px] bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] flex items-center justify-center">
          <LucidePin size={7} color="rgba(255,255,255,0.6)"/>
        </div>
        <div className="h-[20px] bg-white px-1.5 flex items-center gap-1">
          <div className="h-1.5 bg-[#E8E8E8] rounded-full flex-1"/>
          <div className="h-1.5 w-1.5 bg-[#F0F0F0] rounded"/>
        </div>
      </div>
    );
    if (styleKey === 'place') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] flex flex-col items-center justify-center gap-0.5">
        <LucidePin size={10} color="white"/>
        <div className="h-[4px] bg-white/30 rounded-full w-8"/>
      </div>
    );
    if (styleKey === 'minimal') return (
      <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] bg-white flex items-center px-2 gap-1.5">
        <LucidePin size={8} color="#C0C0C0"/>
        <div className="flex-1 h-1.5 bg-[#E8E8E8] rounded-full"/>
        <span className="text-[7px] text-[#C0C0C0]">›</span>
      </div>
    );
  }
  // Generics
  return <div className="w-[68px] h-[42px] rounded-lg border border-[#E8E8E8] bg-[#EEEEEC]"/>;
}

function BlockStylePicker({ blockId, selected, onSelect }: {
  blockId: string; selected: string; onSelect: (key: string) => void;
}) {
  const styles = BLOCK_STYLES[blockId];
  if (!styles) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-2">Layout</p>
      <div className="flex gap-2">
        {styles.map(s => (
          <button key={s.key} onClick={() => onSelect(s.key)}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 border transition-all ${selected===s.key?'border-[#0A0A0A]':'border-[#E8E8E8] hover:border-[#C0C0C0]'}`}>
            <StyleThumb blockId={blockId} styleKey={s.key}/>
            <span className={`text-[10px] font-semibold ${selected===s.key?'text-[#0A0A0A]':'text-[#858585]'}`}>{s.label}</span>
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
          <span className="text-[10px] text-[#858585]">+</span>
        </button>
        <input ref={colorRef} type="color" value={value??'#2563eb'} onChange={e=>{commit(e.target.value);}} className="opacity-0 absolute w-0 h-0"/>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg border border-[#DEDEDC] flex-shrink-0" style={{ background:value??'#2563eb' }}/>
        <input value={hex} onChange={e=>commit(e.target.value)} placeholder="#000000"
          className="flex-1 bg-white border border-[#DEDEDC] rounded-lg px-3 py-1.5 text-xs text-[#0A0A0A] font-mono focus:outline-none focus:border-[#0A0A0A] transition-colors"
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
      {hint && <p className="text-xs text-[#858585] mb-3 leading-snug">{hint}</p>}
      {value
        ? (
          <div className="relative group rounded-xl overflow-hidden border border-[#DEDEDC]">
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
              className="rounded-xl border-2 border-dashed border-[#D4D4D4] bg-[#F7F7F5] h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0A0A0A] hover:bg-[#EEEEEC] transition-all">
              <LucideImage size={18} color="#858585"/>
              <p className="text-[12px] text-[#858585]">Click to upload</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-px bg-[#DEDEDC]"/>
              <span className="text-[10px] text-[#C0C0C0]">or paste URL</span>
              <div className="flex-1 h-px bg-[#DEDEDC]"/>
            </div>
            <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder??'https://…'}
              className="mt-2 w-full bg-white border border-[#DEDEDC] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
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
          <div className="flex items-center gap-3 rounded-xl border border-[#DEDEDC] bg-[#F7F7F5] px-4 py-3">
            <LucideFileText size={18} color="#0A0A0A"/>
            <span className="text-sm text-[#0A0A0A] font-medium flex-1 truncate">PDF uploaded</span>
            <button onClick={()=>onChange('')} className="text-[11px] text-[#858585] hover:text-[#0A0A0A] transition-colors font-medium">Remove</button>
          </div>
        )
        : (
          <div>
            <div
              onClick={()=>fileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-[#D4D4D4] bg-[#F7F7F5] h-20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#0A0A0A] hover:bg-[#EEEEEC] transition-all">
              <LucideFileText size={18} color="#858585"/>
              <p className="text-[12px] text-[#858585]">Upload PDF</p>
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
      className="bg-white border border-[#DEDEDC] rounded-lg px-2.5 py-1.5 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] cursor-pointer appearance-none">
      {times.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

// ── Tags row with expand ──────────────────────────────────────────────────────
function TagsRow({ tags, isDark }: { tags: string[]; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tags : tags.slice(0, 3);
  const hasMore = tags.length > 3;
  return (
    <div className="flex flex-wrap gap-1 justify-center mt-2">
      {shown.map(t=>(
        <span key={t} className={`text-[8px] px-2 py-0.5 rounded-full ${isDark?'bg-white/15 text-white/75':'bg-black/6 text-black/50'}`}>{t}</span>
      ))}
      {hasMore && (
        <button onClick={()=>setExpanded(e=>!e)} className={`text-[8px] px-2 py-0.5 rounded-full font-semibold ${isDark?'bg-white/20 text-white/80':'bg-black/10 text-black/60'}`}>
          {expanded?'Less':'+'+(tags.length-3)+' more'}
        </button>
      )}
    </div>
  );
}

// ── Screen preview (no phone frame) ───────────────────────────────────────────
function LivePhonePreview({ business,config,selectedId,onSelectBlock,onReorder }: { business:Business|null; config:OpenStatusPageConfig; selectedId?:string|null; onSelectBlock?:(id:string)=>void; onReorder?:(fromId:string,toId:string)=>void }) {
  const [pDragId,setPDragId]=React.useState<string|null>(null);
  const [pDragOver,setPDragOver]=React.useState<string|null>(null);
  const activeBlocks = config.blocks.filter(b=>b.on);
  // Hours always first in preview
  const sortedBlocks = [
    ...activeBlocks.filter(b=>b.id==='hours'),
    ...activeBlocks.filter(b=>b.id!=='hours'),
  ];
  const isDark = ['#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c'].includes(config.bg);
  const tx = isDark?'text-white':'text-[#0A0A0A]';
  const sx = isDark?'text-white/55':'text-[#6B6B6B]';
  const { status, todayLabel } = getLiveStatus(config.weeklyHours);
  const locBlock = config.blocks.find(b=>b.id==='location');
  const reviewPct = locBlock?.reviewStars&&locBlock.reviewStars>0 ? starsToPercent(locBlock.reviewStars) : null;

  return (
    <div className="mx-auto" style={{ width:310 }}>
      <div
        className="relative rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8"
        style={{
          background: config.bg || '#F7F7F5',
          minHeight: 560,
        }}
      >
        {/* Photo header — constrained 148px, fades into page bg */}
        {config.bgImage && (
          <div style={{ position:'relative', height:148, overflow:'hidden' }}>
            <img src={config.bgImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 60%', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom, transparent 40%, ${config.bg||'#F7F7F5'} 100%)` }}/>
          </div>
        )}

        {/* Hero header */}
        <div className="relative px-4 pb-3 text-center" style={{ marginTop: config.bgImage ? -28 : 0, paddingTop: config.bgImage ? 0 : 32 }}>
          {business?.avatar_url
            ?<img src={business.avatar_url?.startsWith('storage:')&&business.id?`/api/assets?businessId=${business.id}&kind=avatar`:business.avatar_url??''} className={`w-12 h-12 rounded-full mx-auto mb-2 object-cover ${config.bgImage?'border-2 border-white/70 shadow-lg':''}`} alt=""/>
            :<div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-[10px] font-black tracking-tight ${isDark?'bg-white/10 text-white':'bg-black/8 text-black'}`}>
              {(business?.name??'B').slice(0,1).toUpperCase()}
            </div>
          }
          <p className={`font-bold text-[13px] ${tx}`}>{business?.name??'Your Business'}</p>
          {config.location && <p className={`text-[9px] truncate px-2 mt-0.5 ${sx}`}>{config.location}</p>}
          <div className="flex items-center justify-center gap-3 mt-2">
            {reviewPct && (
              <div className="flex items-center gap-1">
                <LucideStar size={9} color="#f59e0b" filled/>
                <span className="text-[9px] font-semibold text-[#f59e0b]">{reviewPct}%</span>
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
            <TagsRow tags={config.tags??[]} isDark={isDark}/>
          )}
        </div>

        {/* Blocks — support half/full layout */}
        <div className="relative px-3 pb-5">
          {sortedBlocks.length===0
            ?<p className={`text-center text-[10px] py-8 ${sx}`}>Toggle blocks to see them here</p>
            :<div className="grid grid-cols-2 gap-1.5">
              {sortedBlocks.map(b=>{
                const isHalf = b.size==='half' && b.id!=='hours';
                const cardBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)';
                const bdr = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.82)';

                const bStyle = b.blockStyle ?? (b.id==='hours'?'minimal':b.id==='location'?'photo':'brand');
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
                    if(bStyle==='hero') return (
                      <div className="rounded-2xl px-4 py-4 text-center" style={{ background: status==='open'?`linear-gradient(135deg,${b.color??'#059669'},#10b981)`:`linear-gradient(135deg,#374151,#6b7280)` }}>
                        <p className="text-white font-black text-[20px] tracking-tight">{status==='open'?'OPEN':'CLOSED'}</p>
                        <p className="text-white/65 text-[8px] mt-0.5">{todayLabel}</p>
                      </div>
                    );
                    // default minimal
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
                    // All location styles share the same map-button pattern
                    const mapsHref = b.sub ? `https://maps.google.com/?q=${encodeURIComponent(b.sub)}` : '#';
                    // Show embedded map preview when google URL or address is set
                    if(b.googleUrl||b.appleMapsUrl||b.sub) {
                      const mapQuery = b.googleUrl ? (()=>{ try{ const m=decodeURIComponent(b.googleUrl).match(/\/maps\/place\/([^/@?]+)/); return m?m[1].replace(/\+/g,' '):b.sub||b.title; }catch{return b.sub||b.title;} })() : (b.sub||b.title);
                      return (
                        <div className="col-span-2 rounded-2xl overflow-hidden border" style={{borderColor:bdr}}>
                          <div className="relative w-full overflow-hidden" style={{height:80}}>
                            <iframe src={(b.lat&&b.lng)?`https://maps.google.com/maps?q=${b.lat},${b.lng}&output=embed&hl=en&z=16`:`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed&hl=en`} className="absolute inset-0 w-full h-full border-0" loading="lazy" title="map"/>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-2.5 py-2" style={{background:cardBg}}>
                            <p className={`text-[9px] font-semibold truncate ${tx}`}>{b.sub||mapQuery}</p>
                            <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{background:b.color||'#1A1A18'}}>Directions →</span>
                          </div>
                        </div>
                      );
                    }
                    if(bStyle==='minimal') return (
                      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                        <LucidePin size={10} color={b.color}/>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                          {b.sub&&<p className={`text-[8px] truncate ${isDark?'text-white/40':'text-black/40'}`}>{b.sub}</p>}
                        </div>
                        <span className={`text-[8px] font-bold ${isDark?'text-white/40':'text-black/35'}`}>Directions ›</span>
                      </a>
                    );
                    if(bStyle==='place') return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                        <div className="flex flex-col items-center justify-center py-3" style={{ background:'linear-gradient(135deg,#1e3a5f,#0f172a)',minHeight:60 }}>
                          <LucidePin size={18} color="white"/>
                          <p className="text-white text-[9px] font-semibold mt-1 px-2 text-center truncate">{b.sub||b.title}</p>
                        </div>
                        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 px-2 py-2" style={{ background:cardBg }}>
                          <LucidePin size={8} color={b.color}/>
                          <span className={`text-[8px] font-bold ${isDark?'text-white/60':'text-black/55'}`}>Get Directions</span>
                        </a>
                      </div>
                    );
                    // default photo style
                    return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                        {b.coverPhoto
                          ?<img src={b.coverPhoto} className="w-full h-[54px] object-cover" alt=""/>
                          :<div className="h-[54px] flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1e3a5f,#111827)' }}>
                            <LucidePin size={16} color="white"/>
                          </div>
                        }
                        <div className="px-2.5 py-2" style={{ background:cardBg }}>
                          {b.sub&&<p className={`text-[9px] truncate mb-1 ${isDark?'text-white/50':'text-black/45'}`}>{b.sub}</p>}
                          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold" style={{ background:b.color,color:'white' }}>
                            <LucidePin size={7} color="white"/> Get Directions
                          </a>
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
                  // ── UPDATES (Instagram) ──
                  if(b.id==='updates') return (
                    <div className="rounded-2xl border overflow-hidden col-span-2" style={{ borderColor:bdr, background:cardBg }}>
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor:bdr }}>
                        <BlockIcon id="updates" size={10} color="#E1306C"/>
                        <p className={`text-[10px] font-semibold ${tx}`}>Latest updates</p>
                      </div>
                      {[1,2,3].map(i=>(
                        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-0" style={{ borderColor:bdr }}>
                          <div className="w-6 h-6 rounded flex-shrink-0" style={{ background:`${b.color??'#E1306C'}20` }}/>
                          <div className="min-w-0 flex-1">
                            <div className={`h-1.5 rounded-full mb-1 ${isDark?'bg-white/15':'bg-black/10'}`} style={{ width:`${[80,65,72][i-1]}%` }}/>
                            <div className={`h-1 rounded-full ${isDark?'bg-white/8':'bg-black/6'}`} style={{ width:`${[55,40,60][i-1]}%` }}/>
                          </div>
                        </div>
                      ))}
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

                const isSelected = selectedId === b.id;
                return (
                  <div key={b.id}
                    draggable={b.id!=='hours'&&!!onReorder}
                    onDragStart={()=>{if(b.id!=='hours')setPDragId(b.id);}}
                    onDragOver={e=>{e.preventDefault();if(b.id!==pDragId)setPDragOver(b.id);}}
                    onDrop={e=>{e.preventDefault();if(pDragId&&pDragId!==b.id&&b.id!=='hours'){onReorder?.(pDragId,b.id);}setPDragId(null);setPDragOver(null);}}
                    onDragEnd={()=>{setPDragId(null);setPDragOver(null);}}
                    className={`${isHalf?'col-span-1':'col-span-2'} ${onSelectBlock?'cursor-pointer':''} ${b.id!=='hours'&&onReorder?'cursor-grab active:cursor-grabbing':''}`}
                    onClick={()=>onSelectBlock?.(b.id)}
                    style={{
                      ...(isSelected?{ outline:'2px solid #0A0A0A', borderRadius:16, outlineOffset:2 }:{}),
                      opacity: pDragId===b.id ? 0.4 : 1,
                      outline: pDragOver===b.id&&pDragId!==b.id ? '2px dashed #0A0A0A' : (isSelected?'2px solid #0A0A0A':undefined),
                      borderRadius: 16,
                      outlineOffset: 2,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          }
        </div>
      </div>
      {/* Social icon row */}
      {SOCIAL_PLATFORMS.filter(p=>config.socials&&config.socials[p.key]).length>0&&(
        <div className="flex items-center justify-center gap-3 mt-4 pb-1">
          {SOCIAL_PLATFORMS.filter(p=>config.socials&&config.socials[p.key]).map(p=>(
            <div key={p.key} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark?'bg-white/10':'bg-black/6'}`}>
              <SocialIcon platform={p.key} size={15}/>
            </div>
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-[#858585] mt-4 font-medium">openstatus.co/…</p>
    </div>
  );
}

// ── Desktop page preview (matches [slug]/page.tsx layout) ─────────────────────
function LiveDesktopPreview({ business,config }: { business:Business|null; config:OpenStatusPageConfig }) {
  const isDark = ['#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c'].includes(config.bg);
  const bg = config.bg || '#F7F7F5';
  const { status, todayLabel } = getLiveStatus(config.weeklyHours);
  const activeBlocks = config.blocks.filter(b => b.on);
  // Hours always first, like the real page
  const hoursBlock = activeBlocks.find(b => b.id === 'hours');
  const locBlock = config.blocks.find(b => b.id === 'location');
  const otherBlocks = activeBlocks.filter(b => b.id !== 'hours' && b.id !== 'location');
  const reviewPct = locBlock?.reviewStars && locBlock.reviewStars > 0 ? starsToPercent(locBlock.reviewStars) : null;
  const coverPhoto = config.bgImage;
  const avatarUrl = business?.avatar_url && !business.avatar_url.startsWith('storage:') ? business.avatar_url : null;
  const avatarStorageUrl = business?.avatar_url?.startsWith('storage:') && business?.id ? `/api/assets?businessId=${business.id}&kind=avatar` : null;
  const avatar = avatarUrl || avatarStorageUrl;
  const initials = (business?.name ?? 'B').split(/\s+/).filter(Boolean).slice(0,2).map((p:string)=>p[0]).join('').toUpperCase();
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r:parseInt(result[1],16), g:parseInt(result[2],16), b:parseInt(result[3],16) } : { r:247,g:247,b:245 };
  }
  const { r,g,b: bv } = hexToRgb(bg);
  const fadeGradient = `linear-gradient(to bottom, rgba(${r},${g},${bv},0) 0%, rgba(${r},${g},${bv},0.08) 22%, rgba(${r},${g},${bv},0.35) 48%, rgba(${r},${g},${bv},0.72) 72%, ${bg} 100%)`;
  const glass: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.82)'}`,
    boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '16px 18px',
  };
  const tx = isDark ? '#fff' : '#151515';
  const sx = isDark ? 'rgba(255,255,255,0.5)' : '#8A8A86';
  const themeColor = config.themeColor || '#DB6B8F';
  // span helper matching real page
  const spanCols = (b: OpenStatusBlock) => b.size === 'third' ? 2 : b.size === 'half' ? 3 : 6;

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>

        {/* Cover photo — 360px like real page */}
        {coverPhoto ? (
          <div style={{ position:'relative', height:260, overflow:'hidden' }}>
            <img src={coverPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'50% 60%', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:fadeGradient }}/>
          </div>
        ) : (
          <div style={{ height:72, background:'rgba(0,0,0,0.04)' }}/>
        )}

        {/* Logo — 96px like real page (104px scaled) */}
        <div style={{ display:'flex', justifyContent:'center', marginTop: coverPhoto ? -52 : 0, position:'relative', zIndex:10 }}>
          {avatar ? (
            <img src={avatar} alt="" style={{ width:96, height:96, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.90)', background:'rgba(255,255,255,0.80)', objectFit:'cover', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', display:'block' }}/>
          ) : (
            <div style={{ width:96, height:96, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.90)', background:'rgba(255,255,255,0.80)', display:'grid', placeItems:'center', fontSize:28, fontWeight:800, color:themeColor, boxShadow:'0 8px 32px rgba(0,0,0,0.12)' }}>
              {initials}
            </div>
          )}
        </div>

        {/* Name + tagline */}
        <div style={{ textAlign:'center', padding:'10px 20px 6px' }}>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.03em', color:tx, lineHeight:1.1, margin:0, fontFamily:'Georgia, "Times New Roman", serif' }}>
            {business?.name ?? 'Your Business'}
          </h1>
          {business?.tagline && (
            <p style={{ fontSize:10, fontWeight:500, letterSpacing:'0.15em', textTransform:'uppercase', color:sx, marginTop:6, margin:'6px 0 0' }}>
              {business.tagline}
            </p>
          )}
          {reviewPct && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginTop:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>{reviewPct}%</span>
              {locBlock?.reviewCount && <span style={{ fontSize:10, color:sx }}> · {locBlock.reviewCount.toLocaleString()}</span>}
            </div>
          )}
        </div>

        {/* Hours block — inline like real page */}
        {hoursBlock && hoursBlock.on && (
          <div style={{ padding:'8px 12px 0' }}>
            <div style={{ ...glass, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)', display:'grid', placeItems:'center' }}>
                <BlockIcon id="hours" size={16} color={hoursBlock.color}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color:tx, margin:0, letterSpacing:'-0.01em' }}>
                  {status === 'open' ? 'Open now' : 'Closed now'}
                </p>
                <p style={{ fontSize:11, color:status==='open'?'#22C55E':'#8A8A86', margin:0, marginTop:1 }}>{todayLabel}</p>
              </div>
              <div style={{ width:8, height:8, borderRadius:'50%', background:status==='open'?'#22C55E':'#8A8A86', flexShrink:0 }}/>
            </div>
          </div>
        )}

        {/* Location block — inline if present */}
        {locBlock && locBlock.on && (locBlock.address||locBlock.sub) && (
          <div style={{ padding:'8px 12px 0' }}>
            <div style={{ ...glass }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)', display:'grid', placeItems:'center' }}>
                  <BlockIcon id="location" size={16} color={locBlock.color}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:tx, margin:0 }}>{locBlock.title||'Location'}</p>
                  <p style={{ fontSize:11, color:sx, margin:0, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{locBlock.address||locBlock.sub}</p>
                </div>
                <div style={{ height:36, paddingLeft:12, paddingRight:12, borderRadius:10, background:themeColor, display:'flex', alignItems:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>Directions</div>
              </div>
            </div>
          </div>
        )}

        {/* Other blocks — 6-col grid matching real page */}
        {otherBlocks.length > 0 && (
          <div style={{ padding:'8px 12px 0', display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:8 }}>
            {otherBlocks.map(b => (
              <div key={b.id} style={{ gridColumn:`span ${spanCols(b)}`, ...glass }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)', display:'grid', placeItems:'center' }}>
                    <BlockIcon id={b.id} size={15} color={b.color}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:tx, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.title}</p>
                    {b.sub && <p style={{ fontSize:10, color:sx, margin:0, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.sub}</p>}
                  </div>
                  {b.url && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sx} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Social row */}
        {SOCIAL_PLATFORMS.filter(p => config.socials && config.socials[p.key]).length > 0 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'16px 0' }}>
            {SOCIAL_PLATFORMS.filter(p => config.socials && config.socials[p.key]).map(p => (
              <div key={p.key} style={{ width:38, height:38, borderRadius:'50%', display:'grid', placeItems:'center', background: isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.06)' }}>
                <SocialIcon platform={p.key} size={15}/>
              </div>
            ))}
          </div>
        )}

        {/* Footer slug */}
        <p style={{ textAlign:'center', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(0,0,0,0.22)', paddingBottom:24 }}>
          openstatus.co/{business?.slug||'your-page'}
        </p>
      </div>
    </div>
  );
}

// ── Block edit panel (inline right of blocks, no modal) ───────────────────────
function BlockEditPanel({ block,config,onUpdateBlock,onUpdateConfig,onClose }: {
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

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-[#DEDEDC] flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] text-[#858585] hover:text-[#0A0A0A] transition-colors font-medium -ml-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Blocks
        </button>
        <div className="h-4 w-px bg-[#DEDEDC]"/>
        <div className="w-7 h-7 rounded-lg bg-[#EEEEEC] border border-[#DEDEDC] flex items-center justify-center flex-shrink-0">
          <BlockIcon id={block.id} size={13} color="#0A0A0A"/>
        </div>
        <p className="font-semibold text-[14px] text-[#0A0A0A] leading-tight flex-1 min-w-0 truncate">{block.title}</p>
      </div>

      {/* body */}
      <div className="overflow-y-auto flex-1 space-y-1">
        {/* Title + subtitle — always shown */}
        <div className="pb-5 mb-5 border-b border-[#F0F0F0]">
          <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Content</p>
          <div className="space-y-3">
            <div><FieldLabel>Title</FieldLabel><Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/></div>
            <div><FieldLabel>Subtitle</FieldLabel><Input value={block.sub} onChange={v=>onUpdateBlock({sub:v})}/></div>
          </div>
        </div>

        <div className="space-y-5">

          {/* ── LOCATION ── */}
          {block.id==='location' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="location" selected={block.blockStyle??'photo'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <PhotoField
                label="Place photo (optional)"
                value={block.coverPhoto??''}
                onChange={v=>onUpdateBlock({coverPhoto:v})}
                hint="A photo of your storefront or location."
              />
              <div>
                <FieldLabel>Address</FieldLabel>
                <Input value={block.sub??''} onChange={v=>onUpdateBlock({sub:v})} placeholder="123 Main St, Nashville, TN"/>
                <p className="mt-1 text-[10px] text-black/35">Visitors tap the button and it opens Maps on their phone.</p>
              </div>
              <div>
                <FieldLabel>Apple Maps URL</FieldLabel>
                <Input value={block.appleMapsUrl??''} onChange={v=>onUpdateBlock({appleMapsUrl:v})} placeholder="Paste from Apple Maps → Share → Copy link"/>
              </div>
              {/* Review platforms */}
              <div>
                <FieldLabel>Review profiles</FieldLabel>
                <p className="text-xs text-[#858585] mb-3">Paste your listings — we pull your rating automatically</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0"><IconYelp size={28}/></div>
                    <Input value={block.yelpUrl??''} onChange={v=>onUpdateBlock({yelpUrl:v})} placeholder="Paste your Yelp listing URL…"/>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0"><IconGoogle size={28}/></div>
                    <div className="flex-1 flex gap-2">
                      <Input value={block.googleUrl??''} onChange={v=>onUpdateBlock({googleUrl:v})} placeholder="Paste your Google Business profile URL…"/>
                      {block.googleUrl&&(
                        <button
                          onClick={async()=>{
                            onUpdateBlock({_googleFetching:true,_googleError:''});
                            try{
                              const r=await fetch(`/api/google/rating?url=${encodeURIComponent(block.googleUrl??'')}`); 
                              const d=await r.json() as {rating?:number;reviewCount?:number;name?:string;error?:string};
                              if(!r.ok||d.error)throw new Error(d.error??'Failed');
                              onUpdateBlock({reviewStars:d.rating,reviewCount:d.reviewCount,_googleFetching:false,_googleError:''});
                            }catch(e){onUpdateBlock({_googleFetching:false,_googleError:e instanceof Error?e.message:'Failed to fetch'});}
                          }}
                          className="flex-shrink-0 px-3 py-2 rounded-xl bg-[#0A0A0A] text-white text-[11px] font-bold hover:bg-[#292929] transition-colors whitespace-nowrap disabled:opacity-50"
                          disabled={block._googleFetching}
                        >{block._googleFetching?'…':'Fetch'}</button>
                      )}
                    </div>
                  </div>
                  {block._googleError&&<p className="text-[11px] text-red-500 mt-1">{block._googleError}</p>}
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
              <BlockStylePicker blockId="hours" selected={block.blockStyle??'minimal'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border ${status==='open'?'bg-[#F0FDF4] border-[#BBF7D0]':'bg-[#F7F7F5] border-[#DEDEDC]'}`}>
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
                <div className="rounded-2xl border border-[#DEDEDC] overflow-hidden">
                  {DAYS.map(({key,label},i)=>{
                    const day=hours[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 px-4 ${i<DAYS.length-1?'border-b border-[#F5F5F5]':''}`} style={{ height:58 }}>
                        <span className="text-[13px] font-medium text-[#0A0A0A] w-24 flex-shrink-0">{label}</span>
                        <button
                          onClick={()=>onUpdateConfig({weeklyHours:{...hours,[key]:{...day,closed:!day.closed}}})}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 font-semibold ${day.closed?'border-[#DEDEDC] text-[#858585] bg-white':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
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
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='pdf'?'border-[#0A0A0A] bg-[#EEEEEC]':'border-[#DEDEDC] hover:border-[#0A0A0A]'}`}>
                  <LucideFileText size={20} color={block.menuType==='pdf'?'#0A0A0A':'#858585'}/>
                  <span className="text-[11px] font-semibold text-[#0A0A0A]">Upload PDF</span>
                </button>
                <button
                  onClick={()=>onUpdateBlock({menuType:'photos'})}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='photos'?'border-[#0A0A0A] bg-[#EEEEEC]':'border-[#DEDEDC] hover:border-[#0A0A0A]'}`}>
                  <LucideImage size={20} color={block.menuType==='photos'?'#0A0A0A':'#858585'}/>
                  <span className="text-[11px] font-semibold text-[#0A0A0A]">Photos</span>
                </button>
                <button
                  onClick={()=>onUpdateBlock({menuType:'url'})}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 transition-all ${block.menuType==='url'?'border-[#0A0A0A] bg-[#EEEEEC]':'border-[#DEDEDC] hover:border-[#0A0A0A]'}`}>
                  <LucideGlobe size={20} color={block.menuType==='url'?'#0A0A0A':'#858585'}/>
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


          {/* ── UPDATES ── */}
          {block.id==='updates' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#FFF0F5] border border-[#F9A8D4] p-4">
                <p className="text-[12px] font-semibold text-[#BE185D]">Instagram updates</p>
                <p className="text-[11px] text-[#858585] mt-1 leading-snug">Shows your 3 most recent Instagram posts as updates on your page. Make sure Meta is connected in your setup.</p>
              </div>
            </div>
          )}

          {/* ── WEBSITE / generic ── */}
          {(block.id==='website'||!['location','hours','menu','order','book','updates'].includes(block.id)) && (
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

          {/* Widget width */}
          {block.id!=='hours' && (
            <div className="pt-5 border-t border-[#F0F0F0]">
              <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Width</p>
              <div className="flex gap-2">
                <button onClick={()=>onUpdateBlock({size:'full'})}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${(!block.size||block.size==='full')?'border-[#0A0A0A] bg-[#EEEEEC] text-[#0A0A0A]':'border-[#DEDEDC] text-[#858585] hover:border-[#0A0A0A]'}`}>
                  <LucideLayoutList size={13} color="currentColor"/> Full
                </button>
                <button onClick={()=>onUpdateBlock({size:'half'})}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${block.size==='half'?'border-[#0A0A0A] bg-[#EEEEEC] text-[#0A0A0A]':'border-[#DEDEDC] text-[#858585] hover:border-[#0A0A0A]'}`}>
                  <LucideLayoutGrid size={13} color="currentColor"/> Half
                </button>
              </div>
            </div>
          )}

          {/* Accent color */}
          <div className="pt-5 border-t border-[#F0F0F0]">
            <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Color</p>
            <AccentColorPicker value={block.color} onChange={v=>onUpdateBlock({color:v})}/>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Block picker (command palette style) ──────────────────────────────────────
const PICKER_CATEGORIES = [
  { label:'ESSENTIALS', ids:['hours','location','menu','website'] },
  { label:'CONVERT',    ids:['order','book'] },
];

function BlockPicker({ blocks, onAdd, onClose }: {
  blocks: OpenStatusBlock[];
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/15"/>
      <div className="relative bg-white rounded-2xl w-full max-w-[380px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-[#DEDEDC] overflow-hidden" onClick={e=>e.stopPropagation()}>
        {/* search */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0F0F0]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text" placeholder="Search blocks…" value={search}
            onChange={e=>setSearch(e.target.value)}
            className="flex-1 text-[14px] text-[#0A0A0A] placeholder-[#C0C0C0] border-none outline-none bg-transparent"
            autoFocus
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto py-2">
          {PICKER_CATEGORIES.map(cat => {
            const items = cat.ids
              .map(id => DEFAULT_BLOCKS.find(b=>b.id===id))
              .filter((b): b is OpenStatusBlock => !!b && (!search || b.title.toLowerCase().includes(search.toLowerCase())));
            if (items.length === 0) return null;
            return (
              <div key={cat.label}>
                <p className="text-[10px] font-semibold text-[#C0C0C0] tracking-widest uppercase px-4 pt-3 pb-1">{cat.label}</p>
                {items.map(def => {
                  const isOn = blocks.find(b=>b.id===def.id)?.on;
                  return (
                    <button key={def.id}
                      onClick={()=>{ onAdd(def.id); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F7F7F5] transition-colors text-left">
                      <div className="w-8 h-8 rounded-xl bg-[#EEEEEC] border border-[#DEDEDC] flex items-center justify-center flex-shrink-0">
                        <BlockIcon id={def.id} size={14} color="#0A0A0A"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{def.title}</p>
                        <p className="text-[11px] text-[#858585] leading-tight">{def.sub}</p>
                      </div>
                      {isOn && <span className="text-[10px] text-[#C0C0C0] font-medium flex-shrink-0">Added</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── tutorial overlay ───────────────────────────────────────────────────────────
const TUT_STEPS = [
  { id: null,         title: 'Welcome to your builder!',   body: "We'll walk you through the basics in 30 seconds. Hit Next to start, or Skip to explore on your own.", align: 'center' as const },
  { id: 'tut-hours',  title: 'Start with your hours',         body: 'Click the Hours block to set your open/closed times. This powers your live status that customers see instantly.', align: 'right' as const },
  { id: 'tut-preview',title: 'This is your live page',        body: "The phone preview shows exactly what customers see. Click any block on the preview to jump straight into editing it.", align: 'left' as const },
  { id: 'tut-add',    title: 'Add more features',             body: 'Hit "+ Add block" to turn on menus, online ordering, reservations, and your website link.', align: 'right' as const },
  { id: 'tut-save',   title: 'You\'re already live!',      body: 'Your page is live at your link the moment you save. Hit Save any time to publish your latest changes.', align: 'center' as const },
];

function TutorialOverlay({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [spotRect, setSpotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const current = TUT_STEPS[step];

  const updateSpot = useCallback(() => {
    if (!current.id) { setSpotRect(null); return; }
    const el = document.querySelector(`[data-tut="${current.id}"]`);
    if (!el) { setSpotRect(null); return; }
    const r = el.getBoundingClientRect();
    setSpotRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [current.id]);

  useEffect(() => {
    updateSpot();
    window.addEventListener('resize', updateSpot);
    return () => window.removeEventListener('resize', updateSpot);
  }, [updateSpot]);

  const next = () => { if (step < TUT_STEPS.length - 1) setStep(s => s + 1); else onDone(); };
  const isLast = step === TUT_STEPS.length - 1;

  // Tooltip position logic
  let tooltipStyle: React.CSSProperties = {};
  if (!spotRect || current.align === 'center') {
    tooltipStyle = { bottom: 32, left: '50%', transform: 'translateX(-50%)' };
  } else if (current.align === 'right') {
    tooltipStyle = { top: spotRect.top + spotRect.height / 2 - 80, left: spotRect.left + spotRect.width + 16 };
  } else {
    tooltipStyle = { top: spotRect.top + spotRect.height / 2 - 80, right: window.innerWidth - spotRect.left + 16 };
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {spotRect&&(
        <div className="absolute pointer-events-none" style={{top:spotRect.top,left:spotRect.left,width:spotRect.width,height:spotRect.height,boxShadow:'0 0 0 9999px rgba(0,0,0,0.45)',borderRadius:12,zIndex:51}}/>
      )}
      {!spotRect&&<div className="absolute inset-0 bg-black/45" style={{zIndex:51}}/>}
      <div className="absolute pointer-events-auto bg-white rounded-2xl shadow-2xl p-6 w-72" style={{...tooltipStyle,zIndex:52}}>
        <p className="text-[11px] font-bold tracking-[0.12em] text-[#858585] uppercase mb-1">Step {step+1} of {TUT_STEPS.length}</p>
        <h3 className="text-[16px] font-bold text-[#0A0A0A] mb-2 leading-snug">{current.title}</h3>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-5">{current.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onDone} className="text-[12px] text-[#858585] hover:text-[#111] font-medium transition-colors">Skip</button>
          <div className="flex items-center gap-2">
            {step>0&&<button onClick={()=>setStep(s=>s-1)} className="px-4 py-1.5 text-[12px] font-semibold rounded-full border border-[#E0E0E0] text-[#6B6B6B] hover:border-[#111] transition-colors">Back</button>}
            <button onClick={next} className="px-4 py-1.5 text-[12px] font-semibold rounded-full bg-[#0A0A0A] text-white hover:bg-[#292929] transition-colors">{isLast?'Done':'Next →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── sidebar nav icons ──────────────────────────────────────────────────────────
function IconPalette({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill={color}/><circle cx="17.5" cy="10.5" r=".5" fill={color}/><circle cx="8.5" cy="7.5" r=".5" fill={color}/><circle cx="6.5" cy="12.5" r=".5" fill={color}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
}
function IconLink({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
}
function IconBuilding({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconPuzzle({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-3.407 0l-1.569-1.568c-.23-.23-.556-.338-.877-.29-.333.054-.611.302-.642.635a2.5 2.5 0 1 1-3.5-3.501c.332-.03.58-.309.635-.642.049-.321-.059-.647-.29-.877L4.009 12.19c-.47-.47-.706-1.087-.706-1.704s.236-1.233.706-1.704l1.61-1.61a.979.979 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 3.408 0l1.568 1.568c.23.23.556.338.877.29.333-.054.611-.302.642-.635a2.5 2.5 0 0 1 5 0c-.031.333-.309.58-.642.635z"/></svg>;
}
function IconBarChart({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IconSettings({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IconEye({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconSmartphone({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
}
function IconMonitor({ size=16,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
}
function IconChevronDown({ size=14,color='currentColor' }: { size?:number;color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}

// ── time select for hours ──────────────────────────────────────────────────────
// (TimeSelect is defined above in BlockEditPanel scope — re-declare here for main builder use)
function TimeSelectInline({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) times.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-[#EEEEEC] border border-[#DEDEDC] rounded-xl px-3 py-2 text-[13px] font-medium text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors cursor-pointer hover:bg-[#EEEEEE]">
      {times.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

type SidebarTab = 'design'|'links'|'hours'|'integrations'|'analytics'|'settings'|'preview'|'status';
type HoursSubTab = 'regular'|'special'|'status'|'auto';


// ── IntCard (standalone component — must not be nested in render) ────────────
function IntCard({cardKey,icon,name,desc,connected,url,onSave,onClear,placeholder,expandedKey,setExpandedKey}:{
  cardKey:string;icon:React.ReactNode;name:string;desc:string;connected:boolean;url?:string;
  onSave:(url:string)=>void;onClear?:()=>void;placeholder:string;
  expandedKey:string|null;setExpandedKey:(k:string|null)=>void;
}){
  const isExpanded=expandedKey===cardKey;
  const [localVal,setLocalVal]=React.useState(url??'');
  React.useEffect(()=>{if(isExpanded)setLocalVal(url??'');},[isExpanded,url]);
  return(
    <div className={`rounded-2xl border bg-white mb-2 transition-colors ${isExpanded?'border-[#0A0A0A]':'border-[#DEDEDC] hover:border-[#C0C0C0]'}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0 overflow-hidden">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#0A0A0A] leading-tight">{name}</p>
          {connected&&url?(
            <p className="text-[10px] text-emerald-600 truncate max-w-[160px]">✓ {url.replace(/^https?:\/\//,'')}</p>
          ):(
            <p className="text-[10px] text-[#ACACAC]">{desc}</p>
          )}
        </div>
        {connected?(
          <button onClick={()=>{setExpandedKey(isExpanded?null:cardKey);}} className="flex-shrink-0 text-[10px] font-bold text-[#0A0A0A] border border-[#DEDEDC] rounded-full px-3 py-1 hover:border-[#0A0A0A] transition-colors">{isExpanded?'Cancel':'Edit'}</button>
        ):(
          <button onClick={()=>setExpandedKey(isExpanded?null:cardKey)} className="flex-shrink-0 text-[10px] font-bold text-white bg-[#0A0A0A] rounded-full px-3 py-1 hover:bg-[#292929] transition-colors">Add</button>
        )}
      </div>
      {isExpanded&&(
        <div className="px-3 pb-3 flex flex-col gap-2">
          <input
            autoFocus
            type="url"
            value={localVal}
            onChange={e=>setLocalVal(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[#DEDEDC] bg-[#F7F7F5] px-3 py-2 text-[12px] outline-none focus:border-[#0A0A0A] transition-colors"
            onKeyDown={e=>{if(e.key==='Enter'&&localVal.trim()){onSave(localVal.trim());setExpandedKey(null);}if(e.key==='Escape')setExpandedKey(null);}}
          />
          <div className="flex gap-2">
            <button
              disabled={!localVal.trim()}
              onClick={()=>{if(localVal.trim()){onSave(localVal.trim());setExpandedKey(null);}}}
              className="flex-1 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2 hover:bg-[#292929] transition-colors disabled:opacity-40">Save</button>
            {connected&&onClear&&(
              <button onClick={()=>{onClear();setExpandedKey(null);}} className="rounded-xl border border-[#DEDEDC] text-[#858585] text-[12px] font-bold px-4 py-2 hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors">Remove</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IntegrationsPanel (top-level component — hooks always called) ─────────────
function IntegrationsPanel({allBlocks,updateBlock,setConfig,setGooglePhotos,localBusiness,setLocalBusiness,googleFetchDone}:{
  allBlocks:OpenStatusBlock[];
  updateBlock:(id:string,partial:Partial<OpenStatusBlock>)=>void;
  setConfig:React.Dispatch<React.SetStateAction<OpenStatusPageConfig>>;
  setGooglePhotos:React.Dispatch<React.SetStateAction<string[]>>;
  localBusiness:Business|null;
  setLocalBusiness:React.Dispatch<React.SetStateAction<Business|null>>;
  googleFetchDone:boolean;
}){
  const orderBlock=allBlocks.find(b=>b.id==='order');
  const bookBlock=allBlocks.find(b=>b.id==='book');
  const [expandedKey,setExpandedKey]=React.useState<string|null>(null);
  return(
    <div className="px-5 py-5 overflow-y-auto h-full">
      {/* Intro */}
      <div className="mb-5 rounded-2xl bg-[#F7F7F5] border border-[#DEDEDC] px-4 py-3">
        <p className="text-[12px] font-bold text-[#0A0A0A] mb-1">Connect your platforms</p>
        <p className="text-[11px] text-[#858585] leading-relaxed">Tap <strong className="text-[#0A0A0A]">Add</strong> next to any platform, paste your link, and hit <strong className="text-[#0A0A0A]">Save</strong>. That&#39;s it — your page updates automatically when you save.</p>
      </div>
      {/* Google Business */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Business Profile</p>
        <IntCard
          cardKey="google-business"
          icon={<svg viewBox="0 0 24 24" width="22" height="22"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
          name="Google Business"
          desc="Paste your Google Maps URL to import"
          placeholder="https://maps.google.com/maps/place/..."
          connected={googleFetchDone||!!(allBlocks.find(b=>b.id==='location')?.googleUrl)}
          url={allBlocks.find(b=>b.id==='location')?.googleUrl}
          expandedKey={expandedKey}
          setExpandedKey={setExpandedKey}
          onSave={async(url)=>{
            updateBlock('location',{googleUrl:url});
            try{
              const r=await fetch(`/api/google/rating?url=${encodeURIComponent(url)}`);
              const d=await r.json();
              if(r.ok&&!d.error){
                updateBlock('location',{reviewStars:d.rating,reviewCount:d.reviewCount,sub:d.address??allBlocks.find(b=>b.id==='location')?.sub??'',...(d.lat!==undefined?{lat:d.lat,lng:d.lng}:{}),...(d.reviews?{reviews:d.reviews}:{}),...(d.photoUrl?{coverPhoto:d.photoUrl}:{})});
                if(d.weeklyHours) setConfig(c=>({...c,weeklyHours:d.weeklyHours}));
                if(d.photos?.length) setGooglePhotos(d.photos);
                if(d.photos?.length&&localBusiness?.id&&!localBusiness.avatar_url){await supabase.from('businesses').update({avatar_url:d.photos[0]}).eq('id',localBusiness.id);setLocalBusiness(b=>b?({...b,avatar_url:d.photos[0]}):b);}
              }
            }catch(e){}
          }}
          onClear={()=>updateBlock('location',{googleUrl:''})}
        />
      </div>

      {/* Online Ordering */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Online Ordering</p>
        {ORDER_PROVIDERS.filter(p=>p.key!=='other').map(provider=>{
          const connected=!!(orderBlock?.on && orderBlock?.provider===provider.key && orderBlock?.url);
          return(
            <IntCard
              key={provider.key}
              cardKey={`order-${provider.key}`}
              icon={<BlockIcon id={provider.key} size={22}/>}
              name={provider.label}
              desc={`Paste your ${provider.label} link`}
              placeholder={`https://www.${provider.key}.com/...`}
              connected={connected}
              url={connected?orderBlock?.url:undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(url)=>updateBlock('order',{on:true,provider:provider.key,url})}
              onClear={()=>updateBlock('order',{on:false,url:'',provider:''})}
            />
          );
        })}
      </div>

      {/* Reservations & Booking */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Reservations &amp; Booking</p>
        {BOOK_PROVIDERS.filter(p=>p.key!=='other').map(provider=>{
          const connected=!!(bookBlock?.on && bookBlock?.provider===provider.key && bookBlock?.url);
          return(
            <IntCard
              key={provider.key}
              cardKey={`book-${provider.key}`}
              icon={<BlockIcon id={provider.key} size={22}/>}
              name={provider.label}
              desc={`Paste your ${provider.label} link`}
              placeholder={`https://www.${provider.key}.com/...`}
              connected={connected}
              url={connected?bookBlock?.url:undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(url)=>updateBlock('book',{on:true,provider:provider.key,url})}
              onClear={()=>updateBlock('book',{on:false,url:'',provider:''})}
            />
          );
        })}
      </div>

      {/* Reviews */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Reviews</p>
        {([
          {key:'yelp',       name:'Yelp',          icon:<IconYelp size={22}/>,        field:'yelpUrl' as const,        ph:'https://www.yelp.com/biz/...'},
          {key:'google-rev', name:'Google Reviews', icon:<IconGoogle size={22}/>,      field:'googleUrl' as const,       ph:'https://maps.google.com/...'},
          {key:'tripadvisor',name:'TripAdvisor',    icon:<IconTripAdvisor size={22}/>, field:'tripAdvisorUrl' as const,  ph:'https://www.tripadvisor.com/...'},
        ] as {key:string;name:string;icon:React.ReactNode;field:'yelpUrl'|'googleUrl'|'tripAdvisorUrl';ph:string}[]).map(r=>{
          const locB=allBlocks.find(b=>b.id==='location');
          const url=locB?.[r.field]??'';
          const connected=!!(url&&url.trim());
          return(
            <IntCard
              key={r.key}
              cardKey={`rev-${r.key}`}
              icon={r.icon}
              name={r.name}
              desc={`Paste your ${r.name} listing URL`}
              placeholder={r.ph}
              connected={connected}
              url={url||undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(v)=>updateBlock('location',{[r.field]:v})}
              onClear={()=>updateBlock('location',{[r.field]:''})}
            />
          );
        })}
      </div>

      {/* QR Code */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">QR Code</p>
        {localBusiness?.slug?(
          <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#0A0A0A] leading-tight">QR Code</p>
                <p className="text-[10px] text-[#ACACAC]">Print or share for easy access</p>
              </div>
            </div>
            <p className="text-[11px] text-[#858585] mb-3">Your unique page link:</p>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F7F7F5] border border-[#DEDEDC] mb-3">
              <span className="text-[11px] text-[#0A0A0A] flex-1 truncate">forothers.us/{localBusiness.slug}</span>
              <button
                onClick={()=>navigator.clipboard.writeText(`https://forothers.us/${localBusiness.slug}`)}
                className="flex-shrink-0 text-[10px] font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">Copy</button>
            </div>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://forothers.us/'+localBusiness.slug)}`}
              download={`${localBusiness.slug}-qr.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2.5 hover:bg-[#292929] transition-colors">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download QR code
            </a>
          </div>
        ):(
          <div className="rounded-2xl border border-[#DEDEDC] bg-[#F7F7F5] p-4 text-center">
            <p className="text-[12px] text-[#858585]">Save your page first to get your QR code.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AnalyticsPanel ────────────────────────────────────────────────────────────
type AnalyticsData={days:number;metrics:{views:number;uniqueVisitors:number;directions:number;menu:number;orders:number;clicks:number};topActions:{id:string;count:number}[];trafficSources:{source:string;count:number}[];trend:{date:string;views:number;clicks:number}[]};
const actionLabel=(id:string)=>({map:'Directions',menu:'Menu',order:'Order',book:'Booking',website:'Website',call:'Call',shop:'Shop','gift-cards':'Gift cards',catering:'Catering',events:'Events',careers:'Careers',email:'Email'} as Record<string,string>)[id]||id.replace(/-/g,' ').replace(/^./,(x:string)=>x.toUpperCase());

function AnalyticsPanel({ businessId }: { businessId: string }) {
  const [days, setDays] = React.useState(30);
  const [data, setData] = React.useState<AnalyticsData|null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!businessId) return;
    void (async () => {
      setLoading(true); setError('');
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setError('Not signed in'); setLoading(false); return; }
      const res = await fetch(`/api/analytics?days=${days}`, { headers: { Authorization: `Bearer ${s.session.access_token}` } });
      const json = await res.json().catch(() => ({ error: 'Could not load analytics' }));
      if (!res.ok) { setError(json.error || 'Could not load analytics'); setData(null); }
      else setData(json);
      setLoading(false);
    })();
  }, [businessId, days]);

  const m = data?.metrics;
  const maxTrend = Math.max(1, ...(data?.trend || []).map((x: {views:number}) => x.views));
  const maxAction = Math.max(1, ...(data?.topActions || []).map((x: {count:number}) => x.count));

  return (
    <div className="px-6 py-6 max-w-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-[#0A0A0A] leading-tight">Analytics</h2>
          <p className="text-[12px] text-[#858585] mt-0.5">How customers interact with your page</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F5F5F3] rounded-full p-0.5">
          {([7,30,90] as const).map(n=>(
            <button key={n} onClick={()=>setDays(n)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${days===n?'bg-white text-[#0A0A0A] shadow-sm':'text-[#858585]'}`}>
              {n}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-[#FFF4E5] border border-[#F5C97A] p-4 mb-4">
          <p className="text-[13px] font-semibold text-[#92400E]">{error}</p>
          {error.includes('not set up') && (
            <p className="text-[12px] text-[#B45309] mt-1">Run the <code className="bg-white/60 px-1 rounded">page_events</code> table migration in Supabase to enable analytics.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i=><div key={i} className="h-16 rounded-2xl bg-[#EEEEEC] animate-pulse"/>)}
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2">
            {([
              ['Unique visitors', m!.uniqueVisitors, '#C8FF62'],
              ['Page views',      m!.views,          '#FFFFFF'],
              ['Directions',      m!.directions,     '#FFFFFF'],
              ['Actions',         m!.clicks,         '#FFFFFF'],
            ] as const).map(([name, value, bg])=>(
              <div key={String(name)} className="rounded-2xl border border-[#EEEEEC] p-4" style={{background: bg}}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#858585]">{name}</p>
                <p className="text-[28px] font-bold text-[#0A0A0A] mt-1 leading-none">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Action rate pill */}
          <div className="rounded-2xl bg-[#0A0A0A] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Action rate</p>
              <p className="text-[22px] font-bold text-white mt-0.5">
                {m!.views ? Math.round(m!.clicks / m!.views * 100) : 0}%
              </p>
            </div>
            <p className="text-[11px] text-white/35 max-w-[140px] text-right leading-snug">of visitors took an action on your page</p>
          </div>

          {/* Trend chart */}
          {data.trend.length > 0 && (
            <div className="rounded-2xl border border-[#EEEEEC] bg-white p-4">
              <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-3">Page views — last {days} days</p>
              <div className="flex items-end gap-0.5 h-24">
                {data.trend.map((x: {date:string;views:number})=>(
                  <div key={x.date} className="group relative flex-1 flex items-end h-full">
                    <div className="w-full rounded-t-[3px] bg-[#0A0A0A] hover:bg-[#444] transition-colors"
                      style={{height:`${Math.max(4, x.views / maxTrend * 100)}%`}}/>
                    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-lg bg-black px-2 py-1 text-[9px] text-white z-10">
                      {x.date.slice(5)}: {x.views}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top actions */}
          {data.topActions.length > 0 && (
            <div className="rounded-2xl border border-[#EEEEEC] bg-white p-4">
              <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-3">Top actions</p>
              <div className="space-y-3">
                {data.topActions.slice(0,5).map((x: {id:string;count:number}, i: number)=>(
                  <div key={x.id}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-semibold text-[#0A0A0A]">{i+1}. {actionLabel(x.id)}</span>
                      <span className="text-[#858585]">{x.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#EEEEEC] overflow-hidden">
                      <div className="h-full rounded-full bg-[#0A0A0A]" style={{width:`${x.count/maxAction*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic sources */}
          {data.trafficSources.length > 0 && (
            <div className="rounded-2xl border border-[#EEEEEC] bg-white p-4">
              <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-3">Traffic sources</p>
              <div className="space-y-2">
                {data.trafficSources.slice(0,5).map((x: {source:string;count:number})=>(
                  <div key={x.source} className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#0A0A0A]">{x.source}</span>
                    <span className="text-[12px] text-[#858585]">{x.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full analytics link */}
          <a href="/analytics" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-[#DEDEDC] text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F3] transition-colors">
            View full analytics ↗
          </a>
        </div>
      ) : !error ? (
        <div className="text-center py-12 text-[13px] text-[#858585]">No data yet. Share your page to start tracking visits.</div>
      ) : null}
    </div>
  );
}

// ── SettingsPanel (top-level component — hooks always called) ─────────────────
function SettingsPanel({localBusiness,setLocalBusiness,config,setConfig,allBlocks,updateBlock}:{
  localBusiness:Business|null;
  setLocalBusiness:React.Dispatch<React.SetStateAction<Business|null>>;
  config:OpenStatusPageConfig;
  setConfig:React.Dispatch<React.SetStateAction<OpenStatusPageConfig>>;
  allBlocks:OpenStatusBlock[];
  updateBlock:(id:string,partial:Partial<OpenStatusBlock>)=>void;
}){
  const BIZ_CATS=['Coffee Shop / Café','Restaurant','Bar','Bakery','Food Truck','Retail / Boutique','Salon / Beauty','Fitness','Spa / Wellness','Services','Events / Entertainment','Non-profit','Pop-up','Market','Other'];
  const [settingsName,setSettingsName]=React.useState(localBusiness?.name??'');
  const [settingsCat,setSettingsCat]=React.useState(localBusiness?.category??'');
  const [settingsDesc,setSettingsDesc]=React.useState(localBusiness?.tagline??'');
  const [settingsLocation,setSettingsLocation]=React.useState(config.location??'');
  const [settingsPhone,setSettingsPhone]=React.useState(allBlocks.find(b=>b.id==='call')?.url?.replace('tel:','')?? '');
  const [settingsWebsite,setSettingsWebsite]=React.useState(allBlocks.find(b=>b.id==='website')?.url??'');
  const [bizSaving,setBizSaving]=React.useState(false);
  const [bizSaved,setBizSaved]=React.useState(false);
  const [bizErr,setBizErr]=React.useState('');
  const [userEmail,setUserEmail]=React.useState('');
  const [newPw,setNewPw]=React.useState('');
  const [pwSaving,setPwSaving]=React.useState(false);
  const [pwMsg,setPwMsg]=React.useState('');
  const [showDeleteConfirm,setShowDeleteConfirm]=React.useState(false);
  const [deleteText,setDeleteText]=React.useState('');

  React.useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUserEmail(data.user?.email??''));
  },[]);

  async function saveBiz(){
    if(!localBusiness?.id)return;
    setBizSaving(true);setBizErr('');
    const{error}=await supabase.from('businesses').update({
      name:settingsName.trim()||localBusiness.name,
      category:settingsCat,
      tagline:settingsDesc.trim(),
    }).eq('id',localBusiness.id);
    if(error){setBizErr(error.message);setBizSaving(false);return;}
    setLocalBusiness(b=>b?({...b,name:settingsName.trim()||b.name,category:settingsCat,tagline:settingsDesc.trim()}):b);
    setConfig(c=>({...c,location:settingsLocation}));
    if(settingsPhone.trim()) updateBlock('call',{url:`tel:${settingsPhone.trim()}`,on:true});
    if(settingsWebsite.trim()) updateBlock('website',{url:settingsWebsite.trim(),on:true});
    setBizSaving(false);setBizSaved(true);setTimeout(()=>setBizSaved(false),2500);
  }

  async function changePw(){
    if(!newPw.trim()||newPw.length<8){setPwMsg('Password must be at least 8 characters.');return;}
    setPwSaving(true);setPwMsg('');
    const{error}=await supabase.auth.updateUser({password:newPw});
    setPwSaving(false);
    if(error){setPwMsg(error.message);}else{setPwMsg('Password updated!');setNewPw('');}
  }

  async function handleLogout(){
    await supabase.auth.signOut();
    window.location.href='/';
  }

  const SettingField=({label,children}:{label:string;children:React.ReactNode})=>(
    <div>
      <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
  const inputCls="w-full bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors";

  return(
    <div className="px-5 py-5 overflow-y-auto h-full space-y-6">

      {/* ── Business Info ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Business Info</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4 space-y-4">
          <SettingField label="Business name">
            <input className={inputCls} value={settingsName} onChange={e=>setSettingsName(e.target.value)} placeholder="Your business name"/>
          </SettingField>
          <SettingField label="Category">
            <select className={inputCls} value={settingsCat} onChange={e=>setSettingsCat(e.target.value)}>
              <option value="">Select a category…</option>
              {BIZ_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </SettingField>
          <SettingField label="Description">
            <textarea className={`${inputCls} resize-none`} rows={3} value={settingsDesc} onChange={e=>setSettingsDesc(e.target.value)} placeholder="A short description of your business…"/>
          </SettingField>
          <SettingField label="Location">
            <input className={inputCls} value={settingsLocation} onChange={e=>setSettingsLocation(e.target.value)} placeholder="123 Main St, Austin TX"/>
          </SettingField>
          <SettingField label="Phone">
            <input className={inputCls} type="tel" value={settingsPhone} onChange={e=>setSettingsPhone(e.target.value)} placeholder="+1 (555) 000-0000"/>
          </SettingField>
          <SettingField label="Website">
            <input className={inputCls} type="url" value={settingsWebsite} onChange={e=>setSettingsWebsite(e.target.value)} placeholder="https://yoursite.com"/>
          </SettingField>
          {bizErr&&<p className="text-[11px] text-red-500">{bizErr}</p>}
          <button onClick={saveBiz} disabled={bizSaving} className="w-full rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2.5 hover:bg-[#292929] transition-colors disabled:opacity-40">
            {bizSaving?'Saving…':bizSaved?'✓ Saved':'Save changes'}
          </button>
        </div>
      </div>

      {/* ── Subscription ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Subscription</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-[#0A0A0A]">Free plan</p>
              <p className="text-[11px] text-[#858585] mt-0.5">Your page is live and free forever.</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">Active</span>
          </div>
        </div>
      </div>

      {/* ── Account ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Account</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4 space-y-4">
          <SettingField label="Email">
            <p className="text-[13px] text-[#6B6B6B] py-1">{userEmail||'—'}</p>
          </SettingField>
          <SettingField label="Change password">
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg('');}} placeholder="New password (8+ chars)"/>
              <button onClick={changePw} disabled={pwSaving||!newPw} className="flex-shrink-0 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold px-4 hover:bg-[#292929] transition-colors disabled:opacity-40">
                {pwSaving?'…':'Save'}
              </button>
            </div>
            {pwMsg&&<p className={`text-[11px] mt-1.5 ${pwMsg.startsWith('Password updated')?'text-emerald-600':'text-red-500'}`}>{pwMsg}</p>}
          </SettingField>
        </div>
      </div>

      {/* ── Support ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Support</p>
        <a href="mailto:info@openstatus.co" className="flex items-center gap-3 rounded-2xl border border-[#DEDEDC] bg-white p-4 hover:border-[#0A0A0A] transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#0A0A0A]">Email support</p>
            <p className="text-[11px] text-[#858585]">info@openstatus.co</p>
          </div>
          <svg className="ml-auto text-[#C0C0C0] group-hover:text-[#0A0A0A] transition-colors" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      {/* ── Log out ── */}
      <div>
        <button onClick={handleLogout} className="w-full rounded-2xl border border-[#DEDEDC] bg-white p-4 text-[13px] font-bold text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors text-left flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          Log out
        </button>
      </div>

      {/* ── Delete account ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Danger zone</p>
        {!showDeleteConfirm?(
          <button onClick={()=>setShowDeleteConfirm(true)} className="w-full rounded-2xl border border-[#FECACA] bg-white p-4 text-[13px] font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors text-left">
            Delete account
          </button>
        ):(
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 space-y-3">
            <p className="text-[12px] font-bold text-red-700">Are you sure? This can&#39;t be undone.</p>
            <p className="text-[11px] text-red-600">Type <strong>DELETE</strong> to confirm.</p>
            <input className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-red-500" value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"/>
            <div className="flex gap-2">
              <button disabled={deleteText!=='DELETE'} onClick={async()=>{
                const{data:s}=await supabase.auth.getSession();
                const token=s.session?.access_token;
                if(!token)return;
                await fetch('/api/account/delete',{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
                await supabase.auth.signOut();
                window.location.href='/';
              }} className="flex-1 rounded-xl bg-red-600 text-white text-[12px] font-bold py-2.5 hover:bg-red-700 transition-colors disabled:opacity-40">Delete my account</button>
              <button onClick={()=>{setShowDeleteConfirm(false);setDeleteText('');}} className="rounded-xl border border-[#DEDEDC] text-[#6B6B6B] text-[12px] font-bold px-4 hover:border-[#0A0A0A] transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="pb-4"/>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────
export default function BuilderClient({ business,initialConfig,isFirstRun=false,onboardedAt=null }: {
  business:Business|null; initialConfig:OpenStatusPageConfig; isFirstRun?:boolean; onboardedAt?:string|null;
}) {
  const [config,setConfig]=useState<OpenStatusPageConfig>(initialConfig??normalizeOpenStatusPageConfig(undefined));
  const [sidebarTab,setSidebarTab]=useState<SidebarTab>('design');
  const [hoursSubTab,setHoursSubTab]=useState<HoursSubTab>('regular');
  const [previewMode,setPreviewMode]=useState<'mobile'|'desktop'>('mobile');
  const [quickAction,setQuickAction]=useState<string|null>(null);
  const [closeEarlyTime,setCloseEarlyTime]=useState('15:00');
  const [quickMsg,setQuickMsg]=useState('');
  const [statusUpdates,setStatusUpdates]=useState<{id:number;kind:string;headline:string;detail:string|null;closes_at:string|null;created_at:string;expires_at:string;status:string}[]>([]);
  const [statusLoading,setStatusLoading]=useState(false);
  const [statusPosting,setStatusPosting]=useState(false);
  const [statusNote,setStatusNote]=useState('');
  const [statusCloseTime,setStatusCloseTime]=useState('15:00');
  const [openId,setOpenId]=useState<string|null>(null);
  const [showPicker,setShowPicker]=useState(false);
  const [showTutorial,setShowTutorial]=useState(()=>{if(onboardedAt)return false;try{return!localStorage.getItem('os_tutorial_done')}catch{return true}});
  const [showFirstRun,setShowFirstRun]=useState(isFirstRun);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [showStoryNudge,setShowStoryNudge]=useState(false);
  const lastSavedHours=useRef<typeof config.weeklyHours>(undefined);
  const [saveError,setSaveError]=useState('');
  const [googleFetchUrl,setGoogleFetchUrl]=useState('');
  const [googleFetching,setGoogleFetching]=useState(false);
  const [googleFetchError,setGoogleFetchError]=useState('');
  const [googleFetchDone,setGoogleFetchDone]=useState(false);
  const [dragId,setDragId]=useState<string|null>(null);
  const [dragOverId,setDragOverId]=useState<string|null>(null);
  const [previewWidth,setPreviewWidth]=useState(500);
  const [localBusiness,setLocalBusiness]=useState<Business|null>(business);
  const [userInitial,setUserInitial]=useState('•');
  React.useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      const u=data.user;
      const name=u?.user_metadata?.full_name||u?.user_metadata?.name||'';
      const initial=name?name.trim()[0].toUpperCase():(u?.email?u.email[0].toUpperCase():'•');
      setUserInitial(initial);
    });
  },[]);
  const [logoUploading,setLogoUploading]=useState(false);
  const [logoUploadError,setLogoUploadError]=useState('');
  const [bgUploading,setBgUploading]=useState(false);
  const [bgUploadError,setBgUploadError]=useState('');
  const [googlePhotos,setGooglePhotos]=useState<string[]>([]);
  const isResizing=useRef(false);
  const resizeStartX=useRef(0);
  const resizeStartW=useRef(0);
  const onResizeStart=useCallback((e:React.MouseEvent)=>{
    isResizing.current=true;
    resizeStartX.current=e.clientX;
    resizeStartW.current=previewWidth;
    const onMove=(ev:MouseEvent)=>{ if(!isResizing.current)return; const delta=resizeStartX.current-ev.clientX; setPreviewWidth(Math.max(320,Math.min(900,resizeStartW.current+delta))); };
    const onUp=()=>{ isResizing.current=false; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
  },[previewWidth]);

  const uploadAsset=useCallback(async(file:File,kind:'avatar'|'header')=>{
    const {data:s}=await supabase.auth.getSession();
    const token=s.session?.access_token;
    if(!token)throw new Error('Session expired. Sign in again.');
    const form=new FormData();
    form.append('kind',kind);
    form.append('file',file);
    const res=await fetch('/api/assets',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error??'Upload failed');
    return data.reference as string;
  },[]);

  const allBlocks = config.blocks;
  const orderedBlocks = [...allBlocks.filter(b=>b.id==='hours'),...allBlocks.filter(b=>b.id!=='hours')];
  const activeBlocks = orderedBlocks.filter(b=>b.on);
  const openBlock = allBlocks.find(b=>b.id===openId)??null;
  const {status:liveStatus,todayLabel}=getLiveStatus(config.weeklyHours);
  const hours = config.weeklyHours??{...DEFAULT_WEEK_HOURS};
  const showEditPanel = !!openBlock && sidebarTab==='design';
  const igHandle = (business as (Business & { instagram_handle?: string })|null)?.instagram_handle??null;

  function updateBlock(id:string,u:Partial<OpenStatusBlock>) {
    setConfig(c=>({...c,blocks:c.blocks.map(b=>b.id===id?{...b,...u}:b)}));
  }
  function enableBlock(id:string) { updateBlock(id,{on:true}); }
  function handleDrop(targetId:string) {
    if(!dragId||dragId===targetId||dragId==='hours'||targetId==='hours'){setDragId(null);setDragOverId(null);return;}
    setConfig(c=>{
      const bs=[...c.blocks];
      const fi=bs.findIndex(b=>b.id===dragId),ti=bs.findIndex(b=>b.id===targetId);
      if(fi<0||ti<0)return c;
      const [moved]=bs.splice(fi,1);bs.splice(ti,0,moved);
      return{...c,blocks:bs};
    });
    setDragId(null);setDragOverId(null);
  }
  function reorderBlocks(fromId:string,toId:string) {
    if(!fromId||fromId===toId||fromId==='hours'||toId==='hours')return;
    setConfig(c=>{
      const bs=[...c.blocks];
      const fi=bs.findIndex(b=>b.id===fromId),ti=bs.findIndex(b=>b.id===toId);
      if(fi<0||ti<0)return c;
      const [moved]=bs.splice(fi,1);bs.splice(ti,0,moved);
      return{...c,blocks:bs};
    });
  }
  function copyMonToWeekdays() {
    const mon=hours.mon;
    setConfig(c=>({...c,weeklyHours:{...hours,tue:mon,wed:mon,thu:mon,fri:mon}}));
  }
  async function save() {
    setSaving(true);setSaveError('');
    const {error}=await supabase.auth.updateUser({data:{openstatus_page:config}});
    if(error){setSaving(false);setSaveError(error.message);return;}
    // Sync weekly hours to business_hours table so the published page shows them
    if(localBusiness?.id && config.weeklyHours) {
      const DAY_MAP: Record<string,number> = {mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6};
      const hoursRows = Object.entries(config.weeklyHours).map(([dayKey,day]) => ({
        business_id: localBusiness.id,
        day_of_week: DAY_MAP[dayKey],
        opens_at:  day.closed ? null : (day.open  || '09:00'),
        closes_at: day.closed ? null : (day.close || '17:00'),
        is_closed: !!day.closed,
      }));
      await supabase.from('business_hours').upsert(hoursRows, { onConflict: 'business_id,day_of_week' });
    }
    setSaving(false);
    // Detect if hours changed → nudge to post on story
    const hoursChanged = localBusiness?.id && config.weeklyHours &&
      JSON.stringify(config.weeklyHours) !== JSON.stringify(lastSavedHours.current);
    lastSavedHours.current = config.weeklyHours;
    setSaved(true);setTimeout(()=>setSaved(false),2500);
    if(hoursChanged){ setShowStoryNudge(true); setTimeout(()=>setShowStoryNudge(false),12000); }
  }

  // Hours table row
  function HoursRow({dayKey,label,idx}:{dayKey:WeekDay;label:string;idx:number}) {
    const day=hours[dayKey];
    return (
      <div className={`flex items-center gap-4 px-5 ${idx<DAYS.length-1?'border-b border-[#F5F5F5]':''}`} style={{height:64}}>
        <span className="text-[13px] font-semibold text-[#0A0A0A] w-28 flex-shrink-0">{label}</span>
        <button
          onClick={()=>setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[dayKey]:{...day,closed:!day.closed}}}))}
          className={`text-[11px] px-3 py-1.5 rounded-full border font-bold flex-shrink-0 transition-all ${day.closed?'border-[#DEDEDC] text-[#858585] bg-white hover:border-[#D0D0D0]':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
        >
          {day.closed?'Closed':'● Open'}
        </button>
        {!day.closed&&(
          <div className="flex items-center gap-2 flex-1">
            <TimeSelectInline value={day.open} onChange={v=>setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[dayKey]:{...day,open:v}}}))}/>
            <span className="text-[#C0C0C0] text-sm font-light">–</span>
            <TimeSelectInline value={day.close} onChange={v=>setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[dayKey]:{...day,close:v}}}))}/>
          </div>
        )}
        {day.closed&&<span className="text-[12px] text-[#C0C0C0] italic">Closed all day</span>}
      </div>
    );
  }

  const SIDEBAR_NAV: { key:SidebarTab; label:string; icon:React.ReactNode }[] = [
    { key:'design',       label:'Design',        icon:<IconPalette size={15}/> },
    { key:'links',        label:'Links',         icon:<IconLink size={15}/> },
    { key:'hours',        label:'Hours & Status',icon:<LucideClock size={15}/> },
    { key:'integrations', label:'Integrations',  icon:<IconPuzzle size={15}/> },
    { key:'analytics',    label:'Analytics',     icon:<IconBarChart size={15}/> },
    { key:'settings',     label:'Settings',      icon:<IconSettings size={15}/> },
  ];

  const sidebarLabel = SIDEBAR_NAV.find(n=>n.key===sidebarTab)?.label ?? '';

  // Close early times
  const loadStatusUpdates=async()=>{
    setStatusLoading(true);
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s?.session?.access_token;
      if(!token){setStatusLoading(false);return;}
      const r=await fetch('/api/status',{headers:{Authorization:`Bearer ${token}`}});
      const d=await r.json();
      setStatusUpdates(d.updates??[]);
    }catch{}
    setStatusLoading(false);
  };
  const clearStatus=async()=>{
    setStatusPosting(true);
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s?.session?.access_token;
      if(!token){setStatusPosting(false);return;}
      await fetch('/api/status',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'clear'})});
      await loadStatusUpdates();
    }catch{}
    setStatusPosting(false);
  };
  const postStatus=async(preset:string)=>{
    setStatusPosting(true);
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s?.session?.access_token;
      if(!token){setStatusPosting(false);return;}
      const body:Record<string,string>={action:'publish',preset};
      if(preset==='early_close') body.closesAt=statusCloseTime;
      if(preset==='note_today') body.note=statusNote;
      await fetch('/api/status',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      await loadStatusUpdates();
      setStatusNote('');
    }catch{}
    setStatusPosting(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(sidebarTab==='hours'&&hoursSubTab==='status') loadStatusUpdates(); },[sidebarTab,hoursSubTab]);

  const closeEarlyTimes: string[] = [];
  for(let h=7;h<22;h++) for(const m of [0,30]) closeEarlyTimes.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{fontFamily:"'Inter',system-ui,sans-serif",backgroundImage:"radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)",backgroundSize:"20px 20px",backgroundColor:"#EDECE9"}}>

      {/* ── FIRST-RUN BANNER ── */}
      {showFirstRun&&(
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:60,background:'#0A0A0A',color:'#F7F7F5',padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.45)'}}>YOUR PAGE IS READY TO BUILD</span>
            <p style={{fontSize:13,marginTop:2,color:'rgba(255,255,255,0.75)'}}>Add your logo, cover photo, and links. You can change anything below.</p>
          </div>
          <button onClick={()=>setShowFirstRun(false)} style={{background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Got it</button>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <header className="h-14 flex items-center justify-between px-5 flex-shrink-0" style={{background:'rgba(237,236,233,0.90)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
        <span className="font-bold text-[17px] tracking-[-0.04em] text-[#0A0A0A]">OpenStatus</span>
        <div className="flex items-center gap-2">
          {business?.slug&&(
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-[12px] font-semibold text-[#6B6B6B] hover:text-[#111] transition-colors mr-1">
              Open ↗
            </a>
          )}
          <div className="flex flex-col items-end gap-0.5">
            <button onClick={save} disabled={saving} data-tut="tut-save"
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${saved?'bg-[#DCFCE7] text-[#166534]':saving?'bg-[#EEEEEC] text-[#858585]':saveError?'bg-red-100 text-red-600':'bg-[#0A0A0A] text-white hover:bg-[#292929]'}`}>
              {saving?'Saving…':saved?'✓ Saved':saveError?'Error':'Publish'}
            </button>
            {saveError&&<p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">{saveError}</p>}
          </div>
          {/* Settings gear — opens settings drawer */}
          <button onClick={()=>setSidebarTab(t=>(['settings','analytics','integrations','links'].includes(t)?'design':'settings'))}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{background:'rgba(0,0,0,0.08)'}}
            title="Settings">
            <IconSettings size={15} color="#555"/>
          </button>
        </div>
      </header>

      {/* ── CANVAS (phone always centered) ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Preview mode toggle */}
        <div className="flex-shrink-0 flex items-center justify-center pt-3 pb-1">
          <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{background:'rgba(0,0,0,0.14)'}}>
            <button onClick={()=>setPreviewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${previewMode==='mobile'?'bg-white text-[#111] shadow-sm':'text-white/75 hover:text-white'}`}>
              <IconSmartphone size={11}/> Mobile
            </button>
            <button onClick={()=>setPreviewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${previewMode==='desktop'?'bg-white text-[#111] shadow-sm':'text-white/75 hover:text-white'}`}>
              <IconMonitor size={11}/> Desktop
            </button>
          </div>
        </div>

        {/* Phone / Desktop preview */}
        <div data-tut="tut-preview" className="flex-1 overflow-y-auto flex items-start justify-center py-4 px-4">
          {previewMode==='desktop'?(
            <div className="w-full h-full flex flex-col max-w-4xl mx-auto">
              <div className="flex-shrink-0 bg-[#F0F0F0] border-b border-[#DEDEDE] px-3 py-2 flex items-center gap-2 rounded-t-xl">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]"/>
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"/>
                  <div className="w-3 h-3 rounded-full bg-[#28CA41]"/>
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-[#888] font-medium border border-[#DEDEDE] truncate">
                  openstatus.co/{business?.slug||'your-page'}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-white rounded-b-xl">
                <LiveDesktopPreview business={localBusiness} config={config}/>
              </div>
            </div>
          ):(
            <LivePhonePreview
              business={localBusiness} config={config}
              selectedId={openId}
              onSelectBlock={id=>{setOpenId(id);}}
              onReorder={reorderBlocks}
            />
          )}
        </div>
      </main>

      {/* ── BOTTOM TOOLBAR ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3" style={{paddingBottom:'calc(12px + env(safe-area-inset-bottom))',background:'rgba(237,236,233,0.90)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
        <button onClick={()=>setShowPicker(true)} data-tut="tut-add"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-colors shadow-sm"
          style={{background:'#0A0A0A',color:'white'}}>
          <span className="text-[17px] leading-none" style={{marginTop:-1}}>+</span> Elements
        </button>
        <button onClick={()=>setSidebarTab(t=>t==='hours'?'design':'hours')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-colors shadow-sm ${sidebarTab==='hours'?'bg-[#0A0A0A] text-white':'bg-white text-[#0A0A0A] hover:bg-[#F0F0F0]'}`}>
          <LucideClock size={14}/> Hours
        </button>
        <button onClick={()=>setSidebarTab(t=>t==="status"?"design":"status" as SidebarTab)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-colors shadow-sm ${sidebarTab==='status'?'bg-[#0A0A0A] text-white':'bg-white text-[#0A0A0A] hover:bg-[#F0F0F0]'}`}>
          <IconBolt size={14}/> Status
        </button>
      </div>

      {/* ── HOURS SHEET ── */}
      {sidebarTab==='hours'&&(
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>setSidebarTab('design')}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.28)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)'}}/>
          <div className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl" style={{maxHeight:'85vh'}} onClick={e=>e.stopPropagation()}>
            {/* Handle */}
            <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
              <div className="w-10 h-1.5 rounded-full" style={{background:'rgba(0,0,0,0.15)'}}/>
            </div>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 pb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{color:'rgba(0,0,0,0.35)'}}>
                  {liveStatus==='open'?'Open now · '+todayLabel:'Closed · '+todayLabel}
                </p>
                <h2 className="text-[18px] font-bold text-[#0A0A0A] leading-tight mt-0.5">Hours & Status</h2>
              </div>
              <button onClick={()=>setSidebarTab('design')} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{background:'rgba(0,0,0,0.06)'}}>
                <LucideX size={14} color="#555"/>
              </button>
            </div>
            {/* Sub-tabs */}
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex items-center gap-1 bg-black/5 rounded-full p-1 w-fit">
                {([{key:'regular' as HoursSubTab,label:'Regular'},{key:'special' as HoursSubTab,label:'Special'},{key:'status' as HoursSubTab,label:'Status'}]).map(t=>(
                  <button key={t.key} onClick={e=>{e.stopPropagation();setHoursSubTab(t.key);if(t.key==='status')loadStatusUpdates();}}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${hoursSubTab===t.key?'bg-[#0A0A0A] text-white':'text-[#555] hover:bg-black/5'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-8">
                  <div className={`inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-[11px] font-bold ${liveStatus==='open'?'bg-[#F0FDF4] text-[#166534]':'bg-[#EEEEEC] text-[#858585]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${liveStatus==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                    {liveStatus==='open'?'Open now · '+todayLabel:'Closed · '+todayLabel}
                  </div>
                  <h1 className="text-[26px] font-bold text-[#0A0A0A] leading-tight tracking-[-0.04em]">
                    Stay up to date, in real time.
                  </h1>
                  <p className="text-[#858585] text-[14px] mt-2 leading-relaxed">
                    Set your hours once — customers always see the right status.
                  </p>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 mb-8 bg-black/5 rounded-full p-1 w-fit">
                  {([
                    {key:'regular',label:'Regular Hours'},
                    {key:'special',label:'Special Hours'},
                    {key:'status', label:'Status Controls'},
                    {key:'auto',   label:'Auto-Updates'},
                  ] as const).map(({key,label})=>(
                    <button key={key} onClick={()=>setHoursSubTab(key)}
                      className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${hoursSubTab===key?'bg-white text-[#111] shadow-sm':'text-[#858585] hover:text-[#111]'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── REGULAR HOURS ── */}
                {hoursSubTab==='regular'&&(
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[14px] font-bold text-[#0A0A0A]">Weekly hours</p>
                        <button onClick={copyMonToWeekdays} className="text-[12px] text-[#858585] hover:text-[#111] font-medium transition-colors">
                          Copy Mon → weekdays
                        </button>
                      </div>
                      <div className="rounded-2xl border border-[#DEDEDC] overflow-hidden bg-white">
                        {DAYS.map(({key,label},i)=><HoursRow key={key} dayKey={key} label={label} idx={i}/>)}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div>
                      <p className="text-[14px] font-bold text-[#0A0A0A] mb-4">Quick Actions</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {key:'close-early', label:'Close Early',       desc:'Close before your regular time today'},
                          {key:'close-today', label:'Close Today',       desc:'Mark as fully closed for the day'},
                          {key:'special-hours', label:'Add Special Hours', desc:'Holiday, event, or seasonal hours'},
                          {key:'out-of-office', label:'Out of Office',     desc:'Set away dates and a message'},
                        ].map(({key,label,desc})=>(
                          <button key={key} onClick={()=>{setQuickAction(key);setQuickMsg('');setCloseEarlyTime('15:00');}}
                            className="flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-[#DEDEDC] bg-white hover:border-[#0A0A0A] hover:bg-[#EEEEEC] transition-all text-left group">
                                            <div>
                              <p className="text-[13px] font-bold text-[#111]">{label}</p>
                              <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">{desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STATUS CONTROLS ── */}
                {hoursSubTab==='status'&&(
                  <div className="space-y-8">
                    {/* Active status banner */}
                    <div>
                      <p className="text-[14px] font-bold text-[#0A0A0A] mb-3">Live status</p>
                      {statusLoading?(
                        <div className="rounded-2xl border border-[#DEDEDC] bg-white px-4 py-3">
                          <p className="text-[13px] text-[#858585]">Loading…</p>
                        </div>
                      ):statusUpdates.filter(u=>u.status!=='needs_review').length>0?(
                        <div>
                          {statusUpdates.filter(u=>u.status!=='needs_review').map(u=>(
                            <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#DEDEDC] bg-white px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
                                <div>
                                  <p className="text-[14px] font-bold text-[#111]">{u.headline}</p>
                                  {u.detail&&<p className="text-[12px] text-[#858585] mt-0.5">{u.detail}</p>}
                                </div>
                              </div>
                              <button
                                onClick={clearStatus}
                                disabled={statusPosting}
                                className="flex-shrink-0 text-[12px] font-semibold text-[#EF4444] hover:text-red-700 transition-colors disabled:opacity-40"
                              >
                                Clear
                              </button>
                            </div>
                          ))}
                        </div>
                      ):(
                        <div className="rounded-2xl border border-dashed border-[#DEDEDC] bg-[#F7F7F5] px-4 py-3 text-center">
                          <p className="text-[13px] text-[#858585]">No live status — your regular hours show on your page.</p>
                        </div>
                      )}
                    </div>

                    {/* Quick post presets */}
                    <div>
                      <p className="text-[14px] font-bold text-[#0A0A0A] mb-4">Post a status update</p>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {/* Closed today */}
                        <button
                          onClick={()=>postStatus('closed_today')}
                          disabled={statusPosting}
                          className="flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-[#DEDEDC] bg-white hover:border-[#EF4444] hover:bg-red-50/60 transition-all text-left group disabled:opacity-40"
                        >
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F0EE]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                          <div>
                            <p className="text-[13px] font-bold text-[#111]">Closed today</p>
                            <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">Mark as fully closed all day</p>
                          </div>
                        </button>
                        {/* Close early */}
                        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F0EE]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                          <p className="text-[13px] font-bold text-[#111]">Close early at</p>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <select
                                value={statusCloseTime}
                                onChange={e=>setStatusCloseTime(e.target.value)}
                                className="w-full bg-[#EEEEEC] border border-[#DEDEDC] rounded-xl px-3 py-2 text-[12px] font-semibold text-[#111] focus:outline-none appearance-none cursor-pointer"
                              >
                                {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                              </select>
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevronDown size={11} color="#858585"/></div>
                            </div>
                            <button
                              onClick={()=>postStatus('early_close')}
                              disabled={statusPosting}
                              className="px-3 py-2 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold hover:bg-[#292929] transition-colors disabled:opacity-40"
                            >
                              Set
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Custom note */}
                      <div className="p-4 rounded-2xl border border-[#DEDEDC] bg-white space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F0F0EE]"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
                          <p className="text-[13px] font-bold text-[#111]">Leave a note</p>
                        </div>
                        <textarea
                          value={statusNote}
                          onChange={e=>setStatusNote(e.target.value.slice(0,100))}
                          placeholder="e.g. Running about 20 minutes behind today…"
                          rows={2}
                          className="w-full bg-[#EEEEEC] border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] resize-none transition-colors"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#C0C0C0]">{statusNote.length}/100</span>
                          <button
                            onClick={()=>postStatus('note_today')}
                            disabled={statusPosting||!statusNote.trim()}
                            className="px-4 py-2 rounded-full bg-[#0A0A0A] text-white text-[12px] font-bold hover:bg-[#292929] transition-colors disabled:opacity-40"
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── SPECIAL HOURS & AUTO — placeholders ── */}
                {(hoursSubTab==='special'||hoursSubTab==='auto')&&(
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[#EEEEEC] flex items-center justify-center mb-4">
                      <LucideClock size={20} color="#C0C0C0"/>
                    </div>
                    <p className="text-[15px] font-bold text-[#0A0A0A] mb-1">
                      {hoursSubTab==='special'?'Special Hours':'Auto-Updates'}
                    </p>
                    <p className="text-[13px] text-[#858585]">Coming soon — stay tuned!</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ── STATUS QUICK SHEET (reuses quick action flyout via Status button) ── */}
      {sidebarTab===('status' as SidebarTab)&&(
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>setSidebarTab('design')}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.28)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)'}}/>
          <div className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl pb-8" style={{maxHeight:'70vh'}} onClick={e=>e.stopPropagation()}>
            <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
              <div className="w-10 h-1.5 rounded-full" style={{background:'rgba(0,0,0,0.15)'}}/>
            </div>
            <div className="flex-shrink-0 flex items-center justify-between px-5 pb-4">
              <h2 className="text-[18px] font-bold text-[#0A0A0A]">Live Status</h2>
              <button onClick={()=>setSidebarTab('design')} className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(0,0,0,0.06)'}}>
                <LucideX size={14} color="#555"/>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 space-y-3">
              {/* Active status banner */}
              {statusUpdates.filter(u=>u.status==='active').map(u=>(
                <div key={u.id} className="rounded-2xl p-4 flex items-start gap-3" style={{background:'rgba(245,243,240,1)',border:'1px solid rgba(0,0,0,0.07)'}}>
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#0A0A0A] leading-snug">{u.headline}</p>
                    {u.detail&&<p className="text-[12px] text-[#6B6B6B] mt-0.5">{u.detail}</p>}
                  </div>
                  <button onClick={async e=>{e.stopPropagation();await clearStatus();}} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors flex-shrink-0">Clear</button>
                </div>
              ))}
              {/* Quick presets */}
              {[
                {preset:'close-early',label:'Close Early',icon:'🔒',desc:'Set early closing time'},
                {preset:'close-today',label:'Close Today',icon:'🚫',desc:'Mark as closed all day'},
                {preset:'out-of-office',label:'Out of Office',icon:'✈️',desc:'Away for a while'},
                {preset:'note_today',label:'Today's Note',icon:'📝',desc:'Share a quick update'},
              ].map(({preset,label,icon,desc})=>(
                <button key={preset} onClick={e=>{e.stopPropagation();setSidebarTab('design');setQuickAction(preset.replace('close-early','close-early').replace('close-today','close-today').replace('out-of-office','out-of-office'));}}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-colors hover:bg-black/3"
                  style={{background:'rgba(245,243,240,1)',border:'1px solid rgba(0,0,0,0.07)'}}>
                  <span className="text-[20px]">{icon}</span>
                  <div>
                    <p className="text-[13px] font-bold text-[#0A0A0A]">{label}</p>
                    <p className="text-[11px] text-[#858585]">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS DRAWER ── */}
      {['settings','analytics','integrations','links'].includes(sidebarTab)&&(
        <div className="fixed inset-0 z-50 flex justify-end" onClick={()=>setSidebarTab('design')}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.20)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)'}}/>
          <div className="relative flex flex-col bg-white shadow-2xl border-l border-[#DEDEDC]"
            style={{width:'100%',maxWidth:420,height:'100%'}} onClick={e=>e.stopPropagation()}>
            {/* Drawer header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 h-14 border-b border-[#DEDEDC]">
              <div className="flex items-center gap-1 bg-black/5 rounded-full p-0.5 overflow-x-auto">
                {([
                  {k:'analytics' as SidebarTab, l:'Analytics'},
                  {k:'integrations' as SidebarTab, l:'Integrations'},
                  {k:'settings' as SidebarTab, l:'Settings'},
                  {k:'links' as SidebarTab, l:'Links'},
                ]).map(t=>(
                  <button key={t.k} onClick={e=>{e.stopPropagation();setSidebarTab(t.k);}}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${sidebarTab===t.k?'bg-white text-[#111] shadow-sm':'text-[#858585] hover:text-[#111]'}`}>
                    {t.l}
                  </button>
                ))}
              </div>
              <button onClick={()=>setSidebarTab('design')} className="w-7 h-7 rounded-full flex items-center justify-center ml-2 flex-shrink-0 transition-colors" style={{background:'rgba(0,0,0,0.06)'}}>
                <LucideX size={13} color="#555"/>
              </button>
            </div>
            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarTab==='analytics'&&<AnalyticsPanel businessId={localBusiness?.id??''}/>}
              {sidebarTab==='integrations'&&<IntegrationsPanel allBlocks={allBlocks} updateBlock={updateBlock} setConfig={setConfig} setGooglePhotos={setGooglePhotos} localBusiness={localBusiness} setLocalBusiness={setLocalBusiness} googleFetchDone={googleFetchDone}/>}
              {sidebarTab==='settings'&&<SettingsPanel localBusiness={localBusiness} setLocalBusiness={setLocalBusiness} config={config} setConfig={setConfig} allBlocks={allBlocks} updateBlock={updateBlock}/>}
              {sidebarTab==='links'&&(
                <div className="px-5 py-6">
                  <div className="rounded-2xl border border-[#DEDEDC] p-5">
                    <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-3">Your public link</p>
                    {business?.slug?(
                      <div className="flex items-center gap-3">
                        <code className="text-[13px] font-semibold text-[#111] bg-[#EEEEEC] px-3 py-2 rounded-xl flex-1 truncate">
                          openstatus.co/{business.slug}
                        </code>
                        <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-full bg-[#0A0A0A] text-white text-[12px] font-bold hover:bg-[#292929] transition-colors whitespace-nowrap">
                          Open ↗
                        </a>
                      </div>
                    ):(
                      <p className="text-[13px] text-[#858585]">No link set yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BLOCK EDIT SHEET ── */}
      {openId&&openBlock&&(
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={()=>setOpenId(null)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.28)',backdropFilter:'blur(3px)',WebkitBackdropFilter:'blur(3px)'}}/>
          <div className="relative bg-white rounded-t-3xl flex flex-col shadow-2xl" style={{maxHeight:'88vh'}} onClick={e=>e.stopPropagation()}>
            <div className="flex-shrink-0 pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full" style={{background:'rgba(0,0,0,0.15)'}}/>
            </div>
            <div className="overflow-y-auto flex-1">
              <BlockEditPanel
                block={openBlock} config={config}
                onUpdateBlock={u=>updateBlock(openBlock.id,u)}
                onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
                onClose={()=>setOpenId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTION FLYOUT ── */}
      {quickAction&&(
        <div className="fixed inset-0 z-50 flex" onClick={()=>setQuickAction(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"/>
          <div className="relative ml-auto w-[320px] h-full bg-white shadow-2xl flex flex-col border-l border-[#DEDEDC]" onClick={e=>e.stopPropagation()}>
            {/* Flyout header */}
            <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between flex-shrink-0">
              <p className="text-[15px] font-bold text-[#111]">
                {quickAction==='close-early'?'Close Early'
                :quickAction==='close-today'?'Close Today'
                :quickAction==='special-hours'?'Special Hours'
                :'Out of Office'}
              </p>
              <button onClick={()=>setQuickAction(null)} className="w-7 h-7 rounded-full bg-[#EEEEEC] flex items-center justify-center hover:bg-[#DEDEDC] transition-colors">
                <LucideX size={13} color="#6B6B6B"/>
              </button>
            </div>
            {/* Flyout body */}
            <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
              {quickAction==='close-early'&&(
                <>
                  <div>
                    <p className="text-[12px] font-semibold text-[#6B6B6B] mb-2">Close at</p>
                    <div className="relative">
                      <select value={closeEarlyTime} onChange={e=>setCloseEarlyTime(e.target.value)}
                        className="w-full bg-[#EEEEEC] border border-[#DEDEDC] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#111] focus:outline-none focus:border-[#0A0A0A] appearance-none cursor-pointer">
                        {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevronDown size={14} color="#858585"/></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-[#6B6B6B] mb-2">Optional message <span className="font-normal text-[#C0C0C0]">(shows on your page)</span></p>
                    <textarea value={quickMsg} onChange={e=>setQuickMsg(e.target.value.slice(0,100))}
                      placeholder="e.g. Closing early for a private event…"
                      rows={3}
                      className="w-full bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] resize-none transition-colors"/>
                    <p className="text-right text-[10px] text-[#C0C0C0] mt-1">{quickMsg.length}/100</p>
                  </div>
                </>
              )}
              {quickAction==='close-today'&&(
                <div className="rounded-xl bg-[#FFF7ED] border border-[#FED7AA] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#92400E]">This will mark you as closed for the entire day, overriding your regular hours.</p>
                </div>
              )}
              {(quickAction==='special-hours'||quickAction==='out-of-office')&&(
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-[13px] text-[#858585]">Coming soon!</p>
                </div>
              )}
            </div>
            {/* Flyout footer */}
            <div className="px-5 py-4 border-t border-[#F0F0F0] flex gap-3 flex-shrink-0">
              <button onClick={()=>setQuickAction(null)}
                className="flex-1 py-2.5 rounded-full border border-[#DEDEDC] text-[13px] font-semibold text-[#6B6B6B] hover:border-[#111] transition-colors">
                Cancel
              </button>
              <button
                onClick={()=>{
                  if(quickAction==='close-early'){
                    const todayKey=(['sun','mon','tue','wed','thu','fri','sat'] as WeekDay[])[new Date().getDay()];
                    setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[todayKey]:{...hours[todayKey],close:closeEarlyTime}}}));
                  } else if(quickAction==='close-today'){
                    const todayKey=(['sun','mon','tue','wed','thu','fri','sat'] as WeekDay[])[new Date().getDay()];
                    setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[todayKey]:{...hours[todayKey],closed:true}}}));
                  }
                  setQuickAction(null);
                }}
                className="flex-1 py-2.5 rounded-full bg-[#0A0A0A] text-white text-[13px] font-bold hover:bg-[#292929] transition-colors">
                Update Hours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STORY NUDGE ── */}
      {showStoryNudge&&(
        <div
          className="fixed z-[70] flex flex-col"
          style={{bottom:'calc(80px + env(safe-area-inset-bottom))',left:'50%',transform:'translateX(-50%)',width:'calc(100% - 32px)',maxWidth:360,animation:'slideUp 0.3s ease-out'}}
        >
          <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',padding:2}}>
            <div className="rounded-[14px] bg-white px-4 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[14px] font-bold text-[#0A0A0A] leading-snug">Let your followers know 📣</p>
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5 leading-snug">Your hours just updated — post it on your story so customers are in the loop.</p>
                </div>
                <button onClick={()=>setShowStoryNudge(false)} className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 hover:bg-black/5 transition-colors">
                  <LucideX size={12} color="#999"/>
                </button>
              </div>
              <div className="flex items-center gap-2">
                {business?.slug&&(
                  <button
                    onClick={()=>{
                      const url=`https://openstatus.co/${business.slug}`;
                      const text=`Our hours have been updated! Check out our latest schedule at ${url}`;
                      if(navigator.share){navigator.share({title:'Our hours updated',text,url}).catch(()=>{});}
                      else{window.open(`https://www.instagram.com/`,'_blank');}
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-opacity hover:opacity-90"
                    style={{background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Share to Story
                  </button>
                )}
                <button
                  onClick={()=>{
                    if(business?.slug) navigator.clipboard?.writeText(`https://openstatus.co/${business.slug}`).catch(()=>{});
                    setShowStoryNudge(false);
                  }}
                  className="px-3 py-2.5 rounded-xl text-[12px] font-semibold text-[#6B6B6B] hover:bg-black/5 transition-colors border border-[#DEDEDC]">
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial overlay */}
      {showTutorial&&!showPicker&&(
        <TutorialOverlay onDone={()=>{setShowTutorial(false);try{localStorage.setItem('os_tutorial_done','1')}catch{} if(business?.id){supabase.from('businesses').update({onboarded_at:new Date().toISOString()}).eq('id',business.id).then(()=>{});}}}/>
      )}

      {/* Block picker overlay */}
      {showPicker&&(
        <BlockPicker
          blocks={allBlocks}
          onAdd={id=>enableBlock(id)}
          onClose={()=>setShowPicker(false)}
        />
      )}

    </div>
  );
}
