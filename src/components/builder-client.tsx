'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  font?: string;
}
interface Business {
  id: string; name: string; slug: string;
  avatar_url?: string; tagline?: string; category?: string;
}

// ── constants ──────────────────────────────────────────────────────────────────
const BG_PRESETS = [
  '#ffffff','#1B5E20','#388E3C','#A5D6A7','#FFAB40',
  '#0a0a0a','#FF7043','#f8f5f0','#fafafa','#1c1c1c',
];
const FONT_OPTIONS: { label:string; family:string; google?:string }[] = [
  { label:'Default',          family:'Inter, system-ui, sans-serif' },
  { label:'Playfair',         family:'"Playfair Display", Georgia, serif',      google:'Playfair+Display:wght@700;800' },
  { label:'Poppins',          family:'"Poppins", system-ui, sans-serif',        google:'Poppins:wght@700;800' },
  { label:'DM Serif',         family:'"DM Serif Display", Georgia, serif',      google:'DM+Serif+Display' },
  { label:'Space Grotesk',    family:'"Space Grotesk", system-ui, sans-serif',  google:'Space+Grotesk:wght@600;700' },
  { label:'Bebas',            family:'"Bebas Neue", Impact, sans-serif',        google:'Bebas+Neue' },
  { label:'Cormorant',        family:'"Cormorant Garamond", Georgia, serif',    google:'Cormorant+Garamond:wght@600;700' },
  { label:'Pacifico',         family:'"Pacifico", cursive',                     google:'Pacifico' },
  { label:'Oswald',           family:'"Oswald", Impact, sans-serif',            google:'Oswald:wght@600;700' },
  { label:'Lobster',          family:'"Lobster", cursive',                      google:'Lobster' },
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
  socials:  [{ key:'icons',   label:'Icons'   }, { key:'list',   label:'List'    }],
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
  { id:'socials', title:'Follow us',             sub:'Social media links',         icon:'share',  on:false,tone:'default',color:'#db2777',size:'full' },
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
    font:         typeof r.font==='string'?r.font:undefined,
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
function LivePhonePreview({ business,config,selectedId,onSelectBlock }: { business:Business|null; config:OpenStatusPageConfig; selectedId?:string|null; onSelectBlock?:(id:string)=>void }) {
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
          <p className={`font-bold text-[13px] ${tx}`} style={{fontFamily:config.font??'Inter, system-ui, sans-serif'}}>{business?.name??'Your Business'}</p>
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
                  <div key={b.id} className={`${isHalf?'col-span-1':'col-span-2'} ${onSelectBlock?'cursor-pointer':''}`}
                    onClick={()=>onSelectBlock?.(b.id)}
                    style={isSelected?{ outline:'2px solid #0A0A0A', borderRadius:16, outlineOffset:2 }:{}}
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
  const sortedBlocks = [
    ...activeBlocks.filter(b => b.id === 'hours'),
    ...activeBlocks.filter(b => b.id !== 'hours'),
  ];
  const locBlock = config.blocks.find(b => b.id === 'location');
  const reviewPct = locBlock?.reviewStars && locBlock.reviewStars > 0 ? starsToPercent(locBlock.reviewStars) : null;
  const coverPhoto = config.bgImage || business?.avatar_url;
  const themeColor = '#DB6B8F';
  const initials = (business?.name ?? 'B').split(/\s+/).filter(Boolean).slice(0,2).map((p:string)=>p[0]).join('').toUpperCase();

  // hex to rgb helper for fade gradient
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r:parseInt(result[1],16), g:parseInt(result[2],16), b:parseInt(result[3],16) } : { r:247,g:247,b:245 };
  }
  const { r,g,b: bv } = hexToRgb(bg);
  const fadeGradient = `linear-gradient(to bottom, rgba(${r},${g},${bv},0) 0%, rgba(${r},${g},${bv},0.35) 48%, ${bg} 100%)`;

  const glass: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.82)'}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '14px 16px',
  };

  const tx = isDark ? '#fff' : '#151515';
  const sx = isDark ? 'rgba(255,255,255,0.5)' : '#8A8A86';

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>

        {/* Cover photo */}
        {coverPhoto ? (
          <div style={{ position:'relative', height:200, overflow:'hidden' }}>
            <img src={coverPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 60%', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:fadeGradient }}/>
          </div>
        ) : (
          <div style={{ height:60, background:'rgba(0,0,0,0.04)' }}/>
        )}

        {/* Logo */}
        <div style={{ display:'flex', justifyContent:'center', marginTop: coverPhoto ? -40 : 0, position:'relative', zIndex:10 }}>
          {business?.avatar_url && !business.avatar_url.startsWith('storage:') ? (
            <img src={business.avatar_url} alt="" style={{ width:80, height:80, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.90)', background:'rgba(255,255,255,0.80)', objectFit:'cover', boxShadow:'0 8px 32px rgba(0,0,0,0.10)', display:'block' }}/>
          ) : (
            <div style={{ width:80, height:80, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.90)', background:'rgba(255,255,255,0.80)', display:'grid', placeItems:'center', fontSize:24, fontWeight:800, color:themeColor, boxShadow:'0 8px 32px rgba(0,0,0,0.10)' }}>
              {initials}
            </div>
          )}
        </div>

        {/* Business name */}
        <div style={{ textAlign:'center', padding:'8px 20px 4px' }}>
          <h1 style={{ fontSize:32, fontWeight:800, letterSpacing:'-0.03em', color:tx, lineHeight:1, margin:0, fontFamily:config.font??'Georgia, "Times New Roman", serif' }}>
            {business?.name ?? 'Your Business'}
          </h1>
          {business?.tagline && (
            <p style={{ fontSize:10, fontWeight:500, letterSpacing:'0.15em', textTransform:'uppercase', color:sx, marginTop:6 }}>
              {business.tagline}
            </p>
          )}
          {reviewPct && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginTop:6 }}>
              <LucideStar size={11} color="#f59e0b" filled/>
              <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>{reviewPct}%</span>
              {locBlock?.reviewCount && <span style={{ fontSize:10, color:sx }}> · {locBlock.reviewCount.toLocaleString()} reviews</span>}
            </div>
          )}
        </div>

        {/* Blocks */}
        <div style={{ padding:'10px 14px 32px', display:'flex', flexDirection:'column', gap:10 }}>
          {sortedBlocks.length === 0 ? (
            <p style={{ textAlign:'center', fontSize:12, color:sx, padding:'24px 0' }}>Toggle blocks to see them here</p>
          ) : sortedBlocks.map(b => (
            <div key={b.id} style={{ ...glass }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, background: isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)', display:'grid', placeItems:'center' }}>
                  <BlockIcon id={b.id} size={18} color={b.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:15, fontWeight:700, color:tx, margin:0, letterSpacing:'-0.01em' }}>
                    {b.id === 'hours' ? (status === 'open' ? 'Open now' : 'Closed now') : b.title}
                  </p>
                  <p style={{ fontSize:12, color:sx, margin:0, marginTop:2 }}>
                    {b.id === 'hours' ? todayLabel : b.sub}
                  </p>
                </div>
                {b.url && (
                  <div style={{ fontSize:11, color:isDark?'rgba(255,255,255,0.35)':'rgba(0,0,0,0.3)', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Social icons */}
        {SOCIAL_PLATFORMS.filter(p => config.socials && config.socials[p.key]).length > 0 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'0 0 16px' }}>
            {SOCIAL_PLATFORMS.filter(p => config.socials && config.socials[p.key]).map(p => (
              <div key={p.key} style={{ width:40, height:40, borderRadius:'50%', display:'grid', placeItems:'center', background: isDark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.06)' }}>
                <SocialIcon platform={p.key} size={16}/>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign:'center', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(0,0,0,0.22)', paddingBottom:24 }}>
          Powered by OpenStatus
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

          {/* ── UPDATES ── */}
          {block.id==='updates' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#FFF0F5] border border-[#F9A8D4] p-4">
                <p className="text-[12px] font-semibold text-[#BE185D]">📸 Instagram updates</p>
                <p className="text-[11px] text-[#858585] mt-1 leading-snug">Shows your 3 most recent Instagram posts as updates on your page. Make sure Meta is connected in your setup.</p>
              </div>
            </div>
          )}

          {/* ── WEBSITE / generic ── */}
          {(block.id==='website'||!['location','hours','menu','order','book','socials','updates'].includes(block.id)) && (
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
  { label:'Essential',      ids:['hours','location'] },
  { label:'Food & Beverage',ids:['menu','order'] },
  { label:'Engagement',     ids:['book','updates'] },
  { label:'Contact',        ids:['website'] },
  { label:'Social',         ids:['socials'] },
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
  { id: null,         title: 'Welcome to your builder! 👋',   body: "We'll walk you through the basics in 30 seconds. Hit Next to start, or Skip to explore on your own.", align: 'center' as const },
  { id: 'tut-hours',  title: 'Start with your hours',         body: 'Click the Hours block to set your open/closed times. This powers your live status that customers see instantly.', align: 'right' as const },
  { id: 'tut-preview',title: 'This is your live page',        body: "The phone preview shows exactly what customers see. Click any block on the preview to jump straight into editing it.", align: 'left' as const },
  { id: 'tut-add',    title: 'Add more features',             body: 'Hit "+ Add block" to turn on menus, online ordering, reservations, socials, and your website link.', align: 'right' as const },
  { id: 'tut-save',   title: 'You\'re already live! 🎉',      body: 'Your page is live at your link the moment you save. Hit Save any time to publish your latest changes.', align: 'center' as const },
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

type SidebarTab = 'design'|'business'|'hours'|'settings'|'style'|'photos'|'links'|'analytics'|'integrations';
type HoursSubTab = 'regular'|'special'|'status'|'auto';

// ── Google Business hours sync card ────────────────────────────────────────────
function GoogleHoursSync({initialPlaceId,googleConnected,onSync,getWeeklyHours}:{
  initialPlaceId:string;
  googleConnected:boolean;
  onSync:(hours:WeeklyHours,pid:string)=>void;
  getWeeklyHours:()=>WeeklyHours|undefined;
}){
  const [placeInput,setPlaceInput]=useState(initialPlaceId??'');
  const [syncing,setSyncing]=useState(false);
  const [syncMsg,setSyncMsg]=useState('');
  const [pushing,setPushing]=useState(false);
  const [pushMsg,setPushMsg]=useState('');

  async function pushToGoogle(){
    const hours=getWeeklyHours();
    if(!hours){setPushMsg('Save your hours first.');return;}
    setPushing(true);setPushMsg('');
    try{
      const {supabase:sb}=await import('@/lib/supabase');
      const {data:{session}}=await sb.auth.getSession();
      if(!session?.access_token){setPushMsg('Sign in again to push to Google.');return;}
      const r=await fetch('/api/google/hours',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
        body:JSON.stringify({weeklyHours:hours}),
      });
      const d=await r.json() as {ok?:boolean;error?:string};
      if(d.ok){setPushMsg('✓ Hours updated on Google!');}
      else{setPushMsg('Error: '+(d.error??'Unknown error'));}
    }catch(e){setPushMsg('Failed to reach API.');}
    finally{setPushing(false);}
  }
  async function syncFromGoogle(){
    const raw=placeInput.trim();
    if(!raw){setSyncMsg('Enter a Place ID or Google Maps URL');return;}
    const match=raw.match(/place_id=([^&]+)/)||raw.match(/ChIJ[A-Za-z0-9_-]+/);
    const pid=match?match[match.length===2?1:0]:raw;
    setSyncing(true);setSyncMsg('');
    try{
      const r=await fetch(`/api/google-place?placeId=${encodeURIComponent(pid)}`);
      const d=await r.json() as {weeklyHours?:WeeklyHours;error?:string};
      if(d.error){setSyncMsg('Error: '+d.error);return;}
      if(d.weeklyHours){onSync(d.weeklyHours,pid);setSyncMsg('✓ Hours synced from Google!');}
      else{setSyncMsg('No hours found for that place.');}
    }catch(e){setSyncMsg('Failed to reach API.');}
    finally{setSyncing(false);}
  }
  return(
    <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>
        <p className="text-[13px] font-bold text-[#0A0A0A]">Sync from Google Business</p>
      </div>
      <p className="text-[11px] text-[#858585]">Paste your Place ID (starts with ChIJ…) or a Google Maps link to pull in your hours automatically.</p>
      <div className="flex gap-2">
        <input value={placeInput} onChange={e=>setPlaceInput(e.target.value)} placeholder="ChIJ... or Google Maps URL" className="flex-1 text-[12px] border border-[#DEDEDC] rounded-xl px-3 py-2 outline-none focus:border-[#0A0A0A] bg-[#FAFAFA]"/>
        <button onClick={syncFromGoogle} disabled={syncing} className="px-4 py-2 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-semibold disabled:opacity-50 whitespace-nowrap hover:bg-[#333] transition-colors">{syncing?'Syncing…':'Sync hours'}</button>
      </div>
      {syncMsg&&<p className={`text-[11px] font-medium ${syncMsg.startsWith('✓')?'text-green-600':'text-red-500'}`}>{syncMsg}</p>}
      <div className="border-t border-[#EBEBEB] pt-3 mt-1">
        {googleConnected?(
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#2E7D5B] font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Auto-syncs to Google on every Save
            </div>
            <button onClick={pushToGoogle} disabled={pushing} className="w-full px-4 py-2 rounded-xl border border-[#0A0A0A] text-[#0A0A0A] text-[12px] font-semibold disabled:opacity-50 hover:bg-[#F5F5F5] transition-colors flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12l8-8 8 8M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {pushing?'Pushing…':'Push hours to Google now'}
            </button>
            {pushMsg&&<p className={`text-[11px] font-medium ${pushMsg.startsWith('✓')?'text-green-600':'text-red-500'}`}>{pushMsg}</p>}
          </div>
        ):(
          <a href="/connect/google" className="flex items-center gap-1.5 text-[12px] text-[#4285F4] font-medium hover:underline">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            Connect Google Business to push hours
          </a>
        )}
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────
export default function BuilderClient({ business,initialConfig,isFirstRun=false,onboardedAt,googleConnected=false }: {
  business:Business|null; initialConfig:OpenStatusPageConfig; isFirstRun?:boolean; onboardedAt?:string|null; googleConnected?:boolean;
}) {
  const [config,setConfig]=useState<OpenStatusPageConfig>(initialConfig??normalizeOpenStatusPageConfig(undefined));
  const [sidebarTab,setSidebarTab]=useState<SidebarTab>('design');
  const [hoursSubTab,setHoursSubTab]=useState<HoursSubTab>('regular');
  const [previewMode,setPreviewMode]=useState<'mobile'|'desktop'>(
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile'
  );
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
  const [showTutorial,setShowTutorial]=useState(()=>{try{return!localStorage.getItem('os_tutorial_done')}catch{return true}});
  const [showFirstRun,setShowFirstRun]=useState(isFirstRun);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [googleSyncStatus,setGoogleSyncStatus]=useState<null|'syncing'|'ok'|{error:string}>(null);
  const [googleFetchUrl,setGoogleFetchUrl]=useState('');
  const [googleFetching,setGoogleFetching]=useState(false);
  const [googleFetchError,setGoogleFetchError]=useState('');
  const [googleFetchDone,setGoogleFetchDone]=useState(false);
  const [dragId,setDragId]=useState<string|null>(null);
  const [mobileBlockCat,setMobileBlockCat]=useState<string>('All');
  const [mobileSheetOpen,setMobileSheetOpen]=useState<boolean>(false);
  const [isMobile,setIsMobile]=useState<boolean>(false);
  const sheetDragRef=useRef<{startY:number,open:boolean}|null>(null);
  const [dragOverId,setDragOverId]=useState<string|null>(null);
  const [previewWidth,setPreviewWidth]=useState(420);
  const [localBusiness,setLocalBusiness]=useState<Business|null>(business);
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
  function copyMonToWeekdays() {
    const mon=hours.mon;
    setConfig(c=>({...c,weeklyHours:{...hours,tue:mon,wed:mon,thu:mon,fri:mon}}));
  }
  async function save() {
    setSaving(true);setSaveError('');
    const {error}=await supabase.auth.updateUser({data:{openstatus_page:config}});
    setSaving(false);
    if(error){setSaveError(error.message);return;}
    setSaved(true);setTimeout(()=>setSaved(false),2500);
    // Auto-sync hours to Google if connected
    if(googleConnected && config.weeklyHours){
      setGoogleSyncStatus('syncing');
      supabase.auth.getSession().then(async ({data:{session}})=>{
        if(!session?.access_token){setGoogleSyncStatus({error:'Session expired'});return;}
        try{
          const r=await fetch('/api/google/hours',{
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
            body:JSON.stringify({weeklyHours:config.weeklyHours}),
          });
          const body=await r.json().catch(()=>({}));
          if(r.ok){
            setGoogleSyncStatus('ok');
            setTimeout(()=>setGoogleSyncStatus(null),4000);
          } else {
            setGoogleSyncStatus({error:body?.error??`Google sync failed (${r.status})`});
          }
        }catch(e){
          setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});
        }
      }).catch(e=>{setGoogleSyncStatus({error:e instanceof Error?e.message:'Session error'});});
    }
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
    { key:'business', label:'Business', icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key:'design',   label:'Blocks',   icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key:'photos',   label:'Photos',   icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { key:'style',    label:'Style',    icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.58a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg> },
    { key:'settings', label:'Settings', icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
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
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check();
    window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  // Load Google Font whenever selected font changes
  useEffect(()=>{
    const opt = FONT_OPTIONS.find(f=>f.family===config.font);
    if(!opt?.google) return;
    const id = `gfont-${opt.google}`;
    if(document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
    document.head.appendChild(link);
  },[config.font]);

  const closeEarlyTimes: string[] = [];
  for(let h=7;h<22;h++) for(const m of [0,30]) closeEarlyTimes.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F0F2F5] text-[#111111]" style={{fontFamily:"'Poppins',system-ui,sans-serif"}}>

      {/* ── FIRST-RUN BANNER ── */}
      {showFirstRun&&(
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:'#0A0A0A',color:'#F7F7F5',padding:'12px 20px',display:isMobile?'none':'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(255,255,255,0.45)'}}>YOUR PAGE IS READY TO BUILD</span>
            <p style={{fontSize:13,marginTop:2,color:'rgba(255,255,255,0.75)'}}>Add your logo, cover photo, and links. You can change anything below.</p>
          </div>
          <button onClick={()=>setShowFirstRun(false)} style={{background:'rgba(255,255,255,0.12)',border:'none',color:'#fff',borderRadius:99,padding:'6px 14px',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Got it</button>
        </div>
      )}

      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className="w-[220px] flex-shrink-0 flex-col bg-white/80 backdrop-blur border-r border-[#E8EBF0]" style={{display:isMobile?"none":"flex"}}>
        {/* Wordmark */}
        <div className="px-5 h-14 flex items-center flex-shrink-0">
          <span className="font-bold text-[18px] tracking-[-0.04em] text-[#111111]" style={{fontFamily:"'Poppins',system-ui,sans-serif"}}>OpenStatus</span>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-0.5">
          {SIDEBAR_NAV.map(({key,label,icon})=>(
            <button key={key} onClick={()=>{setSidebarTab(key);setMobileSheetOpen(true);}}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-left transition-all ${
                sidebarTab===key
                  ?'bg-[#111111] text-white'
                  :'text-[#667085] hover:bg-[#F4F6FA] hover:text-[#111111]'
              }`}
              style={{color:sidebarTab===key?'#ffffff':undefined}}>
              <span className={sidebarTab===key?'text-white':'text-[#98A2B3]'}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        {/* Bottom CTAs */}
        <div className="px-4 py-4 border-t border-[#E8EBF0] flex-shrink-0">
          <a href="/setup?step=1" className="w-full flex items-center gap-2 text-[11px] font-semibold text-[#98A2B3] hover:text-[#111111] transition-colors">
            ⚙ Account settings
          </a>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F7F5]">

        {/* ── TOP NAV BAR ── */}
        <header className="h-14 border-b border-[#E8EBF0] items-center justify-between px-4 md:px-6 flex-shrink-0 bg-white/90 backdrop-blur-sm" style={{display:isMobile?"none":"flex"}}>
          <span className="text-[13px] font-semibold text-[#111111]" style={{fontFamily:"'Poppins',system-ui,sans-serif"}}>{sidebarLabel}</span>
          <div className="flex items-center gap-3">
            {business?.slug&&(
              <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-[12px] font-medium text-[#6B6B6B] hover:text-[#111] transition-colors">
                View your link <span className="text-[#858585]">↗</span>
              </a>
            )}
            <button className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#E0E0E0] text-[12px] font-semibold text-[#6B6B6B] hover:border-[#111] transition-colors">
              <IconEye size={13} color="currentColor"/> Preview
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <button onClick={save} disabled={saving} data-tut="tut-save"
                className={`px-4 py-1.5 rounded-full text-[12px] md:text-[13px] md:px-5 font-semibold transition-all flex-shrink-0 ${saved?'bg-[#DCFCE7] text-[#166534]':saving?'bg-[#EEEEEC] text-[#858585]':saveError?'bg-red-100 text-red-600':'bg-[#0A0A0A] text-white hover:bg-[#292929]'}`}>
                {saving?'Saving…':saved?'✓ Saved':saveError?'Error':'Publish'}
              </button>
              {saveError&&<p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">{saveError}</p>}
              {googleConnected&&googleSyncStatus==='syncing'&&<p className="text-[10px] text-[#4285F4] text-right">Syncing to Google…</p>}
              {googleConnected&&googleSyncStatus==='ok'&&<p className="text-[10px] text-[#166534] text-right">✓ Synced to Google</p>}
              {googleConnected&&googleSyncStatus&&typeof googleSyncStatus==='object'&&(
                <p className="text-[10px] text-[#C4453F] max-w-[160px] text-right leading-tight" title={googleSyncStatus.error}>Google sync failed — check Integrations tab</p>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-[#111] text-[12px] font-bold flex-shrink-0 cursor-pointer select-none">
              {(business?.name??'E').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── CONTENT + RIGHT PREVIEW ── */}
        <div className="flex-1 overflow-hidden" style={{display:isMobile?"none":"flex"}}>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 overflow-y-auto min-w-0 pb-[env(safe-area-inset-bottom)] md:pb-0 bg-white/72 backdrop-blur-md rounded-tl-2xl">

            {/* ══ HOURS & STATUS ══ */}
            {sidebarTab==='hours'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                {/* Header */}
                <div className="mb-7">
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
                    {/* ── Google Business sync ── */}
                    <GoogleHoursSync
                      initialPlaceId={config.placeId??''}
                      googleConnected={googleConnected}
                      onSync={(hours,pid)=>setConfig(c=>({...c,weeklyHours:hours,placeId:pid}))}
                      getWeeklyHours={()=>config.weeklyHours}
                    />
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
                        {/* Open today — only show if today is marked closed */}
                        {hours[(['sun','mon','tue','wed','thu','fri','sat'] as WeekDay[])[new Date().getDay()]]?.closed&&(
                          <button onClick={()=>{setQuickAction('open-today');setQuickMsg('');}}
                            className="flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] hover:border-[#166534] hover:bg-[#DCFCE7] transition-all text-left col-span-2">
                            <div className="flex items-center justify-between w-full">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                              {googleConnected&&<span className="flex items-center gap-1 text-[10px] font-semibold text-[#4285F4]"><svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>Syncs to Google</span>}
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#166534]">Open Today</p>
                              <p className="text-[11px] mt-0.5 leading-snug" style={{color:'#15803d'}}>Restore your regular hours for today</p>
                            </div>
                          </button>
                        )}
                        {[
                          {key:'close-early',  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:'Close Early',       desc:'Close before your regular time today'},
                          {key:'close-today',  icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label:'Close Today',       desc:'Mark as fully closed for the day'},
                          {key:'special-hours',icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:'Add Special Hours', desc:'Holiday, event, or seasonal hours'},
                          {key:'out-of-office',icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg>, label:'Out of Office',     desc:'Set away dates and a message'},
                        ].map(({key,icon,label,desc})=>(
                          <button key={key} onClick={()=>{setQuickAction(key);setQuickMsg('');setCloseEarlyTime('15:00');}}
                            className="flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-[#DEDEDC] bg-white hover:border-[#0A0A0A] hover:bg-[#EEEEEC] transition-all text-left group">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[#858585] group-hover:text-[#0A0A0A] transition-colors">{icon}</span>
                              {googleConnected&&(key==='close-early'||key==='close-today')&&(
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#4285F4]">
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>
                                  Syncs to Google
                                </span>
                              )}
                            </div>
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
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#858585] group-hover:text-[#EF4444] transition-colors"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                          <div>
                            <p className="text-[13px] font-bold text-[#111]">Closed today</p>
                            <p className="text-[11px] text-[#858585] mt-0.5 leading-snug">Mark as fully closed all day</p>
                          </div>
                        </button>
                        {/* Close early */}
                        <div className="flex flex-col gap-2 p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#858585" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#858585" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
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
            )}

            {/* ══ DESIGN (blocks + style) ══ */}
            {sidebarTab==='design'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                {/* Block edit panel — slides in when a block is open */}
                {showEditPanel&&openBlock?(
                  <BlockEditPanel
                    block={openBlock} config={config}
                    onUpdateBlock={u=>updateBlock(openBlock.id,u)}
                    onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
                    onClose={()=>setOpenId(null)}
                  />
                ):(
                  <>
                    <div className="mb-7">
                      <h2 className="text-[22px] font-bold text-[#0A0A0A] leading-tight">Design</h2>
                      <p className="text-[#858585] text-[13px] mt-1">Tap any block to edit it. Drag to reorder.</p>
                    </div>

                    {/* Google Business fetch */}
                    <div className="mb-6 rounded-2xl border border-[#DEDEDC] bg-[#F7F7F5] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        <p className="text-[12px] font-bold text-[#0A0A0A]">Google Business</p>
                        {googleFetchDone&&<span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Imported</span>}
                      </div>
                      <p className="text-[11px] text-[#858585] mb-3">Paste your Google Maps URL to auto-fill your rating, review count, and location block.</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={googleFetchUrl||allBlocks.find(b=>b.id==='location')?.googleUrl||''}
                          onChange={e=>{setGoogleFetchUrl(e.target.value);setGoogleFetchDone(false);setGoogleFetchError('');}}
                          placeholder="https://maps.google.com/maps/place/..."
                          className="flex-1 rounded-xl border border-[#DEDEDC] bg-white px-3 py-2 text-[12px] outline-none focus:border-[#0A0A0A] transition-colors"
                        />
                        <button
                          disabled={!googleFetchUrl&&!allBlocks.find(b=>b.id==='location')?.googleUrl||googleFetching}
                          onClick={async()=>{
                            const url=googleFetchUrl||allBlocks.find(b=>b.id==='location')?.googleUrl||'';
                            if(!url)return;
                            setGoogleFetching(true);setGoogleFetchError('');setGoogleFetchDone(false);
                            try{
                              const r=await fetch(`/api/google/rating?url=${encodeURIComponent(url)}`);
                              const d=await r.json() as {rating?:number;reviewCount?:number;name?:string;error?:string;address?:string;phone?:string;website?:string;weeklyHours?:WeeklyHours;photoUrl?:string;photos?:string[];lat?:number;lng?:number;reviews?:Array<{author:string;rating:number;text:string;time:string}>};
                              if(!r.ok||d.error)throw new Error(d.error??'Failed');
                              updateBlock('location',{googleUrl:url,reviewStars:d.rating,reviewCount:d.reviewCount,sub:d.address??d.name??allBlocks.find(b=>b.id==='location')?.sub??'',...(d.lat!==undefined?{lat:d.lat,lng:d.lng}:{}),...(d.reviews?{reviews:d.reviews}:{}),...(d.photoUrl?{coverPhoto:d.photoUrl}:{})});
                              if(d.weeklyHours) setConfig(c=>({...c,weeklyHours:d.weeklyHours as WeeklyHours}));
                              if(d.photoUrl) setConfig(c=>({...c,bgImage:d.photoUrl}));
                              if(d.photos?.length) setGooglePhotos(d.photos);
                              if(d.phone&&allBlocks.find(b=>b.id==='call')) updateBlock('call',{url:'tel:'+d.phone,on:true});
                              if(d.website&&allBlocks.find(b=>b.id==='website')) updateBlock('website',{url:d.website,on:true});
                              setGoogleFetchDone(true);
                            }catch(e){setGoogleFetchError(e instanceof Error?e.message:'Could not fetch');}
                            finally{setGoogleFetching(false);}
                          }}
                          className="flex-shrink-0 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold px-4 py-2 hover:bg-[#292929] transition-colors disabled:opacity-40"
                        >{googleFetching?'Fetching…':'Fetch'}</button>
                      </div>
                      {googleFetchError&&<p className="text-[11px] text-red-500 mt-2">{googleFetchError}</p>}
                    </div>

                    {/* Active blocks */}
                    <div className="rounded-2xl border border-[#DEDEDC] overflow-hidden mb-1">
                      {activeBlocks.length===0&&(
                        <div className="px-4 py-8 text-center text-[13px] text-[#858585]">No blocks yet — hit + Add block below.</div>
                      )}
                      {activeBlocks.map((block,i)=>(
                        <div key={block.id}
                          data-tut={i===0&&block.id==='hours'?'tut-hours':undefined}
                          className={`flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-[#F7F7F5]
                            ${i<activeBlocks.length-1?'border-b border-[#F5F5F5]':''}
                            ${openId===block.id?'bg-[#F8F8F8]':''}
                            ${dragOverId===block.id&&dragId!==block.id?'border-l-[3px] border-l-[#0A0A0A]':''}
                            ${dragId===block.id?'opacity-40':''}
                          `}
                          style={{height:68}}
                          draggable={block.id!=='hours'}
                          onDragStart={()=>{if(block.id!=='hours')setDragId(block.id);}}
                          onDragOver={e=>{e.preventDefault();setDragOverId(block.id);}}
                          onDragLeave={()=>setDragOverId(null)}
                          onDrop={()=>handleDrop(block.id)}
                          onDragEnd={()=>{setDragId(null);setDragOverId(null);}}
                          onClick={()=>setOpenId(block.id)}
                        >
                          {block.id!=='hours'
                            ?<div className="flex-shrink-0 cursor-grab opacity-25 hover:opacity-60 transition-opacity" onClick={e=>e.stopPropagation()}>
                              <LucideGrip size={14} color="#6B6B6B"/>
                            </div>
                            :<div className="w-[14px] flex-shrink-0"/>
                          }
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#DEDEDC] bg-[#EEEEEC]"
                            style={block.color?{backgroundColor:`${block.color}12`,borderColor:`${block.color}28`}:{}}>
                            <BlockIcon id={block.id} size={14} color={block.color??'#0A0A0A'}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-semibold text-[#0A0A0A] leading-tight">{block.title}</p>
                              {block.id==='hours'&&(
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${liveStatus==='open'?'bg-[#DCFCE7] text-[#166534]':'bg-[#EEEEEC] text-[#858585]'}`}>
                                  {liveStatus==='open'?'● open':'● closed'}
                                </span>
                              )}
                              {block.size==='half'&&<span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EEEEEC] text-[#858585] flex-shrink-0">½</span>}
                            </div>
                            <p className="text-[12px] text-[#858585] leading-tight mt-0.5 truncate">
                              {block.id==='hours'?todayLabel:block.sub}
                            </p>
                          </div>
                          <LucideChevronRight size={13} color="#D0D0D0"/>
                          {block.id!=='hours'&&(
                            <button
                              onClick={e=>{e.stopPropagation();updateBlock(block.id,{on:false});}}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#C0C0C0] hover:text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all flex-shrink-0"
                              title="Remove block">
                              <LucideX size={11} color="currentColor"/>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button data-tut="tut-add" onClick={()=>setShowPicker(true)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[#D8D8D8] text-[#858585] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all group mb-10">
                      <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center flex-shrink-0">
                        <span className="text-[14px] leading-none">+</span>
                      </div>
                      <span className="text-[13px] font-medium">Add block</span>
                    </button>

                    {/* Style: logo + background + socials */}
                    <div className="space-y-8 border-t border-[#F0F0F0] pt-8">
                      <div>
                        <p className="text-[14px] font-bold text-[#0A0A0A] mb-1">Style</p>
                        <p className="text-[#858585] text-[13px] mb-5">Logo, page color, and social links.</p>
                        {/* Logo upload */}
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Logo</p>
                        <div className="flex items-center gap-4 mb-3">
                          {localBusiness?.avatar_url
                            ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                                className="w-14 h-14 rounded-full object-cover border border-[#DEDEDC] flex-shrink-0" alt="Logo"/>
                            :<div className="w-14 h-14 rounded-full bg-[#EEEEEC] flex items-center justify-center flex-shrink-0"><LucideImage size={18} color="#C0C0C0"/></div>
                          }
                          <div className="flex-1 min-w-0">
                            <label className={`cursor-pointer ${logoUploading?'pointer-events-none':''}`}>
                              <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                                const file=e.target.files?.[0];if(!file)return;
                                setLogoUploading(true);setLogoUploadError('');
                                try{
                                  const ref=await uploadAsset(file,'avatar');
                                  if(localBusiness?.id){
                                    await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                                    setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                                  }
                                }catch(err){setLogoUploadError(err instanceof Error?err.message:'Upload failed');}
                                finally{setLogoUploading(false);e.target.value='';}
                              }}/>
                              <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EEEEEC] text-[12px] font-semibold text-[#111] hover:bg-[#DEDEDC] transition-colors ${logoUploading?'opacity-60':''}`}>
                                <LucideImage size={13} color="#6B6B6B"/>
                                {logoUploading?'Uploading…':'Upload logo'}
                              </span>
                            </label>
                            {logoUploadError&&<p className="text-[11px] text-red-500 mt-1">{logoUploadError}</p>}
                          </div>
                        </div>
                        {googlePhotos.length>0&&(
                          <div className="mb-4">
                            <p className="text-[10px] text-[#858585] mb-2">Or pick a Google Business photo as your logo:</p>
                            <div className="flex gap-2 flex-wrap">
                              {googlePhotos.map((url,i)=>(
                                <button key={i} onClick={async()=>{
                                  if(!localBusiness?.id){setLogoUploadError('No business found');return;}
                                  setLogoUploading(true);setLogoUploadError('');
                                  try{
                                    const blob=await fetch(url).then(r=>r.blob());
                                    const file=new File([blob],'google-photo.jpg',{type:blob.type||'image/jpeg'});
                                    const ref=await uploadAsset(file,'avatar');
                                    await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                                    setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                                  }catch(err){setLogoUploadError(err instanceof Error?err.message:'Failed');}
                                  finally{setLogoUploading(false);}
                                }}
                                className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${logoUploading?'opacity-50 pointer-events-none':''} border-[#DEDEDC] hover:border-[#0A0A0A]`}
                                title={`Use Google photo ${i+1}`}>
                                  <img src={url} className="w-full h-full object-cover" alt=""/>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3 mt-6">Page color</p>
                        <div className="grid grid-cols-5 gap-3 mb-4">
                          {BG_PRESETS.map(c=>(
                            <button key={c} onClick={()=>setConfig(p=>({...p,bg:c}))}
                              className="aspect-square rounded-xl border-2 transition-all hover:scale-105"
                              style={{background:c,borderColor:config.bg===c?'#0A0A0A':'#DEDEDC'}}/>
                          ))}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg border border-[#DEDEDC]" style={{background:config.bg}}/>
                          <input value={config.bg} onChange={e=>setConfig(c=>({...c,bg:e.target.value}))}
                            placeholder="#ffffff or gradient"
                            className="flex-1 bg-white border border-[#DEDEDC] rounded-xl px-3 py-2 text-[13px] font-mono placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"/>
                        </div>
                      </div>


                      {/* Background photo */}
                      <div>
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Background photo</p>
                        {config.bgImage&&(
                          <div className="relative mb-3 rounded-xl overflow-hidden">
                            <img src={config.bgImage} className="w-full h-20 object-cover" alt="Background"/>
                            <button onClick={()=>setConfig(c=>({...c,bgImage:undefined}))}
                              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
                              <LucideX size={10} color="white"/>
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className={`cursor-pointer ${bgUploading?'pointer-events-none opacity-60':''}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                              const file=e.target.files?.[0];if(!file)return;
                              setBgUploading(true);setBgUploadError('');
                              try{
                                const ref=await uploadAsset(file,'header');
                                const bgUrl=localBusiness?.id?`/api/assets?businessId=${localBusiness.id}&kind=header`:ref;
                                setConfig(c=>({...c,bgImage:bgUrl}));
                                if(localBusiness?.id)await supabase.from('businesses').update({header_url:ref}).eq('id',localBusiness.id);
                              }catch(err){setBgUploadError(err instanceof Error?err.message:'Upload failed');}
                              finally{setBgUploading(false);e.target.value='';}
                            }}/>
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EEEEEC] text-[12px] font-semibold text-[#111] hover:bg-[#DEDEDC] transition-colors">
                              <LucideImage size={13} color="#6B6B6B"/>
                              {bgUploading?'Uploading…':'Upload photo'}
                            </span>
                          </label>
                          {googlePhotos.map((url,i)=>(
                            <button key={i} onClick={()=>setConfig(c=>({...c,bgImage:url}))}
                              className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${config.bgImage===url?'border-[#0A0A0A]':'border-[#DEDEDC] hover:border-[#0A0A0A]'}`}
                              title={`Google photo ${i+1}`}>
                              <img src={url} className="w-full h-full object-cover" alt=""/>
                            </button>
                          ))}
                        </div>
                        {bgUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{bgUploadError}</p>}
                        {googlePhotos.length>0&&<p className="text-[10px] text-[#858585] mt-1.5">Tap a thumbnail to use your Google Business photo.</p>}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider mb-3">Social profiles</p>
                        <div className="space-y-2.5">
                          {SOCIAL_PLATFORMS.map(({key,label})=>(
                            <div key={key} className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                              <input value={config.socials[key]??''} onChange={e=>setConfig(c=>({...c,socials:{...c.socials,[key]:e.target.value}}))}
                                placeholder={`${label} URL…`}
                                className="flex-1 bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"/>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ BUSINESS INFO ══ */}
            {sidebarTab==='business'&&(
              <div className="px-8 py-8 max-w-[600px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-bold text-[#0A0A0A] leading-tight">Business Info</h2>
                  <p className="text-[#858585] text-[13px] mt-1">Your name, location, and category.</p>
                </div>
                <div className="rounded-2xl border border-[#DEDEDC] p-5 space-y-4 bg-white">
                  <div>
                    <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">Business name</p>
                    <p className="text-[15px] font-semibold text-[#111]">{business?.name??'—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">Category</p>
                    <p className="text-[15px] font-semibold text-[#111]">{business?.category??'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">Description</p>
                    <p className="text-[13px] text-[#6B6B6B] leading-relaxed">{business?.tagline??'No description yet.'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">Location</p>
                    <div className="flex items-center gap-3">
                      <input value={config.location??''} onChange={e=>setConfig(c=>({...c,location:e.target.value}))}
                        placeholder="e.g. 123 Main St, Austin TX"
                        className="flex-1 bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"/>
                    </div>
                  </div>
                </div>
                {/* Logo upload */}
                <div className="mt-5">
                  <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-3">Logo</p>
                  <div className="flex items-center gap-4 mb-3">
                    {localBusiness?.avatar_url
                      ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                          className="w-14 h-14 rounded-full object-cover border border-[#DEDEDC] flex-shrink-0" alt="Logo"/>
                      :<div className="w-14 h-14 rounded-full bg-[#EEEEEC] flex items-center justify-center flex-shrink-0"><LucideImage size={18} color="#C0C0C0"/></div>
                    }
                    <div className="flex-1 min-w-0">
                      <label className={`cursor-pointer ${logoUploading?'pointer-events-none':''}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                          const file=e.target.files?.[0];if(!file)return;
                          setLogoUploading(true);setLogoUploadError('');
                          try{
                            const ref=await uploadAsset(file,'avatar');
                            if(localBusiness?.id){
                              await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                              setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                            }
                          }catch(err){setLogoUploadError(err instanceof Error?err.message:'Upload failed');}
                          finally{setLogoUploading(false);e.target.value='';}
                        }}/>
                        <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#EEEEEC] text-[12px] font-semibold text-[#111] hover:bg-[#DEDEDC] transition-colors ${logoUploading?'opacity-60':''}`}>
                          {logoUploading?'Uploading…':'Upload logo'}
                        </span>
                      </label>
                      {logoUploadError&&<p className="text-[11px] text-red-500 mt-1">{logoUploadError}</p>}
                    </div>
                  </div>
                  {googlePhotos.length>0&&(
                    <div className="mb-3">
                      <p className="text-[10px] text-[#858585] mb-2">Or use a Google Business photo as your logo:</p>
                      <div className="flex gap-2 flex-wrap">
                        {googlePhotos.map((url,i)=>(
                          <button key={i} onClick={async()=>{
                            if(!localBusiness?.id){setLogoUploadError('No business found');return;}
                            setLogoUploading(true);setLogoUploadError('');
                            try{
                              const blob=await fetch(url).then(r=>r.blob());
                              const file=new File([blob],'google-photo.jpg',{type:blob.type||'image/jpeg'});
                              const ref=await uploadAsset(file,'avatar');
                              await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                              setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                            }catch(err){setLogoUploadError(err instanceof Error?err.message:'Failed');}
                            finally{setLogoUploading(false);}
                          }}
                          className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${logoUploading?'opacity-50 pointer-events-none':''} border-[#DEDEDC] hover:border-[#0A0A0A]`}
                          title={`Use Google photo ${i+1}`}>
                            <img src={url} className="w-full h-full object-cover" alt=""/>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-[12px] text-[#858585]">
                    To edit your name or category, <a href="/setup?step=1" className="font-semibold text-[#111] underline underline-offset-2">go to Settings →</a>
                  </p>
                </div>
              </div>
            )}

            {/* ══ LINKS ══ */}
            {sidebarTab==='links'&&(
              <div className="px-8 py-8 max-w-[600px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-bold text-[#0A0A0A] leading-tight">Links</h2>
                  <p className="text-[#858585] text-[13px] mt-1">Your public OpenStatus link.</p>
                </div>
                <div className="rounded-2xl border border-[#DEDEDC] p-5 bg-white">
                  <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-2">Your link</p>
                  {business?.slug?(
                    <div className="flex items-center gap-3">
                      <code className="text-[14px] font-semibold text-[#111] bg-[#EEEEEC] px-3 py-2 rounded-xl flex-1">
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


            {/* ══ STYLE ══ */}
            {sidebarTab==='style'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-bold text-[#111111] leading-tight tracking-[-0.03em]">Style</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Logo, colors, and social links.</p>
                </div>
                <div className="space-y-8">
                  {/* Logo */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Logo</p>
                    <div className="flex items-center gap-4 mb-3">
                      {localBusiness?.avatar_url
                        ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                            className="w-14 h-14 rounded-full object-cover border border-[#E8EBF0] flex-shrink-0" alt="Logo"/>
                        :<div className="w-14 h-14 rounded-full bg-[#F4F6FA] flex items-center justify-center flex-shrink-0 border border-[#E8EBF0]"><LucideImage size={18} color="#98A2B3"/></div>
                      }
                      <div className="flex-1 min-w-0">
                        <label className={`cursor-pointer ${logoUploading?'pointer-events-none':''}`}>
                          <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                            const file=e.target.files?.[0];if(!file)return;
                            setLogoUploading(true);setLogoUploadError('');
                            try{
                              const ref=await uploadAsset(file,'avatar');
                              if(localBusiness?.id){
                                await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                                setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                              }
                            }catch(err){setLogoUploadError(err instanceof Error?err.message:'Upload failed');}
                            finally{setLogoUploading(false);e.target.value='';}
                          }}/>
                          <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F6FA] border border-[#E8EBF0] text-[12px] font-semibold text-[#111111] hover:bg-[#E8EBF0] transition-colors ${logoUploading?'opacity-60':''}`}>
                            <LucideImage size={13} color="#667085"/>
                            {logoUploading?'Uploading…':'Upload logo'}
                          </span>
                        </label>
                        {logoUploadError&&<p className="text-[11px] text-red-500 mt-1">{logoUploadError}</p>}
                      </div>
                    </div>
                    {googlePhotos.length>0&&(
                      <div className="mb-2">
                        <p className="text-[10px] text-[#98A2B3] mb-2">Or pick from your Google Business photos:</p>
                        <div className="flex gap-2 flex-wrap">
                          {googlePhotos.map((url,i)=>(
                            <button key={i} onClick={async()=>{
                              if(!localBusiness?.id){setLogoUploadError('No business found');return;}
                              setLogoUploading(true);setLogoUploadError('');
                              try{
                                const blob=await fetch(url).then(r=>r.blob());
                                const file=new File([blob],'google-photo.jpg',{type:blob.type||'image/jpeg'});
                                const ref=await uploadAsset(file,'avatar');
                                await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                                setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                              }catch(err){setLogoUploadError(err instanceof Error?err.message:'Failed');}
                              finally{setLogoUploading(false);}
                            }}
                            className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${logoUploading?'opacity-50 pointer-events-none':''} border-[#E8EBF0] hover:border-[#111111]`}>
                              <img src={url} className="w-full h-full object-cover" alt=""/>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Page color */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Page color</p>
                    <div className="grid grid-cols-5 gap-3 mb-4">
                      {BG_PRESETS.map(c=>(
                        <button key={c} onClick={()=>setConfig(p=>({...p,bg:c}))}
                          className="aspect-square rounded-xl border-2 transition-all hover:scale-105"
                          style={{background:c,borderColor:config.bg===c?'#111111':'#E8EBF0'}}/>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg border border-[#E8EBF0]" style={{background:config.bg}}/>
                      <input value={config.bg} onChange={e=>setConfig(c=>({...c,bg:e.target.value}))}
                        placeholder="#ffffff or gradient"
                        className="flex-1 bg-white border border-[#E8EBF0] rounded-xl px-3 py-2 text-[13px] font-mono placeholder:text-[#98A2B3] focus:outline-none focus:border-[#111111] transition-colors"/>
                    </div>
                  </div>
                  {/* Background photo */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Background photo</p>
                    {config.bgImage&&(
                      <div className="relative mb-3 rounded-xl overflow-hidden">
                        <img src={config.bgImage} className="w-full h-20 object-cover" alt="Background"/>
                        <button onClick={()=>setConfig(c=>({...c,bgImage:undefined}))}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
                          <LucideX size={10} color="white"/>
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className={`cursor-pointer ${bgUploading?'pointer-events-none opacity-60':''}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                          const file=e.target.files?.[0];if(!file)return;
                          setBgUploading(true);setBgUploadError('');
                          try{
                            const ref=await uploadAsset(file,'header');
                            const bgUrl=localBusiness?.id?`/api/assets?businessId=${localBusiness.id}&kind=header`:ref;
                            setConfig(c=>({...c,bgImage:bgUrl}));
                            if(localBusiness?.id)await supabase.from('businesses').update({header_url:ref}).eq('id',localBusiness.id);
                          }catch(err){setBgUploadError(err instanceof Error?err.message:'Upload failed');}
                          finally{setBgUploading(false);e.target.value='';}
                        }}/>
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F6FA] border border-[#E8EBF0] text-[12px] font-semibold text-[#111111] hover:bg-[#E8EBF0] transition-colors">
                          <LucideImage size={13} color="#667085"/>
                          {bgUploading?'Uploading…':'Upload photo'}
                        </span>
                      </label>
                      {googlePhotos.map((url,i)=>(
                        <button key={i} onClick={()=>setConfig(c=>({...c,bgImage:url}))}
                          className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${config.bgImage===url?'border-[#111111]':'border-[#E8EBF0] hover:border-[#111111]'}`}>
                          <img src={url} className="w-full h-full object-cover" alt=""/>
                        </button>
                      ))}
                    </div>
                    {bgUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{bgUploadError}</p>}
                  </div>
                  {/* Social profiles */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Social profiles</p>
                    <div className="space-y-2.5">
                      {SOCIAL_PLATFORMS.map(({key,label})=>(
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                          <input value={config.socials[key]??''} onChange={e=>setConfig(c=>({...c,socials:{...c.socials,[key]:e.target.value}}))}
                            placeholder={`${label} URL…`}
                            className="flex-1 bg-white border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] text-[#111111] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#111111] transition-colors"/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* ══ SETTINGS (incl. integrations + links) ══ */}
            {(sidebarTab==='analytics'||sidebarTab==='settings'||sidebarTab==='integrations')&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[600px] space-y-8">
                <div>
                  <h2 className="text-[22px] font-bold text-[#111111] leading-tight tracking-[-0.03em]">Settings</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Integrations, your link, and more.</p>
                </div>
                {/* Google Business */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Integrations</p>
                  <div className={`rounded-2xl border p-4 ${googleConnected?'border-[#BBF7D0] bg-[#F0FDF4]':'border-[#E8EBF0] bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#E8EBF0] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-[#111111]">Google Business Profile</p>
                          {googleConnected&&(
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#BBF7D0] text-[#166534] text-[10px] font-bold">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                          {googleConnected
                            ? 'Your hours sync to Google automatically when you save.'
                            : 'Connect to keep your Google listing hours in sync.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {googleConnected?(
                        <>
                          <button
                            onClick={async()=>{
                              setGoogleSyncStatus('syncing');
                              const {data:{session}}=await supabase.auth.getSession();
                              if(!session?.access_token){setGoogleSyncStatus({error:'Session expired'});return;}
                              try{
                                const r=await fetch('/api/google/hours',{
                                  method:'POST',
                                  headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
                                  body:JSON.stringify({weeklyHours:config.weeklyHours??DEFAULT_WEEK_HOURS}),
                                });
                                const body=await r.json().catch(()=>({}));
                                if(r.ok){setGoogleSyncStatus('ok');setTimeout(()=>setGoogleSyncStatus(null),4000);}
                                else{setGoogleSyncStatus({error:body?.error??`Sync failed (${r.status})`});}
                              }catch(e){setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});}
                            }}
                            disabled={googleSyncStatus==='syncing'}
                            className="w-full py-2 rounded-xl bg-[#111111] text-white text-[12px] font-semibold hover:bg-[#333333] disabled:opacity-50 transition-colors"
                          >
                            {googleSyncStatus==='syncing'?'Syncing…':'Sync hours to Google now'}
                          </button>
                          {googleSyncStatus==='ok'&&(
                            <p className="text-[11px] text-[#166534] text-center font-medium">✓ Synced to Google</p>
                          )}
                          {googleSyncStatus&&typeof googleSyncStatus==='object'&&(
                            <p className="text-[11px] text-[#C4453F] leading-snug">{googleSyncStatus.error}</p>
                          )}
                          <a href="/connect/google" className="inline-flex items-center gap-1.5 text-[11px] text-[#98A2B3] hover:text-[#111111] transition-colors font-medium">
                            Manage connection ↗
                          </a>
                        </>
                      ):(
                        <a href="/connect/google"
                          className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-[#111111] text-white text-[12px] font-semibold hover:bg-[#333333] transition-colors">
                          Connect Google Business
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                {/* Your link */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Your OpenStatus link</p>
                  <div className="rounded-2xl border border-[#E8EBF0] p-4 bg-white">
                    {business?.slug?(
                      <div className="flex items-center gap-3">
                        <code className="text-[13px] font-semibold text-[#111111] bg-[#F4F6FA] px-3 py-2 rounded-xl flex-1 truncate">
                          openstatus.co/{business.slug}
                        </code>
                        <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-full bg-[#111111] text-white text-[12px] font-bold hover:bg-[#333333] transition-colors whitespace-nowrap">
                          Open ↗
                        </a>
                      </div>
                    ):(
                      <p className="text-[13px] text-[#667085]">No link set yet.</p>
                    )}
                  </div>
                </div>
                {/* Account */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-3">Account</p>
                  <div className="rounded-2xl border border-[#E8EBF0] p-4 bg-white space-y-3">
                    <a href="/setup?step=1" className="flex items-center justify-between text-[13px] font-semibold text-[#111111] hover:text-[#667085] transition-colors">
                      <span>Business name & category</span>
                      <LucideChevronRight size={15} color="#98A2B3"/>
                    </a>
                    <div className="border-t border-[#F4F6FA]"/>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#111111]">Analytics</span>
                      <span className="text-[11px] text-[#98A2B3] bg-[#F4F6FA] px-2 py-1 rounded-full">Coming soon</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {sidebarTab==='integrations'&&(
              <div className="p-5 space-y-4">
                <p className="text-[13px] font-bold text-[#0A0A0A]">Integrations</p>
                {/* Google Business Profile card */}
                <div className={`rounded-2xl border p-4 ${googleConnected?'border-[#BBF7D0] bg-[#F0FDF4]':'border-[#DEDEDC] bg-white'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-bold text-[#0A0A0A]">Google Business Profile</p>
                        {googleConnected&&(
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#BBF7D0] text-[#166534] text-[10px] font-bold">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#858585] mt-0.5 leading-relaxed">
                        {googleConnected
                          ? 'Your hours sync to Google automatically whenever you save.'
                          : 'Connect to keep your Google listing hours in sync with this page.'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {googleConnected?(
                      <>
                        <button
                          onClick={async()=>{
                            setGoogleSyncStatus('syncing');
                            const {data:{session}}=await supabase.auth.getSession();
                            if(!session?.access_token){setGoogleSyncStatus({error:'Session expired'});return;}
                            try{
                              const r=await fetch('/api/google/hours',{
                                method:'POST',
                                headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
                                body:JSON.stringify({weeklyHours:config.weeklyHours??DEFAULT_WEEK_HOURS}),
                              });
                              const body=await r.json().catch(()=>({}));
                              if(r.ok){setGoogleSyncStatus('ok');setTimeout(()=>setGoogleSyncStatus(null),4000);}
                              else{setGoogleSyncStatus({error:body?.error??`Sync failed (${r.status})`});}
                            }catch(e){setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});}
                          }}
                          disabled={googleSyncStatus==='syncing'}
                          className="w-full py-2 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-[#292929] disabled:opacity-50 transition-colors"
                        >
                          {googleSyncStatus==='syncing'?'Syncing…':'Sync hours to Google now'}
                        </button>
                        {googleSyncStatus==='ok'&&(
                          <p className="text-[11px] text-[#166534] text-center font-medium">✓ Synced to Google</p>
                        )}
                        {googleSyncStatus&&typeof googleSyncStatus==='object'&&(
                          <p className="text-[11px] text-[#C4453F] leading-snug">{googleSyncStatus.error}</p>
                        )}
                        <a href="/connect/google"
                          className="inline-flex items-center gap-1.5 text-[11px] text-[#858585] hover:text-[#0A0A0A] transition-colors font-medium">
                          Manage connection ↗
                        </a>
                      </>
                    ):(
                      <a href="/connect/google"
                        className="inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-[#292929] transition-colors">
                        Connect Google Business
                      </a>
                    )}
                  </div>
                </div>
                {/* More integrations coming soon */}
                <p className="text-[11px] text-[#C0C0C0] text-center pt-2">More integrations coming soon</p>
              </div>
            )}
          </div>

          {/* ── RIGHT PREVIEW PANEL (desktop only) ── */}
          {/* Drag-to-resize handle */}
          <div
            onMouseDown={onResizeStart}
            className="hidden md:flex w-1.5 flex-shrink-0 cursor-col-resize hover:bg-white/10 active:bg-white/20 transition-colors border-l border-[#DEDEDC] group"
            title="Drag to resize preview"
          >
            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-0.5 h-10 rounded-full bg-white/30" />
            </div>
          </div>
          <div className="hidden md:flex flex-shrink-0 flex-col bg-[#F7F7F5]" style={{width:previewWidth}}>
            {/* Toggle bar */}
            <div className="h-14 border-b border-black/6 flex items-center justify-between px-4 flex-shrink-0 bg-white/80 backdrop-blur-sm">
              <div className="flex items-center gap-0.5 bg-black/5 rounded-full p-0.5">
                <button onClick={()=>setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${previewMode==='mobile'?'bg-white text-[#111] shadow-sm':'text-[#858585] hover:text-[#111]'}`}>
                  <IconSmartphone size={11}/> Mobile
                </button>
                <button onClick={()=>setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${previewMode==='desktop'?'bg-white text-[#111] shadow-sm':'text-[#858585] hover:text-[#111]'}`}>
                  <IconMonitor size={11}/> Desktop
                </button>
              </div>
              {business?.slug&&(
                <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[#858585] hover:text-[#111] transition-colors font-medium whitespace-nowrap">
                  Open ↗
                </a>
              )}
            </div>
            {/* Phone / Desktop preview */}
            <div data-tut="tut-preview" className="flex-1 flex items-start justify-center py-6 overflow-y-auto">
              {previewMode==='desktop'?(
                <div className="w-full h-full flex flex-col">
                  {/* Browser chrome */}
                  <div className="flex-shrink-0 bg-[#F0F0F0] border-b border-[#DEDEDE] px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57]"/>
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"/>
                      <div className="w-3 h-3 rounded-full bg-[#28CA41]"/>
                    </div>
                    <div className="flex-1 bg-white rounded-md px-3 py-1 text-[11px] text-[#888] font-medium border border-[#DEDEDE] truncate">
                      openstatus.co/{business?.slug||'your-page'}
                    </div>
                  </div>
                  {/* Live desktop preview */}
                  <div className="flex-1 overflow-y-auto">
                    <LiveDesktopPreview business={localBusiness} config={config}/>
                  </div>
                </div>
              ):(
                <LivePhonePreview
                  business={localBusiness} config={config}
                  selectedId={openId}
                  onSelectBlock={id=>{setOpenId(id);setSidebarTab('design');}}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
           MOBILE LAYOUT  (hidden on md+)
           ══════════════════════════════════════════════════════════ */}

      {/* Mobile dark top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D0D] flex items-center justify-between px-4 gap-3"
        style={{display:isMobile?"flex":"none",height:'calc(52px + env(safe-area-inset-top))',paddingTop:'env(safe-area-inset-top)'}}>
        <span className="text-white font-bold text-[17px] tracking-[-0.03em]" style={{fontFamily:"'Poppins',system-ui,sans-serif"}}>OpenStatus</span>
        <div className="flex items-center gap-2">
          {business?.slug&&(
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1 rounded-full border border-white/25 text-white text-[12px] font-semibold flex items-center gap-1" style={{color:"white"}}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </a>
          )}
          <button onClick={save} disabled={saving}
            className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${saved?'bg-emerald-400 text-white':saving?'bg-white/20 text-white/60':'bg-white text-[#0D0D0D]'}`}>
            {saving?'Saving…':saved?'✓ Saved':'Publish'}
          </button>
        </div>
      </div>

      {/* Mobile canvas — phone IS the editing surface, Canva-style */}
      <div className="fixed left-0 right-0 bg-[#ECEEF2] overflow-y-auto"
        style={{
          display:isMobile?"block":"none",
          top:'calc(52px + env(safe-area-inset-top))',
          bottom: mobileSheetOpen
            ? 'calc(52vh + 56px + env(safe-area-inset-bottom))'
            : 'calc(56px + env(safe-area-inset-bottom))',
          transition:'bottom 0.3s cubic-bezier(0.32,0.72,0,1)',
        }}>
        {/* Dotted background like Canva */}
        <div className="min-h-full flex items-start justify-center py-3 px-2"
          style={{backgroundImage:'radial-gradient(circle,#C8CBD2 1px,transparent 1px)',backgroundSize:'20px 20px'}}>
          {/* Phone page — no phone frame, just the scrollable content card */}
          <div className="w-full rounded-[24px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
            onClick={()=>{ if(mobileSheetOpen) setMobileSheetOpen(false); }}>
            <LivePhonePreview business={localBusiness} config={config} selectedId={openId}
              onSelectBlock={id=>{setOpenId(id);setSidebarTab('design');setMobileSheetOpen(true);}}/>
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="fixed left-0 right-0 z-30 bg-white rounded-t-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden"
        style={{display:isMobile?"flex":"none",bottom:'calc(56px + env(safe-area-inset-bottom))',height:'52vh',transform:mobileSheetOpen?'translateY(0)':'translateY(110%)',transition:'transform 0.3s cubic-bezier(0.32,0.72,0,1)'}}>

        {/* Close button — tap to dismiss sheet */}
        <button onClick={()=>setMobileSheetOpen(false)}
          className="flex-shrink-0 flex items-center justify-center w-full pt-3 pb-2 active:opacity-60"
          aria-label="Close panel">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F2F5]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            <span className="text-[11px] font-semibold text-[#667085]">Close</span>
          </div>
        </button>

        {/* ── BLOCKS tab content ── */}
        {sidebarTab==='design'&&(
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* If a block is selected, show its edit panel */}
            {openId&&openBlock?(
              <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
                <div className="flex items-center gap-2 pt-1 pb-3 flex-shrink-0">
                  <button onClick={()=>setOpenId(null)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-[#667085] hover:text-[#111] transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                  </button>
                  <span className="text-[14px] font-bold text-[#111]">{openBlock.title||'Edit block'}</span>
                </div>
                <BlockEditPanel
                  block={openBlock} config={config}
                  onUpdateBlock={u=>updateBlock(openBlock.id,u)}
                  onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
                  onClose={()=>setOpenId(null)}
                />
              </div>
            ):(
            <>
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-1 pb-2 flex-shrink-0">
              <div>
                <h2 className="text-[20px] font-bold text-[#111] leading-tight">Add blocks</h2>
                <p className="text-[12px] text-[#667085] mt-0.5">Choose what to show on your page. Drag to reorder.</p>
              </div>
              <button className="w-8 h-8 rounded-full bg-[#F4F6FA] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
            {/* Category pills */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto flex-shrink-0" style={{scrollbarWidth:'none',msOverflowStyle:'none'}}>
              {['All','Essential','Food & Beverage','Engagement','Contact','Social','More'].map(cat=>(
                <button key={cat} onClick={()=>setMobileBlockCat(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${mobileBlockCat===cat?'bg-[#111] text-white':'bg-[#F4F6FA] text-[#667085]'}`}>
                  {cat}
                </button>
              ))}
            </div>
            {/* Block grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
              <div className="grid grid-cols-2 gap-3">
                {(()=>{
                  const catMap: Record<string,string[]> = {
                    'Essential':['hours','location'],
                    'Food & Beverage':['menu','order'],
                    'Engagement':['book','updates'],
                    'Contact':['website'],
                    'More':[],
                  };
                  const showIds = mobileBlockCat==='All'
                    ? DEFAULT_BLOCKS.map(b=>b.id)
                    : (catMap[mobileBlockCat]??[]);
                  return DEFAULT_BLOCKS.filter(b=>showIds.includes(b.id)&&b.id!=='socials').map(def=>{
                    const isOn = allBlocks.find(b=>b.id===def.id)?.on;
                    return (
                      <div key={def.id}
                        className="flex items-center gap-2.5 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0] text-left active:bg-[#F0F2F5] transition-colors">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{backgroundColor:`${def.color}18`,border:`1px solid ${def.color}30`}}>
                          <BlockIcon id={def.id} size={18} color={def.color}/>
                        </div>
                        <button className="flex-1 min-w-0 text-left"
                          onClick={()=>{ if(!isOn){enableBlock(def.id);}else{setOpenId(def.id);} }}>
                          <p className="text-[11px] font-semibold text-[#111] leading-tight truncate">{def.title}</p>
                          <p className="text-[10px] text-[#667085] leading-tight mt-0.5 truncate">{isOn?'Tap to edit':'Tap to add'}</p>
                        </button>
                        <button
                          onClick={e=>{e.stopPropagation();if(isOn){updateBlock(def.id,{on:false});}else{enableBlock(def.id);}}}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${isOn?'bg-[#111] border-[#111]':'border-[#D0D5DD]'}`}>
                          {isOn
                            ?<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            :<span className="text-[14px] leading-none text-[#98A2B3]">+</span>
                          }
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* ── BUSINESS tab content ── */}
        {sidebarTab==='business'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-bold text-[#111] pt-1 pb-3">Business</h2>

            {/* Google Business sync */}
            <div className="mb-3 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <p className="text-[12px] font-bold text-[#111]">Google Business</p>
                {googleFetchDone&&<span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Imported</span>}
              </div>
              <p className="text-[11px] text-[#858585] mb-2">Paste your Google Maps URL to auto-fill hours, rating, photos & location.</p>
              <div className="flex gap-2">
                <input type="url" value={googleFetchUrl||allBlocks.find(b=>b.id==='location')?.googleUrl||''}
                  onChange={e=>{setGoogleFetchUrl(e.target.value);setGoogleFetchDone(false);setGoogleFetchError('');}}
                  placeholder="https://maps.google.com/…"
                  className="flex-1 rounded-xl border border-[#DEDEDC] bg-white px-3 py-2 text-[11px] outline-none focus:border-[#0A0A0A] transition-colors min-w-0"/>
                <button
                  disabled={(!googleFetchUrl&&!allBlocks.find(b=>b.id==='location')?.googleUrl)||googleFetching}
                  onClick={async()=>{
                    const url=googleFetchUrl||allBlocks.find(b=>b.id==='location')?.googleUrl||'';
                    if(!url)return;
                    setGoogleFetching(true);setGoogleFetchError('');setGoogleFetchDone(false);
                    try{
                      const r=await fetch(`/api/google/rating?url=${encodeURIComponent(url)}`);
                      const d=await r.json() as {rating?:number;reviewCount?:number;name?:string;error?:string;address?:string;phone?:string;website?:string;weeklyHours?:WeeklyHours;photoUrl?:string;photos?:string[];lat?:number;lng?:number;reviews?:Array<{author:string;rating:number;text:string;time:string}>};
                      if(!r.ok||d.error)throw new Error(d.error??'Failed');
                      updateBlock('location',{googleUrl:url,reviewStars:d.rating,reviewCount:d.reviewCount,sub:d.address??d.name??allBlocks.find(b=>b.id==='location')?.sub??'',...(d.lat!==undefined?{lat:d.lat,lng:d.lng}:{}),...(d.reviews?{reviews:d.reviews}:{}),...(d.photoUrl?{coverPhoto:d.photoUrl}:{})});
                      if(d.weeklyHours) setConfig(c=>({...c,weeklyHours:d.weeklyHours as WeeklyHours}));
                      if(d.photoUrl) setConfig(c=>({...c,bgImage:d.photoUrl}));
                      if(d.photos?.length) setGooglePhotos(d.photos);
                      if(d.phone&&allBlocks.find(b=>b.id==='call')) updateBlock('call',{url:'tel:'+d.phone,on:true});
                      if(d.website&&allBlocks.find(b=>b.id==='website')) updateBlock('website',{url:d.website,on:true});
                      setGoogleFetchDone(true);
                    }catch(e){setGoogleFetchError(e instanceof Error?e.message:'Could not fetch');}
                    finally{setGoogleFetching(false);}
                  }}
                  className="flex-shrink-0 rounded-xl bg-[#0A0A0A] text-white text-[11px] font-bold px-3 py-2 hover:bg-[#292929] transition-colors disabled:opacity-40">
                  {googleFetching?'…':'Sync'}
                </button>
              </div>
              {googleFetchError&&<p className="text-[11px] text-red-500 mt-1">{googleFetchError}</p>}
            </div>

            {/* Hours & Status */}
            <div className="mb-3 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-[#111]">Hours & Status</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${liveStatus==='open'?'bg-emerald-100 text-emerald-700':'bg-[#F4F6FA] text-[#667085]'}`}>
                  {liveStatus==='open'?'● Open now':'● Closed'}
                </span>
              </div>
              <p className="text-[12px] text-[#667085] mb-2">{todayLabel}</p>
              <button onClick={()=>setSidebarTab('hours' as SidebarTab)}
                className="text-[12px] font-semibold text-[#667085] hover:text-[#111] underline underline-offset-2">
                Edit hours →
              </button>
            </div>

            {/* Social Profiles */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Social Profiles</p>
            <div className="space-y-2 mb-3">
              {[
                {key:'instagram', label:'Instagram', placeholder:'@username or full URL'},
                {key:'tiktok',    label:'TikTok',    placeholder:'@username or full URL'},
                {key:'facebook',  label:'Facebook',  placeholder:'Page URL'},
                {key:'twitter',   label:'Twitter / X',placeholder:'@username or full URL'},
                {key:'youtube',   label:'YouTube',   placeholder:'Channel URL'},
              ].map(({key,label,placeholder})=>(
                <div key={key} className="flex items-center gap-2 bg-[#F9FAFB] rounded-xl border border-[#E8EBF0] px-3 py-2">
                  <span className="text-[11px] font-semibold text-[#667085] w-20 flex-shrink-0">{label}</span>
                  <input value={(config.socials??{})[key]??''}
                    onChange={e=>setConfig(c=>({...c,socials:{...(c.socials??{}),[key]:e.target.value}}))}
                    placeholder={placeholder}
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
              ))}
            </div>

            {/* Account link */}
            <a href="/setup?step=1" className="flex items-center gap-3 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <div className="w-9 h-9 rounded-xl bg-[#E8EBF0] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-[#111]">Business Profile</p>
                <p className="text-[10px] text-[#667085]">Name, address, phone & category</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        )}

        {/* ── HOURS tab (accessible from Business → Edit hours) ── */}
        {sidebarTab==='hours'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
            <div className="flex items-center gap-2 pt-1 pb-3">
              <button onClick={()=>setSidebarTab('business')}
                className="w-7 h-7 rounded-full bg-[#F4F6FA] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="text-[18px] font-bold text-[#111]">Hours</h2>
            </div>
            <div className="rounded-2xl border border-[#E8EBF0] overflow-hidden bg-white">
              {DAYS.map(({key,label},i)=><HoursRow key={key} dayKey={key} label={label} idx={i}/>)}
            </div>
          </div>
        )}

        {/* ── PHOTOS tab ── */}
        {sidebarTab==='photos'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-bold text-[#111] pt-1 pb-1">Photos</h2>
            <p className="text-[11px] text-[#98A2B3] mb-4">Upload photos for your page and each active widget</p>

            {/* ── Page-level photos ── */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Page</p>

            {/* Logo */}
            <div className="mb-3 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <p className="text-[11px] font-semibold text-[#111] mb-2">Logo</p>
              <div className="flex items-center gap-3">
                {localBusiness?.avatar_url
                  ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                    className="w-12 h-12 rounded-full object-cover border border-[#E8EBF0] flex-shrink-0" alt="Logo"/>
                  :<div className="w-12 h-12 rounded-full bg-[#E8EBF0] flex items-center justify-center flex-shrink-0"><LucideImage size={18} color="#98A2B3"/></div>
                }
                <label className={`cursor-pointer flex-1 ${logoUploading?'pointer-events-none':''}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const file=e.target.files?.[0];if(!file)return;
                    setLogoUploading(true);setLogoUploadError('');
                    try{
                      const ref=await uploadAsset(file,'avatar');
                      if(localBusiness?.id){
                        await supabase.from('businesses').update({avatar_url:ref}).eq('id',localBusiness.id);
                        setLocalBusiness(b=>b?{...b,avatar_url:ref}:b);
                      }
                    }catch(err){setLogoUploadError(err instanceof Error?err.message:'Upload failed');}
                    finally{setLogoUploading(false);e.target.value='';}
                  }}/>
                  <span className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E8EBF0] text-[12px] font-semibold text-[#111] w-fit ${logoUploading?'opacity-60':''}`}>
                    <LucideImage size={13} color="#667085"/>
                    {logoUploading?'Uploading…':'Change logo'}
                  </span>
                </label>
              </div>
              {logoUploadError&&<p className="text-[11px] text-red-500 mt-1">{logoUploadError}</p>}
            </div>

            {/* Cover / background */}
            <div className="mb-4 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <p className="text-[11px] font-semibold text-[#111] mb-2">Cover Photo</p>
              <label className={`cursor-pointer block ${bgUploading?'pointer-events-none':''}`}>
                <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                  const file=e.target.files?.[0];if(!file)return;
                  setBgUploading(true);setBgUploadError('');
                  try{
                    const ref=await uploadAsset(file,'header');
                    setConfig(c=>({...c,bgImage:ref}));
                  }catch(err){setBgUploadError(err instanceof Error?err.message:'Upload failed');}
                  finally{setBgUploading(false);e.target.value='';}
                }}/>
                <div className="h-20 rounded-xl border border-[#E8EBF0] overflow-hidden relative">
                  {config.bgImage
                    ?<img src={config.bgImage.startsWith('storage:')&&localBusiness?.id?`/api/assets?businessId=${localBusiness.id}&kind=header`:config.bgImage}
                       className="w-full h-full object-cover" alt="Cover"/>
                    :<div className="w-full h-full bg-[#F0F2F5] flex flex-col items-center justify-center gap-1">
                      <LucideImage size={20} color="#98A2B3"/>
                      <span className="text-[11px] font-semibold text-[#667085]">{bgUploading?'Uploading…':'Tap to upload'}</span>
                    </div>
                  }
                  {config.bgImage&&<div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white bg-black/40 px-3 py-1 rounded-full">{bgUploading?'Uploading…':'Change'}</span>
                  </div>}
                </div>
              </label>
              {bgUploadError&&<p className="text-[11px] text-red-500 mt-1">{bgUploadError}</p>}
            </div>

            {/* Google photos pool */}
            {googlePhotos.length>0&&(
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">From Google</p>
                <div className="grid grid-cols-3 gap-2">
                  {googlePhotos.slice(0,6).map((url,i)=>(
                    <button key={i} onClick={()=>setConfig(c=>({...c,bgImage:url}))}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${config.bgImage===url?'border-[#111]':'border-transparent'}`}>
                      <img src={url} className="w-full h-full object-cover" alt="Google photo"/>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Per-block photos ── */}
            {(()=>{
              const photoBlocks = activeBlocks.filter(b=>['location','menu','order','book','socials','website'].includes(b.id));
              if(photoBlocks.length===0) return null;
              return (
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2 mt-2">Widgets</p>
                  <div className="space-y-3">
                    {photoBlocks.map(blk=>{
                      const def = DEFAULT_BLOCKS.find(d=>d.id===blk.id);
                      const photoLabel = blk.id==='location' ? 'Place photo' : 'Cover photo';
                      const hint = blk.id==='location' ? 'Storefront or place photo' :
                                   blk.id==='menu'     ? 'Banner at top of menu' :
                                   blk.id==='socials'  ? 'Photo behind social links' : '';
                      return (
                        <div key={blk.id} className="p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{backgroundColor:`${def?.color??'#111'}18`}}>
                              <BlockIcon id={blk.id} size={14} color={def?.color??'#111'}/>
                            </div>
                            <p className="text-[11px] font-semibold text-[#111]">{blk.title??def?.title}</p>
                          </div>
                          <label className="cursor-pointer block">
                            <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                              const file=e.target.files?.[0]; if(!file) return;
                              const reader=new FileReader();
                              reader.onload=ev=>{ if(ev.target?.result) updateBlock(blk.id,{coverPhoto:ev.target.result as string}); };
                              reader.readAsDataURL(file);
                              e.target.value='';
                            }}/>
                            <div className="h-16 rounded-xl border border-[#E8EBF0] overflow-hidden relative">
                              {blk.coverPhoto
                                ?<img src={blk.coverPhoto} className="w-full h-full object-cover" alt=""/>
                                :<div className="w-full h-full bg-[#F0F2F5] flex items-center justify-center gap-2">
                                  <LucideImage size={16} color="#98A2B3"/>
                                  <span className="text-[11px] text-[#98A2B3]">{hint||photoLabel} — tap to upload</span>
                                </div>
                              }
                              {blk.coverPhoto&&<div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full">Change</span>
                              </div>}
                            </div>
                          </label>
                          {blk.coverPhoto&&(
                            <button onClick={()=>updateBlock(blk.id,{coverPhoto:''})}
                              className="mt-1.5 text-[10px] text-[#98A2B3] hover:text-red-500 transition-colors">
                              Remove photo
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ── STYLE tab ── */}
        {sidebarTab==='style'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-bold text-[#111] pt-1 pb-3">Style</h2>

            {/* Font picker */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Business Name Font</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {FONT_OPTIONS.map(opt=>{
                const isActive = (config.font??FONT_OPTIONS[0].family)===opt.family;
                return (
                  <button key={opt.family}
                    onClick={()=>setConfig(c=>({...c,font:opt.family}))}
                    className={`flex flex-col items-start px-3 py-2.5 rounded-2xl border transition-all text-left active:scale-95 ${isActive?'border-[#111] bg-[#111]':'border-[#E8EBF0] bg-[#F9FAFB]'}`}>
                    <span className={`text-[16px] leading-tight ${isActive?'text-white':'text-[#111]'}`}
                      style={{fontFamily:opt.family}}>Aa</span>
                    <span className={`text-[10px] font-semibold mt-0.5 ${isActive?'text-white/70':'text-[#98A2B3]'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Page color */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Page Color</p>
            <div className="flex items-center gap-2 mb-4">
              {['#FFAB40','#f8f5f0','#E8F5E9','#E3F2FD','#FCE4EC','#F3E5F5','#FFF8E1','#ECEFF1'].map(c=>(
                <button key={c} onClick={()=>setConfig(p=>({...p,bg:c}))}
                  className={`w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 ${config.bg===c?'border-[#111] scale-110':'border-transparent'}`}
                  style={{backgroundColor:c}}/>
              ))}
              <input type="color" value={config.bg} onChange={e=>setConfig(p=>({...p,bg:e.target.value}))}
                className="w-8 h-8 rounded-full cursor-pointer border border-[#E8EBF0] overflow-hidden p-0 flex-shrink-0"
                title="Custom color"/>
            </div>
            {/* Social links */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2 mt-4">Social Profiles</p>
            <div className="space-y-2">
              {[
                {key:'instagram', label:'Instagram', placeholder:'@username or full URL'},
                {key:'tiktok',    label:'TikTok',    placeholder:'@username or full URL'},
                {key:'facebook',  label:'Facebook',  placeholder:'Page URL'},
                {key:'twitter',   label:'Twitter / X',placeholder:'@username or full URL'},
                {key:'youtube',   label:'YouTube',   placeholder:'Channel URL'},
              ].map(({key,label,placeholder})=>(
                <div key={key} className="flex items-center gap-2 bg-[#F9FAFB] rounded-xl border border-[#E8EBF0] px-3 py-2">
                  <span className="text-[11px] font-semibold text-[#667085] w-20 flex-shrink-0">{label}</span>
                  <input value={(config.socials??{})[key]??''}
                    onChange={e=>setConfig(c=>({...c,socials:{...(c.socials??{}),[key]:e.target.value}}))}
                    placeholder={placeholder}
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS tab ── */}
        {sidebarTab==='settings'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-4" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-bold text-[#111] pt-1 pb-3">Settings</h2>
            {/* Your link */}
            {business?.slug&&(
              <div className="mb-4 p-4 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
                <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-1">Your Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[#111] flex-1 truncate">openstatus.co/{business.slug}</p>
                  <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#667085] hover:text-[#111] flex items-center gap-1">
                    Open ↗
                  </a>
                </div>
              </div>
            )}
            {/* Google Business */}
            {googleConnected&&(
              <div className="mb-4 p-4 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
                <div className="flex items-center gap-2 mb-1">
                  <svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  <p className="text-[12px] font-bold text-[#111]">Google Business Connected</p>
                </div>
                <p className="text-[11px] text-[#667085]">Hours sync to your Google profile when you save.</p>
              </div>
            )}
            {/* Account */}
            <a href="/setup?step=1" className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <div className="w-10 h-10 rounded-xl bg-[#E8EBF0] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#111]">Account Settings</p>
                <p className="text-[11px] text-[#667085]">Manage your profile and preferences</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        )}

      </div>{/* end bottom sheet */}

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8EBF0] flex items-stretch"
        style={{display:isMobile?"flex":"none", paddingBottom:'env(safe-area-inset-bottom)', height:'calc(56px + env(safe-area-inset-bottom))' }}>
        {SIDEBAR_NAV.map(({key,label,icon})=>(
          <button key={key} onClick={()=>{if(sidebarTab===key&&mobileSheetOpen){setMobileSheetOpen(false);}else{setSidebarTab(key);setMobileSheetOpen(true);}}}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 transition-colors`}>
            {/* Active tab background bubble */}
            {sidebarTab===key&&(
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-7 rounded-xl bg-[#F0F2F5]"/>
            )}
            <span className="relative z-10" style={{color:sidebarTab===key?'#111111':'#98A2B3'}}>
              {icon}
            </span>
            <span className={`text-[9px] font-semibold leading-none relative z-10 ${sidebarTab===key?'text-[#111111]':'text-[#98A2B3]'}`}>
              {label}
            </span>
          </button>
        ))}
      </nav>

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
                :quickAction==='open-today'?'Open Today'
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
              {quickAction==='open-today'&&(
                <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-3">
                  <p className="text-[13px] font-semibold text-[#166534]">This will restore your regular hours for today and mark you as open.</p>
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
                onClick={async ()=>{
                  const todayKey=(['sun','mon','tue','wed','thu','fri','sat'] as WeekDay[])[new Date().getDay()];
                  let updatedHours: WeeklyHours | undefined;
                  if(quickAction==='close-early'){
                    updatedHours={...(hours??DEFAULT_WEEK_HOURS),[todayKey]:{...hours[todayKey],close:closeEarlyTime}};
                  } else if(quickAction==='close-today'){
                    updatedHours={...(hours??DEFAULT_WEEK_HOURS),[todayKey]:{...hours[todayKey],closed:true}};
                  } else if(quickAction==='open-today'){
                    // Restore regular hours — use default 9-5 if no previous hours set
                    updatedHours={...(hours??DEFAULT_WEEK_HOURS),[todayKey]:{...hours[todayKey],closed:false}};
                  }
                  setQuickAction(null);
                  if(!updatedHours) return;
                  // Update local state
                  const gh=updatedHours;
                  setConfig(c=>({...c,weeklyHours:gh}));
                  // Save to Supabase immediately so OpenStatus page updates
                  setSaving(true);
                  const newConfig={...config,weeklyHours:gh};
                  const {error}=await supabase.auth.updateUser({data:{openstatus_page:newConfig}});
                  setSaving(false);
                  if(!error){setSaved(true);setTimeout(()=>setSaved(false),2500);}
                  // Push to Google if connected
                  if(googleConnected){
                    setGoogleSyncStatus('syncing');
                    supabase.auth.getSession().then(async ({data:{session}})=>{
                      if(!session?.access_token){setGoogleSyncStatus({error:'Session expired'});return;}
                      try{
                        const r=await fetch('/api/google/hours',{
                          method:'POST',
                          headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
                          body:JSON.stringify({weeklyHours:gh}),
                        });
                        const body=await r.json().catch(()=>({}));
                        if(r.ok){setGoogleSyncStatus('ok');setTimeout(()=>setGoogleSyncStatus(null),4000);}
                        else{setGoogleSyncStatus({error:body?.error??`Google sync failed (${r.status})`});}
                      }catch(e){setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});}
                    }).catch(e=>{setGoogleSyncStatus({error:e instanceof Error?e.message:'Session error'});});
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-[#0A0A0A] text-white text-[13px] font-bold hover:bg-[#292929] transition-colors">
                {quickAction==='open-today'?'Open & Sync to Google'
                :googleConnected?'Update & Sync to Google'
                :'Update Hours'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial overlay */}
      {showTutorial&&!showPicker&&(
        <TutorialOverlay onDone={()=>{setShowTutorial(false);try{localStorage.setItem('os_tutorial_done','1')}catch{}}}/>
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
