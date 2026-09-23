'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SITE_DOMAIN, SITE_URL } from '@/lib/site';
import { BG_KEYFRAMES, bgAnimationStyle, isDarkBg, solidBg, surfaceTokens } from '@/lib/page-theme';
import { getBusinessStatus, applyOverride, type TodayOverride, type WeeklySchedule } from '@/lib/business-status';
import { CATEGORIES, normalizeCategory } from '@/lib/categories';
import { savePageConfig } from '@/lib/page-config-store';

// ── types ──────────────────────────────────────────────────────────────────────
type Tone = 'default' | 'muted' | 'accent';
// Block sizes, in the 2-column preview grid:
//   half   → one column, compact row        (too small for a photo)
//   square → one column, 1:1                (photo-friendly)
//   full   → both columns, wide rectangle   (photo-friendly)
//   third  → legacy value from setup; treated as half
type BlockSize = 'half' | 'square' | 'full' | 'third';
// Photos only look right in the bigger blocks — a cover image in a compact row
// is an unreadable sliver, so we gate the control rather than let it look broken.
// Close-before-open saved silently with a "Saved" confirmation, so a shop could
// publish 8 AM – 6 AM without any warning. Overnight spans are real (bars, late
// kitchens), so this flags rather than blocks, and the copy says which is which.
function hoursRowInvalid(d?: { open:string; close:string; closed:boolean }): boolean {
  if (!d || d.closed) return false;
  const toMin = (t:string) => { const [h,m] = (t||'').split(':').map(Number); return (h||0)*60 + (m||0); };
  return toMin(d.close) <= toMin(d.open);
}

function blockAllowsPhoto(size?: BlockSize) { return size !== 'half' && size !== 'third'; }
// These blocks are their own content — they don't need a link to be useful.
const SELF_CONTAINED_BLOCKS = new Set(['hours','location','updates','gallery','socials']);
// A block with no destination is excluded from the published page, so the
// builder has to say so rather than letting the owner think it went live.
function blockNeedsSetup(b: OpenStatusBlock) {
  if (SELF_CONTAINED_BLOCKS.has(b.id)) return false;
  return !(b.url && b.url.trim()) && !(b.menuFile && b.menuFile.trim());
}
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
  titleBold?: boolean; titleItalic?: boolean;
  subBold?: boolean; subItalic?: boolean;
  address?: string;
  lat?: number;
  lng?: number;
  reviews?: Array<{author:string;rating:number;text:string;time:string}>;
  _googleFetching?: boolean; _googleError?: string;
}
export interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[]; bg: string; bgImage?: string; bgImagePosition?: string;
  socials: Record<string, string>;
  location?: string; tags?: string[]; weeklyHours?: WeeklyHours;
  likeCount?: number; dislikeCount?: number;
  themeColor?: string; placeId?: string; nameColor?: string;
  bgAnim?: string; bgAnimSpeed?: number;
  font?: string;
}
export interface Business {
  id: string; name: string; slug: string;
  avatar_url?: string; tagline?: string; category?: string | null;
  phone?: string | null; website?: string | null; address?: string | null;
  /** IANA zone, e.g. "America/New_York". Every open/closed decision uses it. */
  timezone?: string | null;
}

// ── constants ──────────────────────────────────────────────────────────────────
// Full-spectrum swatch row — the "rainbow palette"
const BG_RAINBOW = [
  '#FFFFFF','#F7F7F5','#E7E5E4','#9CA3AF','#3F3F46','#0A0A0A',
  '#FECACA','#FDBA74','#FDE68A','#BBF7D0','#A5F3FC','#BFDBFE','#DDD6FE','#FBCFE8',
  '#EF4444','#F97316','#F59E0B','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899',
];
// Designed backgrounds. Any CSS `background` value works, including multi-layer
// patterns. `anim` names a keyframe from BG_KEYFRAMES below; animated designs
// keep a FLAT base (linear-gradient(c,c)) so scrolling the layers doesn't drag
// a visible gradient around with them.
const BG_DESIGNS: { label:string; css:string; anim?:'drift'|'fall'|'rise'; speed?:number }[] = [
  // ── gradients ──
  { label:'Sunset',   css:'linear-gradient(160deg,#FF9A5A 0%,#FF5F6D 55%,#C13584 100%)' },
  { label:'Peach',    css:'linear-gradient(160deg,#FFE9D6 0%,#FFC3A0 100%)' },
  { label:'Lagoon',   css:'linear-gradient(160deg,#43C6AC 0%,#191654 100%)' },
  { label:'Sky',      css:'linear-gradient(160deg,#E3F2FF 0%,#A8D8FF 100%)' },
  { label:'Mint',     css:'linear-gradient(160deg,#E8F9F1 0%,#B8E9D0 100%)' },
  { label:'Lilac',    css:'linear-gradient(160deg,#F3E7FF 0%,#C4A5FF 100%)' },
  { label:'Ember',    css:'linear-gradient(160deg,#2B1B17 0%,#7A2E1E 100%)' },
  { label:'Midnight', css:'linear-gradient(160deg,#0F172A 0%,#334155 100%)' },

  // ── patterns ──
  { label:'Dots',     css:'radial-gradient(#D6D3D1 1px,transparent 1px) 0 0/16px 16px,linear-gradient(#FAFAF9,#FAFAF9)' },
  { label:'Grid',     css:'linear-gradient(#EAEAE8 1px,transparent 1px) 0 0/22px 22px,linear-gradient(90deg,#EAEAE8 1px,transparent 1px) 0 0/22px 22px,linear-gradient(#FBFBFA,#FBFBFA)' },
  { label:'Confetti', css:'radial-gradient(4px 4px at 20% 25%,#FCA5A5,transparent),radial-gradient(4px 4px at 70% 15%,#FDE68A,transparent),radial-gradient(4px 4px at 40% 60%,#A7F3D0,transparent),radial-gradient(4px 4px at 85% 55%,#BFDBFE,transparent),radial-gradient(4px 4px at 15% 80%,#DDD6FE,transparent),linear-gradient(#FFFDF8,#FFFDF8)' },
  { label:'Waves',    css:'repeating-radial-gradient(circle at 50% 120%,rgba(255,255,255,0.5) 0 12px,transparent 12px 26px),linear-gradient(160deg,#BFE7FF 0%,#7FC5F5 100%)' },

  // ── animated ──
  { label:'Starry',   anim:'drift', speed:90,
    css:'radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1.5px 1.5px at 62% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 32% 46%,#fff,transparent),radial-gradient(2px 2px at 82% 38%,#fff,transparent),radial-gradient(1.5px 1.5px at 48% 72%,#fff,transparent),radial-gradient(1.5px 1.5px at 88% 82%,#fff,transparent),radial-gradient(1.5px 1.5px at 18% 88%,#fff,transparent),linear-gradient(160deg,#0B1026,#1B2455)' },
  { label:'Snowfall', anim:'fall', speed:26,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Ccircle cx='15' cy='20' r='2.2' fill='white' opacity='.9'/%3E%3Ccircle cx='62' cy='44' r='1.7' fill='white' opacity='.75'/%3E%3Ccircle cx='38' cy='72' r='2' fill='white' opacity='.85'/%3E%3Ccircle cx='80' cy='12' r='1.4' fill='white' opacity='.7'/%3E%3C/svg%3E\") 0 0/90px 90px,linear-gradient(#3F5E8C,#3F5E8C)" },
  { label:'Coffee',   anim:'drift', speed:60,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ctext x='8' y='34' font-size='26'%3E%E2%98%95%3C/text%3E%3Ctext x='46' y='70' font-size='20' opacity='.75'%3E%E2%98%95%3C/text%3E%3C/svg%3E\") 0 0/80px 80px,linear-gradient(#F5EADA,#F5EADA)" },
  { label:'Sparkle',  anim:'rise', speed:34,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Ctext x='6' y='26' font-size='16' opacity='.85'%3E%E2%9C%A6%3C/text%3E%3Ctext x='44' y='58' font-size='12' opacity='.6'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E\") 0 0/70px 70px,linear-gradient(#2E1065,#2E1065)" },
  { label:'Hearts',   anim:'rise', speed:40,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Ctext x='8' y='30' font-size='20' opacity='.8'%3E%F0%9F%A4%8D%3C/text%3E%3Ctext x='46' y='64' font-size='15' opacity='.6'%3E%F0%9F%A4%8D%3C/text%3E%3C/svg%3E\") 0 0/76px 76px,linear-gradient(#FFE9EF,#FFE9EF)" },
  { label:'Bubbles',  anim:'rise', speed:30,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84'%3E%3Ccircle cx='18' cy='24' r='7' fill='none' stroke='white' stroke-opacity='.45' stroke-width='1.5'/%3E%3Ccircle cx='58' cy='56' r='4.5' fill='none' stroke='white' stroke-opacity='.4' stroke-width='1.3'/%3E%3Ccircle cx='70' cy='18' r='3' fill='none' stroke='white' stroke-opacity='.35' stroke-width='1.2'/%3E%3C/svg%3E\") 0 0/84px 84px,linear-gradient(#0E7490,#0E7490)" },
];

// config.bg may be a gradient/pattern. Anywhere we need a SOLID colour (e.g. to


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
  location: [{ key:'place',   label:'Map'     }, { key:'minimal', label:'Minimal' }],
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
];

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt12(t: string) {
  const [h,m] = t.split(':').map(Number);
  const ap = h>=12?'PM':'AM', hr=h%12||12;
  return m===0?`${hr} ${ap}`:`${hr}:${m.toString().padStart(2,'0')} ${ap}`;
}
/**
 * Preview status. Delegates to the shared engine so the builder and the public
 * page cannot disagree, and takes the business timezone rather than the clock
 * of whoever happens to be editing.
 */
function getLiveStatus(
  hours?: WeeklyHours,
  timeZone?: string|null,
  override?: TodayOverride,
): { status:'open'|'closed'; todayLabel:string } {
  if (!hours) return { status:'closed', todayLabel:'Set your hours' };
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  const s = applyOverride(getBusinessStatus(new Date(), tz, hours as WeeklySchedule), override);
  const keys: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const today = hours[keys[s.dayIndex]];
  if (override?.kind === 'closed') return { status:'closed', todayLabel:'Closed today' };
  if (!today || today.closed) return { status:'closed', todayLabel:'Closed today' };
  const closeLabel = override?.closesAt ? fmt12(override.closesAt) : fmt12(today.close);
  const openLabel  = override?.opensAt  ? fmt12(override.opensAt)  : fmt12(today.open);
  return {
    status: s.state==='open' ? 'open' : 'closed',
    todayLabel: `Today ${openLabel} – ${closeLabel}`,
  };
}
function starsToPercent(stars: number) { return Math.round((stars/5)*100); }

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string,unknown>;
  const isEmpty = !raw || (typeof raw==='object' && Object.keys(raw as object).length===0);
  const saved = Array.isArray(r.blocks) ? r.blocks as OpenStatusBlock[] : [];
  // When nothing has been configured yet, default to orange bg + all blocks on
  // Built-ins are merged onto their defaults. Custom links (id "custom-…") have
  // no default to merge with, and the old map dropped them entirely — they have
  // to be carried through or they vanish on reload. Their saved order is kept.
  const merged = DEFAULT_BLOCKS.map(def => { const f=saved.find(b=>b.id===def.id); return f?{...def,...f}:{...def}; });
  const customs = saved.filter(b=>typeof b.id==='string' && b.id.startsWith('custom-'));
  const byId = new Map<string,OpenStatusBlock>([...merged,...customs].map(b=>[b.id,b]));
  const savedOrder = saved.map(b=>b.id).filter(id=>byId.has(id));
  const ordered = [
    ...savedOrder.map(id=>byId.get(id)!),
    ...merged.filter(b=>!savedOrder.includes(b.id)),
  ];
  const defaultBlocks = isEmpty
    ? DEFAULT_BLOCKS.map(b=>({...b,on:true}))
    : ordered;
  return {
    blocks:       defaultBlocks,
    bg:           typeof r.bg==='string'?r.bg:(isEmpty?'#FFAB40':'#f8f5f0'),
    bgImage:      typeof r.bgImage==='string'?r.bgImage:undefined,
    bgImagePosition: typeof r.bgImagePosition==='string'?r.bgImagePosition:undefined,
    socials:      (r.socials&&typeof r.socials==='object')?r.socials as Record<string,string>:{},
    location:     typeof r.location==='string'?r.location:undefined,
    tags:         Array.isArray(r.tags)?r.tags as string[]:[],
    weeklyHours:  (r.weeklyHours&&typeof r.weeklyHours==='object')?r.weeklyHours as WeeklyHours:{...DEFAULT_WEEK_HOURS},
    likeCount:    typeof r.likeCount==='number'?r.likeCount:0,
    dislikeCount: typeof r.dislikeCount==='number'?r.dislikeCount:0,
    themeColor:   typeof r.themeColor==='string'?r.themeColor:undefined,
    placeId:      typeof r.placeId==='string'?r.placeId:undefined,
    nameColor:    typeof r.nameColor==='string'?r.nameColor:undefined,
    bgAnim:       typeof r.bgAnim==='string'?r.bgAnim:undefined,
    bgAnimSpeed:  typeof r.bgAnimSpeed==='number'?r.bgAnimSpeed:undefined,
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
// NOTE: these are simplified, brand-accurate-coloured marks, not the official
// logo artwork. For production, drop in each brand's official SVG from their
// press/brand kit — hand-traced logos drift from the real mark over time.
function IconDoorDash({ size=32 }: { size?: number }) {
  // DoorDash Red #FF3008; current mark is the chevron "swoosh", not a letter D.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="DoorDash">
      <rect width="32" height="32" rx="7" fill="#FF3008"/>
      <path d="M7 12.4h11.3c2.1 0 3.6 1.3 3.6 3.2 0 2.4-1.9 4.4-4.6 4.4H7l2.6-3h7.5c.7 0 1.2-.5 1.2-1.1 0-.5-.35-.9-1-.9H7z" fill="#fff"/>
    </svg>
  );
}
function IconUberEats({ size=32 }: { size?: number }) {
  // Uber Eats green #06C167 on black.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Uber Eats">
      <rect width="32" height="32" rx="7" fill="#06C167"/>
      <rect x="6.5" y="13" width="19" height="3.1" rx="1.55" fill="#0B0B0B"/>
      <rect x="6.5" y="18.4" width="12.5" height="3.1" rx="1.55" fill="#0B0B0B"/>
      <circle cx="23" cy="20" r="2.6" fill="#0B0B0B"/>
    </svg>
  );
}
function IconGrubhub({ size=32 }: { size?: number }) {
  // Grubhub went orange in the 2021 Wolff Olins rebrand; the mark is a house
  // with a chimney and cutlery in the negative space.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Grubhub">
      <rect width="32" height="32" rx="7" fill="#FF8000"/>
      <path d="M16 7.2 25 14v10.8h-6.2v-6H13.2v6H7V14z" fill="#fff"/>
      <rect x="20.4" y="8.2" width="2.6" height="3.6" fill="#fff"/>
      <rect x="13.6" y="14.2" width="1.5" height="3.4" rx="0.6" fill="#FF8000"/>
      <rect x="16.9" y="14.2" width="1.5" height="3.4" rx="0.6" fill="#FF8000"/>
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
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected===o?'bg-[#7C3AED] text-white font-semibold border-[#0A0A0A]':'border-[#DEDEDC] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'}`}>
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
        <span className="text-[9px] font-semibold text-white tracking-tight leading-none">OPEN</span>
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
      <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-2">Layout</p>
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

// ── Page background picker: rainbow swatches, colour wheel, designed presets ──
function PageBackgroundPicker({ value, onChange, dark=false }: {
  value: string; onChange:(v:string, anim?:string, speed?:number)=>void; dark?:boolean;
}) {
  const wheelRef = useRef<HTMLInputElement>(null);
  const border = dark ? '#E8EBF0' : '#DEDEDC';
  const accent = dark ? '#111111' : '#0A0A0A';
  const [tab,setTab] = useState<'color'|'design'>('color');
  return (
    <div>
      <style>{BG_KEYFRAMES}</style>
      {/* tabs */}
      <div className="flex gap-1.5 mb-3">
        {([['color','Color'],['design','Designs']] as const).map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${tab===k?'bg-[#7C3AED] text-white':'bg-[#F4F6FA] text-[#667085] hover:text-[#111]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab==='color'&&(
        <>
          <div className="grid grid-cols-8 gap-2 mb-3">
            {BG_RAINBOW.map(c=>(
              <button key={c} onClick={()=>onChange(c)} title={c}
                className="aspect-square rounded-lg border-2 transition-all hover:scale-110"
                style={{background:c,borderColor:value===c?accent:border}}/>
            ))}
          </div>
          {/* colour wheel */}
          <button onClick={()=>wheelRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors hover:border-[#111]"
            style={{borderColor:border}}>
            <span className="w-6 h-6 rounded-full flex-shrink-0" style={{background:'conic-gradient(#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)'}}/>
            <span className="text-[12px] font-semibold text-[#111]">Pick any color</span>
          </button>
          <input ref={wheelRef} type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value)?value:'#ffffff'}
            onChange={e=>onChange(e.target.value)}
            className="sr-only" aria-label="Custom background color"/>
        </>
      )}

      {tab==='design'&&(
        <div className="grid grid-cols-4 gap-2.5">
          {BG_DESIGNS.map(d=>(
            <button key={d.label} onClick={()=>onChange(d.css,d.anim,d.speed)} title={d.label}
              className="group flex flex-col items-center gap-1">
              <span className="w-full aspect-square rounded-xl border-2 transition-all group-hover:scale-105"
                data-os-bg-anim={d.anim?'':undefined}
                style={{background:d.css,borderColor:value===d.css?accent:border,
                  animation:bgAnimationStyle(d.anim,(d.speed??60)/3)}}/>
              <span className={`text-[9px] font-semibold ${value===d.css?'text-[#111]':'text-[#98A2B3]'}`}>{d.label}{d.anim?" ✦":""}</span>
            </button>
          ))}
        </div>
      )}

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
function LivePhonePreview({ business,config,selectedId,onSelectBlock,blockProps,timeZone,override }: {
  business:Business|null;
  config:OpenStatusPageConfig;
  selectedId?:string|null;
  onSelectBlock?:(id:string)=>void;
  /** So the preview's Hours block agrees with the live page. */
  timeZone?:string|null;
  override?:TodayOverride;
  /** Mobile-only hook for long-press drag. Returns extra DOM props per block. */
  blockProps?:(id:string)=>{ style?:React.CSSProperties } & React.DOMAttributes<HTMLDivElement> & Record<string,unknown>;
}) {
  const activeBlocks = config.blocks.filter(b=>b.on);
  // Hours always first in preview
  const sortedBlocks = [
    ...activeBlocks.filter(b=>b.id==='hours'),
    ...activeBlocks.filter(b=>b.id!=='hours'),
  ];
  const isDark = isDarkBg(config.bg);
  const tx = isDark?'text-white':'text-[#0A0A0A]';
  const sx = isDark?'text-white/55':'text-[#6B6B6B]';
  const { status, todayLabel } = getLiveStatus(config.weeklyHours, timeZone, override);
  const TOK = surfaceTokens(config.bg);
  // Bold / italic are per-block, so every place a title or subtitle is drawn has
  // to honour them — previously only the generic fallback did, which is why the
  // toggles looked dead on most blocks.
  const tStyle = (b:OpenStatusBlock):React.CSSProperties =>
    ({ fontWeight: b.titleBold?800:undefined, fontStyle: b.titleItalic?'italic':undefined });
  const sStyle = (b:OpenStatusBlock):React.CSSProperties =>
    ({ fontWeight: b.subBold?700:undefined, fontStyle: b.subItalic?'italic':undefined });
  const locBlock = config.blocks.find(b=>b.id==='location');
  const reviewPct = locBlock?.reviewStars&&locBlock.reviewStars>0 ? starsToPercent(locBlock.reviewStars) : null;

  return (
    <div style={{ width:'100%' }}>
      <style>{BG_KEYFRAMES}</style>
      <div
        className="relative rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8"
        data-os-bg-anim={config.bgAnim?'':undefined}
        style={{
          background: config.bg || '#F7F7F5',
          minHeight: 560,
          width: '100%',
          fontFamily: config.font ?? 'Inter, system-ui, sans-serif',
          animation: bgAnimationStyle(config.bgAnim, config.bgAnimSpeed),
        }}
      >
        {/* Photo header — constrained 148px, fades into page bg */}
        {config.bgImage && (
          <div style={{ position:'relative', height:190, overflow:'hidden' }}>
            <img src={config.bgImage} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:config.bgImagePosition??'center 60%', display:'block' }}/>
            <div style={{ position:'absolute', inset:0, background:`linear-gradient(to bottom, transparent 40%, ${solidBg(config.bg)} 100%)` }}/>
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
          <p className="font-bold text-[13px]" style={{fontFamily:config.font??'Inter, system-ui, sans-serif',color:config.nameColor??(isDark?'#FFFFFF':'#0A0A0A')}}>{business?.name??'Your Business'}</p>
          {config.location && <p className={`text-[9px] truncate px-2 mt-0.5 ${sx}`}>{config.location}</p>}
          <div className="flex items-center justify-center gap-3 mt-2">
            {reviewPct && (
              <div className="flex items-center gap-1">
                <LucideStar size={9} color="#f59e0b" filled/>
                <span className="text-[9px] font-semibold text-[#f59e0b]">{locBlock?.reviewStars}</span>
                <span className="text-[8px] font-medium text-[#f59e0b]/70">({reviewPct}%)</span>
                {!!locBlock?.reviewCount&&locBlock.reviewCount>0&&<span className={`text-[8px] ${sx}`}>· {locBlock.reviewCount.toLocaleString()}</span>}
              </div>
            )}
            {reviewPct && <span className={`text-[8px] ${sx}`}>·</span>}
            <button className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${isDark?'bg-white/8 text-white/60':'bg-black/5 text-black/50'}`}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span className="text-[8px] font-medium">Share</span>
            </button>
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
                const isSquare = b.size==='square' && b.id!=='hours';
                const isHalf = (b.size==='half'||b.size==='square'||b.size==='third') && b.id!=='hours';
                const cardBg = TOK.card;
                const bdr = TOK.cardBorder;

                const bStyle = b.blockStyle ?? (b.id==='hours'?'minimal':b.id==='location'?'place':'brand');
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
                        <BlockIcon id={b.id} size={12} color={TOK.icon(b.color)}/>
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
                    // Address comes from the block's own address field, never from
                    // `sub` — `sub` is the caption ("Get directions") and using it
                    // made the map query that literal string.
                    const addr = (b.address || b.sub || '').trim();
                    const hasAddr = !!addr && !/^(get|tap for) directions$/i.test(addr);
                    const mapsHref = hasAddr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : '#';

                    // Minimal layout — compact row
                    if(bStyle==='minimal') return (
                      <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                        <LucidePin size={10} color={TOK.icon(b.color)}/>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-semibold ${tx} truncate`} style={tStyle(b)}>{b.title}</p>
                          {hasAddr&&!isHalf&&<p className={`text-[8px] ${sx} truncate`}>{addr}</p>}
                        </div>
                        <span className={`text-xs flex-shrink-0 ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                      </a>
                    );

                    // Place layout (default) — embedded map, only with a real address
                    if(hasAddr) return (
                      <div className="col-span-2 rounded-2xl overflow-hidden border" style={{borderColor:bdr}}>
                        <div className="relative w-full overflow-hidden" style={{height:120}}>
                          <iframe
                            src={(b.lat&&b.lng)
                              ?`https://maps.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed&hl=en`
                              :`https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed&hl=en`}
                            className="absolute inset-0 w-full h-full border-0" loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade" title="map"/>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-2.5 py-2" style={{background:cardBg}}>
                          <p className={`text-[9px] font-semibold truncate ${tx}`}>{addr}</p>
                          <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{background:b.color||'#1A1A18'}}>Directions →</span>
                        </div>
                      </div>
                    );

                    // No address yet — prompt in the builder rather than a world map
                    return (
                      <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border border-dashed" style={{ borderColor:bdr }}>
                        <LucidePin size={10} color={TOK.icon(b.color)}/>
                        <p className={`text-[9px] ${sx} flex-1`}>Add your address to show a map</p>
                      </div>
                    );
                  }

                  if(b.id==='menu') {
                    if(bStyle==='dark') return (
                      <div className="rounded-2xl px-3 py-3 border" style={{ background:'#0A0A0A', borderColor:'#1A1A1A' }}>
                        <div className="flex items-center gap-2">
                          <BlockIcon id="menu" size={12} color="white"/>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-white truncate" style={tStyle(b)}>{b.title}</p>
                            {!isHalf&&<p className="text-[8px] text-white/40 truncate" style={sStyle(b)}>{b.sub}</p>}
                          </div>
                          <span className="text-white/20 text-xs">›</span>
                        </div>
                      </div>
                    );
                    // Photo — cover image fills the card
                    if(bStyle==='photo' && b.coverPhoto) return (
                      <div className="rounded-2xl overflow-hidden border relative" style={{ borderColor:bdr, aspectRatio: isSquare ? '1/1' : '16/10' }}>
                        <img src={b.coverPhoto} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.10) 60%, transparent 100%)' }}/>
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'6px 8px' }}>
                          <p className="text-[9px] font-bold truncate" style={{ color:'#fff', ...tStyle(b) }}>{b.title}</p>
                          {!isHalf&&<p className="text-[7px] truncate" style={{ color:'rgba(255,255,255,0.75)', ...sStyle(b) }}>{b.sub}</p>}
                        </div>
                      </div>
                    );
                    // Card (default) — banner photo above a titled row
                    return (
                      <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr, background:cardBg }}>
                        {b.coverPhoto&&<img src={b.coverPhoto} className="w-full h-[54px] object-cover" alt=""/>}
                        <div className="flex items-center gap-2 px-2.5 py-2.5">
                          <BlockIcon id="menu" size={10} color={TOK.icon(b.color)}/>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] font-semibold ${tx} truncate`} style={tStyle(b)}>{b.title}</p>
                            {!isHalf&&<p className={`text-[8px] ${sx} truncate`} style={sStyle(b)}>{b.sub}</p>}
                          </div>
                          <span className={`text-xs flex-shrink-0 ${isDark?'text-white/20':'text-black/20'}`}>›</span>
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
                            <BlockIcon id="socials" size={10} color={TOK.icon(b.color)}/>
                            <p className={`text-[10px] font-semibold ${tx}`} style={tStyle(b)}>{b.title}</p>
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
                  if(b.coverPhoto && blockAllowsPhoto(b.size)) return (
                    <div className="rounded-2xl overflow-hidden border relative" style={{ borderColor:bdr, aspectRatio: isSquare ? '1/1' : '16/10' }}>
                      <img src={b.coverPhoto} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.10) 60%, transparent 100%)' }}/>
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'6px 8px' }}>
                        <p className={`text-[9px] font-bold truncate`} style={{ color:'#fff', ...tStyle(b) }}>{b.title}</p>
                        {b.sub&&<p className={`text-[7px] truncate`} style={{ color:'rgba(255,255,255,0.75)', ...sStyle(b) }}>{b.sub}</p>}
                      </div>
                      {b.url&&<div style={{ position:'absolute', top:5, right:5, width:14, height:14, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>}
                    </div>
                  );


                  return (
                    <div className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                      <BlockIcon id={b.id} size={10} color={TOK.icon(b.color)}/>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] ${tx} truncate`}
                          style={{fontWeight:b.titleBold?800:600,fontStyle:b.titleItalic?'italic':'normal'}}>{b.title}</p>
                        {!isHalf&&<p className={`text-[8px] ${sx} truncate`}
                          style={{fontWeight:b.subBold?700:400,fontStyle:b.subItalic?'italic':'normal'}}>{b.sub}</p>}
                      </div>
                      <span className={`text-xs flex-shrink-0 ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                    </div>
                  );
                })();

                const isSelected = selectedId === b.id;
                const extra = blockProps?.(b.id);
                const { style: extraStyle, ...extraRest } = extra ?? {};
                return (
                  <div key={b.id} data-block-id={b.id}
                    className={`${isHalf?'col-span-1':'col-span-2'} ${onSelectBlock?'cursor-pointer':''}`}
                    onClick={()=>onSelectBlock?.(b.id)}
                    {...extraRest}
                    style={{
                      ...(isSelected?{ outline:'2px solid #7C3AED', borderRadius:16, outlineOffset:2 }:{}),
                      ...(extraStyle ?? {}),
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
      <p className="text-center text-[11px] text-[#858585] mt-4 font-medium">{SITE_DOMAIN}/…</p>
    </div>
  );
}

// ── Desktop page preview (matches [slug]/page.tsx layout) ─────────────────────
function LiveDesktopPreview({ business,config,timeZone,override }: { business:Business|null; config:OpenStatusPageConfig; timeZone?:string|null; override?:TodayOverride }) {
  const isDark = isDarkBg(config.bg);
  const DTOK = surfaceTokens(config.bg);
  const bg = config.bg || '#F7F7F5';
  const { status, todayLabel } = getLiveStatus(config.weeklyHours, timeZone, override);
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
    background: DTOK.card,
    backdropFilter: 'blur(24px) saturate(130%)',
    WebkitBackdropFilter: 'blur(24px) saturate(130%)',
    border: `1px solid ${DTOK.cardBorder}`,
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: '14px 16px',
  };

  const tx = isDark ? '#fff' : '#151515';
  const sx = isDark ? 'rgba(255,255,255,0.5)' : '#8A8A86';

  return (
    <div
      data-os-bg-anim={config.bgAnim?'':undefined}
      style={{
        minHeight: '100%',
        background: bg,
        fontFamily: config.font ?? 'Inter, system-ui, sans-serif',
        fontSize: 14,
        animation: bgAnimationStyle(config.bgAnim, config.bgAnimSpeed),
      }}
    >
      <style>{BG_KEYFRAMES}</style>
      <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>

        {/* Cover photo */}
        {coverPhoto ? (
          <div style={{ position:'relative', height:260, overflow:'hidden' }}>
            <img src={coverPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:config.bgImagePosition??'center 60%', display:'block' }}/>
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
              <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>{locBlock?.reviewStars}</span>
              <span style={{ fontSize:10, fontWeight:600, color:'#f59e0b', opacity:0.7 }}>({reviewPct}%)</span>
              {!!locBlock?.reviewCount && locBlock.reviewCount>0 && <span style={{ fontSize:10, color:sx }}> · {locBlock.reviewCount.toLocaleString()} reviews</span>}
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
                  <BlockIcon id={b.id} size={18} color={DTOK.icon(b.color)}/>
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

// Cover-photo field that hides itself when the block is too small to show one.
function CoverPhotoField({ block, onUpdateBlock, label='Cover photo', hint }: {
  block: OpenStatusBlock;
  onUpdateBlock:(u:Partial<OpenStatusBlock>)=>void;
  label?: string; hint?: string;
}) {
  if (!blockAllowsPhoto(block.size)) {
    return (
      <div className="rounded-xl border border-[#EBEBEA] bg-[#FAFAF9] px-3.5 py-3">
        <p className="text-[11px] font-normal text-[#667085]">{label} needs a bigger block</p>
        <p className="text-[10px] text-[#98A2B3] mt-0.5">
          Set the size below to <strong className="text-[#667085] font-semibold">Square</strong> or <strong className="text-[#667085] font-semibold">Large</strong>.
          {block.coverPhoto ? ' Your photo is saved and comes back when you do.' : ''}
        </p>
      </div>
    );
  }
  return <PhotoField label={label} value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} hint={hint}/>;
}

// ── Business name colour ─────────────────────────────────────────────────────
// Defaults to automatic (light text on dark backgrounds) so the name can never
// disappear; the owner can override with a swatch or any custom colour.
function NameColorPicker({ value, autoColor, onChange }: {
  value?: string; autoColor: string; onChange:(v:string|undefined)=>void;
}) {
  const wheelRef = useRef<HTMLInputElement>(null);
  const SWATCHES = ['#FFFFFF','#0A0A0A','#7C3AED','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <button onClick={()=>onChange(undefined)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${!value?'bg-[#7C3AED] text-white border-[#111]':'border-[#DEDEDC] text-[#667085] hover:border-[#111]'}`}>
          Auto
        </button>
        {SWATCHES.map(c=>(
          <button key={c} onClick={()=>onChange(c)} title={c}
            className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
            style={{background:c,borderColor:value===c?'#111':'#DEDEDC'}}/>
        ))}
        <button onClick={()=>wheelRef.current?.click()} title="Custom color"
          className="w-7 h-7 rounded-full border-2 border-dashed border-[#D4D4D4] flex items-center justify-center hover:border-[#111] transition-colors">
          <span className="text-[11px] text-[#98A2B3]">+</span>
        </button>
        <input ref={wheelRef} type="color" className="sr-only" aria-label="Custom business name color"
          value={/^#[0-9a-fA-F]{6}$/.test(value??'')?value:autoColor}
          onChange={e=>onChange(e.target.value)}/>
      </div>
      <p className="text-[10px] text-[#98A2B3]">
        {value ? 'Custom color.' : `Auto — currently ${autoColor==='#FFFFFF'?'white':'black'}, based on your background.`}
      </p>
    </div>
  );
}

// ── Cover photo crop ─────────────────────────────────────────────────────────
// Framed at the SAME aspect ratio as the live page header (600x280), so what the
// owner positions here is exactly what visitors see. Drag (mouse or touch) to
// move the focal point; the slider is the precise fallback for vertical nudges,
// which is what almost every crop actually needs.
const COVER_W = 600, COVER_H = 280;
function CoverPhotoCrop({ src, position, onChange, onRemove }: {
  src: string; position?: string;
  onChange:(pos:string)=>void; onRemove:()=>void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging,setDragging] = useState(false);
  const [rawX,rawY] = (position ?? '50% 60%').split(' ');
  const px = parseFloat(rawX) || 50;
  const py = parseFloat(rawY) || 60;

  function apply(clientX:number, clientY:number) {
    const el = frameRef.current; if(!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX-r.left)/r.width)*100)));
    const y = Math.max(0, Math.min(100, Math.round(((clientY-r.top)/r.height)*100)));
    onChange(`${x}% ${y}%`);
  }

  return (
    <div className="mb-3">
      <div
        ref={frameRef}
        className="relative rounded-xl overflow-hidden touch-none select-none"
        style={{ aspectRatio:`${COVER_W} / ${COVER_H}`, cursor: dragging ? 'grabbing' : 'grab' }}
        title="Drag to reposition"
        onPointerDown={e=>{ e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); apply(e.clientX,e.clientY); }}
        onPointerMove={e=>{ if(dragging) apply(e.clientX,e.clientY); }}
        onPointerUp={e=>{ e.currentTarget.releasePointerCapture(e.pointerId); setDragging(false); }}
        onPointerCancel={()=>setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Cover" draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition:`${px}% ${py}%` }}/>
        {/* focal marker */}
        <div style={{
          position:'absolute', left:`${px}%`, top:`${py}%`,
          transform:'translate(-50%,-50%)',
          width:18, height:18, borderRadius:'50%',
          border:'2px solid #fff', background:'rgba(255,255,255,0.35)',
          boxShadow:'0 0 0 1px rgba(0,0,0,0.45)', pointerEvents:'none',
        }}/>
        <span className="absolute bottom-1.5 left-2 text-[9px] font-semibold text-white/85 pointer-events-none"
          style={{textShadow:'0 1px 3px rgba(0,0,0,0.7)'}}>Drag to reposition</span>
        <button onClick={e=>{e.stopPropagation();onRemove();}}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
          <LucideX size={10} color="white"/>
        </button>
      </div>
      {/* vertical nudge — the axis that actually matters on a wide banner */}
      <div className="flex items-center gap-2.5 mt-2">
        <span className="text-[10px] font-normal text-[#98A2B3] w-8 flex-shrink-0">Up</span>
        <input type="range" min={0} max={100} value={py}
          onChange={e=>onChange(`${px}% ${e.target.value}%`)}
          className="flex-1 accent-[#7C3AED]" aria-label="Vertical crop position"/>
        <span className="text-[10px] font-normal text-[#98A2B3] w-10 flex-shrink-0 text-right">Down</span>
      </div>
    </div>
  );
}

// ── Collapsible "More options" disclosure ─────────────────────────────────────
// B / I toggles for a block's title and subtitle.
function TextStylePicker({ bold, italic, onToggle }: {
  bold:boolean; italic:boolean; onToggle:(k:'bold'|'italic')=>void;
}) {
  const btn = (on:boolean) =>
    `w-6 h-6 rounded-md text-[11px] leading-none flex items-center justify-center border transition-colors ${
      on ? 'bg-[#F5F3FF] border-[#DDD6FE] text-[#6D28D9]' : 'bg-white border-[#EBEBEA] text-[#98A2B3] hover:border-[#111]'
    }`;
  return (
    <div className="flex items-center gap-1 mb-1.5">
      <button type="button" aria-pressed={bold} title="Bold" onClick={()=>onToggle('bold')}
        className={btn(bold)} style={{fontWeight:700}}>B</button>
      <button type="button" aria-pressed={italic} title="Italic" onClick={()=>onToggle('italic')}
        className={btn(italic)} style={{fontStyle:'italic',fontFamily:'Georgia,serif'}}>I</button>
    </div>
  );
}

function MoreOptions({ label='More options', children }: { label?:string; children:React.ReactNode }) {
  const [open,setOpen]=useState(false);
  return (
    <div className="rounded-xl border border-[#EBEBEA] overflow-hidden">
      <button type="button" onClick={()=>setOpen(v=>!v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#FAFAF9] hover:bg-[#F4F4F2] transition-colors">
        <span className="text-[12px] font-semibold text-[#667085]">{label}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.18s ease'}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&<div className="px-3.5 py-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}

// ── Reviews & rating (Business tab) ───────────────────────────────────────────
// The star rating renders in the PAGE HEADER, under the business name — not on
// the location card — so it is edited here rather than inside the location block.
// Five amber stars with a partial fill — what people expect a rating to look like.
// One icon per metric, so the analytics tiles are scannable rather than four
// identical boxes of numbers.
const METRIC_ICONS: Record<string, React.ReactNode> = {
  'Page views': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  'Unique visitors': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  'Directions': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  'Menu taps': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  'Link clicks': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  'Block taps': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11.5V6a2 2 0 1 1 4 0v5"/><path d="M13 11V4a2 2 0 1 1 4 0v7"/><path d="M17 11.5V8a2 2 0 1 1 4 0v8a6 6 0 0 1-6 6h-2a7 7 0 0 1-7-7v-1a2 2 0 1 1 4 0"/></svg>,
  'Shares': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  'Likes': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>,
};

function StarRating({ value, size=14 }: { value:number; size?:number }) {
  return (
    <span style={{display:'flex',alignItems:'center',gap:1}} aria-label={`${value.toFixed(1)} out of 5`}>
      {[0,1,2,3,4].map(i=>{
        const fill=Math.max(0,Math.min(1,value-i));
        return (
          <span key={i} style={{position:'relative',width:size,height:size,display:'inline-block'}}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="#E4E4E7" style={{position:'absolute',inset:0}} aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
            </svg>
            {fill>0&&(
              <span style={{position:'absolute',inset:0,width:`${fill*100}%`,overflow:'hidden'}}>
                <svg width={size} height={size} viewBox="0 0 24 24" fill="#FBBC04" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

function ReviewsCard({ block,placeId,onUpdateBlock }: {
  block:OpenStatusBlock|undefined;
  placeId?:string;
  onUpdateBlock:(u:Partial<OpenStatusBlock>)=>void;
}) {
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState('');
  if(!block) return null;
  const stars = block.reviewStars ?? 0;
  const hasRating = stars>0;

  // Pulled straight from the connected Google place. There is deliberately no
  // URL to paste: people paste Google *search* URLs, which carry no place id,
  // and the parse fails through no fault of theirs.
  async function refresh() {
    if(!placeId){ setErr('No Google place linked yet — reconnect Google Business.'); return; }
    setBusy(true); setErr('');
    try{
      const r=await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
      const d=await r.json() as {rating?:number;reviewCount?:number;error?:string};
      if(!r.ok||d.error) throw new Error(d.error??'Could not reach Google');
      if(!d.rating) throw new Error('Google has no rating for this place yet.');
      onUpdateBlock({reviewStars:d.rating,reviewCount:d.reviewCount});
    }catch(e){ setErr(e instanceof Error?e.message:'Could not refresh'); }
    finally{ setBusy(false); }
  }

  return (
    <div className="mb-5 rounded-2xl border border-[#EBEBEA] bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-[12px] font-semibold text-[#111]">Reviews &amp; rating</p>
        <button onClick={()=>void refresh()} disabled={busy}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[11px] font-semibold hover:border-[#111] transition-colors disabled:opacity-40">
          {busy?'Refreshing…':'Refresh from Google'}
        </button>
      </div>

      {hasRating
        ?(
          <div className="flex items-center gap-2 mt-2.5">
            <StarRating value={stars}/>
            <span className="text-[15px] font-semibold text-[#111] leading-none">{stars.toFixed(1)}</span>
            {!!block.reviewCount&&(
              <span className="text-[12px] text-[#98A2B3]">({block.reviewCount.toLocaleString()})</span>
            )}
          </div>
        )
        :<p className="text-[12px] text-[#98A2B3] mt-1">No rating yet — hit refresh once your Google listing has reviews.</p>
      }

      <p className="text-[11px] text-[#98A2B3] mt-2.5 leading-relaxed">
        This is your real Google rating, so it can&apos;t be typed by hand. It shows in your page header, under your business name.
      </p>
      {err&&<p className="text-[11px] text-red-500 mt-2">{err}</p>}
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
          <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-3">Content</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <FieldLabel>Title</FieldLabel>
                <TextStylePicker
                  bold={!!block.titleBold} italic={!!block.titleItalic}
                  onToggle={(k)=>onUpdateBlock(k==='bold'?{titleBold:!block.titleBold}:{titleItalic:!block.titleItalic})}/>
              </div>
              <Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/>
            </div>
            {/* location's subtitle IS its address — edited once, below, not twice */}
            {block.id!=='location'&&(
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel>Subtitle</FieldLabel>
                  <TextStylePicker
                    bold={!!block.subBold} italic={!!block.subItalic}
                    onToggle={(k)=>onUpdateBlock(k==='bold'?{subBold:!block.subBold}:{subItalic:!block.subItalic})}/>
                </div>
                <Input value={block.sub} onChange={v=>onUpdateBlock({sub:v})}/>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">

          {/* ── LOCATION ── */}
          {block.id==='location' && (
            <div className="space-y-5">
              <BlockStylePicker blockId="location" selected={block.blockStyle??'place'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
              <div>
                <FieldLabel>Address</FieldLabel>
                <Input value={block.sub??''} onChange={v=>onUpdateBlock({sub:v})} placeholder="123 Main St, Nashville, TN"/>
                <p className="mt-1 text-[10px] text-black/35">Visitors tap the button and it opens Maps on their phone.</p>
              </div>
              <MoreOptions>
                <div>
                  <FieldLabel>Apple Maps URL</FieldLabel>
                  <Input value={block.appleMapsUrl??''} onChange={v=>onUpdateBlock({appleMapsUrl:v})} placeholder="Paste from Apple Maps → Share → Copy link"/>
                  <p className="mt-1 text-[10px] text-black/35">Optional. Without it, iPhone visitors open Google Maps.</p>
                </div>
              </MoreOptions>
              <p className="text-[11px] text-[#98A2B3] leading-relaxed">
                Reviews and your star rating moved to the <strong className="text-[#667085] font-semibold">Business</strong> tab — they show in your page header, not on this card.
              </p>
            </div>
          )}

          {/* ── CUSTOM LINK ── */}
          {block.id.startsWith('custom-') && (
            <div className="space-y-5">
              <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock}
                hint="Optional photo shown behind the link."/>
              <div>
                <FieldLabel>Where it goes</FieldLabel>
                <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/>
                <p className="mt-1 text-[10px] text-black/35">Opens in a new tab. Without a link this block won&apos;t publish.</p>
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
                  <p className="text-sm font-semibold text-[#0A0A0A]">{status==='open'?'Open now':'Closed right now'}</p>
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
                      <div key={key} className={`flex flex-wrap items-center gap-2 px-4 py-3 ${i<DAYS.length-1?'border-b border-[#F5F5F5]':''}`}>
                        <span className="text-[13px] font-medium text-[#0A0A0A] w-10 flex-shrink-0">{label.slice(0,3)}</span>
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
                        {hoursRowInvalid(day)&&(
                          <p className="w-full text-[11px] text-[#B54708] flex items-center gap-1.5 pl-12">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Closing time is before opening time — customers will see this as closed all day.
                          </p>
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
              <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock} hint="Optional banner photo shown at the top of the menu block."/>
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
              <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock} hint="Optional photo shown behind the block."/>
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
              <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock}/>
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
              <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock} hint="Optional photo behind the social links block."/>
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


          {/* ── WEBSITE / generic ── */}
          {(block.id==='website'||(!block.id.startsWith('custom-')&&!['location','hours','menu','order','book','socials'].includes(block.id))) && (
            <div className="space-y-5">
              {block.id==='website'&&(
                <>
                  <BlockStylePicker blockId="website" selected={block.blockStyle??'photo'} onSelect={v=>onUpdateBlock({blockStyle:v})}/>
                  <CoverPhotoField block={block} onUpdateBlock={onUpdateBlock}/>
                  <div><FieldLabel>Website URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>
                </>
              )}
            </div>
          )}

          {/* Widget size — shape thumbnails, photo-capable sizes flagged */}
          {block.id!=='hours' && (()=>{
            const cur: BlockSize = (block.size==='third'?'half':block.size) ?? 'full';
            const SIZES: { key:BlockSize; label:string; ratio:string; span:number }[] = [
              { key:'half',   label:'Small',  ratio:'2/1',  span:1 },
              { key:'square', label:'Square', ratio:'1/1',  span:1 },
              { key:'full',   label:'Large',  ratio:'16/10',span:2 },
            ];
            return (
              <div className="pt-5 border-t border-[#F0F0F0]">
                <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-3">Size</p>
                <div className="flex items-end gap-2.5">
                  {SIZES.map(sz=>{
                    const on = cur===sz.key;
                    return (
                      <button key={sz.key} onClick={()=>onUpdateBlock({size:sz.key})}
                        className="flex flex-col items-center gap-1.5 group"
                        style={{width:sz.span===2?86:44}}>
                        <span className="w-full rounded-lg border-2 transition-all group-hover:scale-105 flex items-end justify-start p-1"
                          style={{aspectRatio:sz.ratio,borderColor:on?'#0A0A0A':'#DEDEDC',background:on?'#EEEEEC':'#FAFAF9'}}>
                          <span className="block w-1/2 h-[3px] rounded-full" style={{background:on?'#0A0A0A':'#D4D4D4'}}/>
                        </span>
                        <span className={`text-[10px] font-semibold ${on?'text-[#0A0A0A]':'text-[#858585]'}`}>{sz.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2.5 text-[10px] text-[#98A2B3]">
                  {blockAllowsPhoto(cur)
                    ? 'Square and Large can hold a cover photo.'
                    : 'Small is text only — switch to Square or Large to add a photo.'}
                </p>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

// ── Block picker (command palette style) ──────────────────────────────────────
const PICKER_CATEGORIES = [
  { label:'Essential',      ids:['hours','location'] },
  { label:'Food & Beverage',ids:['menu','order'] },
  { label:'Engagement',     ids:['book'] },
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
        <p className="text-[11px] font-semibold tracking-[0.12em] text-[#858585] uppercase mb-1">Step {step+1} of {TUT_STEPS.length}</p>
        <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-2 leading-snug">{current.title}</h3>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-5">{current.body}</p>
        <div className="flex items-center justify-between">
          <button onClick={onDone} className="text-[12px] text-[#858585] hover:text-[#111] font-medium transition-colors">Skip</button>
          <div className="flex items-center gap-2">
            {step>0&&<button onClick={()=>setStep(s=>s-1)} className="px-4 py-1.5 text-[12px] font-semibold rounded-full border border-[#E0E0E0] text-[#6B6B6B] hover:border-[#111] transition-colors">Back</button>}
            <button onClick={next} className="px-4 py-1.5 text-[12px] font-semibold rounded-full bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors">{isLast?'Done':'Next →'}</button>
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

type SidebarTab = 'design'|'business'|'hours'|'settings'|'style'|'links'|'analytics'|'integrations';
type HoursSubTab = 'special'|'status';

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
      if(r.status===202){setPushMsg('Saved here. Google hasn\u2019t accepted it yet — '+(d.error??'pending review.'));}
      else if(r.ok&&d.ok){setPushMsg('✓ Hours updated on Google');}
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
        <p className="text-[13px] font-semibold text-[#0A0A0A]">Sync from Google Business</p>
      </div>
      <p className="text-[11px] text-[#858585]">Paste your Place ID (starts with ChIJ…) or a Google Maps link to pull in your hours automatically.</p>
      <div className="flex gap-2">
        <input value={placeInput} onChange={e=>setPlaceInput(e.target.value)} placeholder="ChIJ... or Google Maps URL" className="flex-1 text-[12px] border border-[#DEDEDC] rounded-xl px-3 py-2 outline-none focus:border-[#0A0A0A] bg-[#FAFAFA]"/>
        <button onClick={syncFromGoogle} disabled={syncing} className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold disabled:opacity-50 whitespace-nowrap hover:bg-[#6D28D9] transition-colors">{syncing?'Syncing…':'Sync hours'}</button>
      </div>
      {syncMsg&&<p className={`text-[11px] font-medium ${syncMsg.startsWith('✓')?'text-green-600':'text-red-500'}`}>{syncMsg}</p>}
      <div className="border-t border-[#EBEBEB] pt-3 mt-1">
        {googleConnected?(
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[#7C3AED] font-medium">
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

// ── Inline sparkline for builder business tab ──────────────────────────
function BuilderSparkline({data,color}:{data:number[];color:string}){
  if(!data||data.length<2) return <div style={{height:28}}/>;
  const max=Math.max(...data,1);const min=Math.min(...data);const range=max-min||1;
  const w=60,h=28;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-6)-3}`).join(' ');
  return <svg width={w} height={h} style={{display:'block'}}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/**
 * Mobile popup sheet. Auto-height and capped — the old builder put every editor
 * in a 52vh panel that hid the page you were editing. These sit low, only as
 * tall as their content, so the phone canvas stays visible above them.
 *
 * Closed means GONE. An earlier version parked it at translateY(115%), which is
 * a percentage of the sheet's own height — for a short sheet that was less than
 * the 56px nav offset it sits above, so every closed sheet left a sliver of its
 * header floating over the nav bar, unpressable, on phone and desktop alike.
 * It now unmounts when closed and animates in on mount.
 */
function MobileSheet({ open, title, onClose, children, maxVh = 62, dim = true }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxVh?: number;
  /** false = no scrim, so you can still see the widget you're editing change. */
  dim?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame, so the browser has a closed position to animate away from.
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      {dim && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 44,
            background: 'rgba(10,10,10,0.22)',
            opacity: shown ? 1 : 0,
            transition: 'opacity .22s ease',
          }}
        />
      )}
      <div
        role="dialog"
        aria-modal={dim ? true : undefined}
        aria-label={title}
        style={{
          position: 'fixed', left: 0, right: 0, zIndex: 45,
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          background: '#fff',
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          boxShadow: '0 -10px 44px rgba(0,0,0,0.18)',
          maxHeight: `${maxVh}vh`,
          display: 'flex', flexDirection: 'column',
          // A fixed pixel fallback on top of the percentage, so a short sheet
          // still clears the nav it sits above.
          transform: shown ? 'translateY(0)' : 'translateY(calc(100% + 96px))',
          transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
          fontFamily: 'var(--font-poppins), system-ui, sans-serif',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px', flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: '50%', top: 6, transform: 'translateX(-50%)', width: 36, height: 4, borderRadius: 2, background: '#E4E7EC' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: 0, letterSpacing: '-0.02em' }}>{title}</p>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F2F4F7', color: '#667085', fontSize: 15, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>
            ×
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: '4px 16px 20px', scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </>
  );
}

export default function BuilderClient({ business,initialConfig,isFirstRun=false,onboardedAt,googleConnected=false }: {
  business:Business|null; initialConfig:OpenStatusPageConfig; isFirstRun?:boolean; onboardedAt?:string|null; googleConnected?:boolean;
}) {
  const [config,setConfig]=useState<OpenStatusPageConfig>(initialConfig??normalizeOpenStatusPageConfig(undefined));
  const [hasPublished,setHasPublished]=useState<boolean>(!!onboardedAt);
  const [sidebarTab,setSidebarTab]=useState<SidebarTab>('business');
  const [hoursSubTab,setHoursSubTab]=useState<HoursSubTab>('status');
  // Status is now one decision with an escape hatch; the rest folds away.
  const [statusMore,setStatusMore]=useState(false);
  // "Different hours today" — a full window, not just an early close.
  const [todayOpen,setTodayOpen]=useState('09:00');
  const [todayClose,setTodayClose]=useState('17:00');
  // Status and Analytics don't edit the page config: every Status action posts the
  // moment it's tapped, and Analytics is read-only. A Save button there implies
  // there are unsaved changes to lose, so it's hidden on those tabs.
  // The header Save writes the PAGE config. Business and Settings have their own
  // save buttons for their own fields, so showing this one there invited people
  // to press it and believe their phone number had been saved.
  const showSaveButton = sidebarTab==='design' || sidebarTab==='style';
  const [previewMode,setPreviewMode]=useState<'mobile'|'desktop'>('mobile');
  const [previewKey,setPreviewKey]=useState(0);
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
  // 'pending' exists because /api/google/hours answers a Google 429 with HTTP 202
  // ("saved here, Google hasn't accepted it"). fetch treats 202 as ok, so the old
  // `if (r.ok)` rendered "✓ Synced to Google" for a sync that had not happened.
  const [googleSyncStatus,setGoogleSyncStatus]=useState<null|'syncing'|'ok'|'pending'|{error:string}>(null);
  const [googleFetchUrl,setGoogleFetchUrl]=useState('');
  const [googleFetching,setGoogleFetching]=useState(false);
  const [googleFetchError,setGoogleFetchError]=useState('');
  const [googleFetchDone,setGoogleFetchDone]=useState(false);
  const [dragId,setDragId]=useState<string|null>(null);
  // Retained only because the desktop sidebar still sets it. The 52vh mobile
  // sheet it used to drive is gone — the phone uses full pages and small sheets.
  const [,setMobileSheetOpen]=useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────
  //  MOBILE SHELL STATE  (phone only — nothing below is read by the desktop
  //  layout, which is rendered in its own branch and left untouched.)
  // ─────────────────────────────────────────────────────────────────────────

  /** Which small sheet is up over the phone canvas. null = just the canvas. */
  type MSheetKind = null | 'block' | 'add' | 'font' | 'color' | 'background';
  const [mSheet,setMSheet] = useState<MSheetKind>(null);

  /** Widget currently picked up by a long press on the phone canvas. */
  const [mDragId,setMDragId] = useState<string|null>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const dragStart = useRef<{x:number;y:number}|null>(null);
  const dragging  = useRef(false);
  const suppressTap = useRef(false);

  const cancelLongPress = useCallback(()=>{
    if(dragTimer.current){ clearTimeout(dragTimer.current); dragTimer.current=null; }
    dragStart.current=null;
  },[]);

  const endDrag = useCallback(()=>{
    cancelLongPress();
    if(dragging.current){
      suppressTap.current=true;
      setTimeout(()=>{ suppressTap.current=false; },350);
    }
    dragging.current=false;
    setMDragId(null);
  },[cancelLongPress]);

  /** Swap two blocks in config order. Live-reorders as the finger passes each one. */
  const swapBlocks = useCallback((a:string,b:string)=>{
    if(a===b) return;
    setConfig(c=>{
      const list=[...c.blocks];
      const i=list.findIndex(x=>x.id===a), j=list.findIndex(x=>x.id===b);
      if(i<0||j<0) return c;
      [list[i],list[j]]=[list[j],list[i]];
      return {...c,blocks:list};
    });
  },[]);

  /**
   * Long-press a widget to pick it up, then drag to rearrange — the iOS
   * home-screen gesture. We reorder live as the finger crosses each neighbour
   * rather than computing drop gaps, which keeps it correct in the two-column
   * grid where blocks are different widths.
   */
  const mobileBlockProps = useCallback((id:string)=>({
    style:{
      touchAction: dragging.current ? 'none' as const : undefined,
      transform: mDragId===id ? 'scale(1.06)' : undefined,
      boxShadow: mDragId===id ? '0 12px 32px rgba(0,0,0,0.28)' : undefined,
      opacity: mDragId && mDragId!==id ? 0.55 : undefined,
      zIndex: mDragId===id ? 5 : undefined,
      position: mDragId===id ? 'relative' as const : undefined,
      transition: 'transform .18s cubic-bezier(.32,.72,0,1), opacity .18s, box-shadow .18s',
    },
    onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
      dragStart.current={x:e.clientX,y:e.clientY};
      cancelLongPress();
      dragTimer.current=setTimeout(()=>{
        dragging.current=true;
        setMDragId(id);
        // A short tick confirms the pick-up on devices that support it.
        try{ navigator.vibrate?.(12); }catch{/* not supported */}
      },320);
    },
    onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
      // Before pick-up, any real movement means the user is scrolling, not holding.
      if(!dragging.current){
        const st=dragStart.current;
        if(st && Math.hypot(e.clientX-st.x, e.clientY-st.y) > 8) cancelLongPress();
        return;
      }
      e.preventDefault();
      const el=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null;
      const over=el?.closest('[data-block-id]') as HTMLElement|null;
      const overId=over?.getAttribute('data-block-id');
      if(overId && mDragId && overId!==mDragId) swapBlocks(mDragId,overId);
    },
    onPointerUp:()=>{ const wasDragging=dragging.current; endDrag(); if(wasDragging) try{ navigator.vibrate?.(8); }catch{} },
    onPointerCancel:endDrag,
    onContextMenu:(e:React.MouseEvent)=>{ if(dragging.current) e.preventDefault(); },
  }),[mDragId,cancelLongPress,endDrag,swapBlocks]);

  const [isMobile,setIsMobile]=useState<boolean>(false);
  const sheetDragRef=useRef<{startY:number,open:boolean}|null>(null);
  const [dragOverId,setDragOverId]=useState<string|null>(null);
  // contentMaxWidth: how wide the editor panel can grow. Drag handle shrinks it to give more room to preview.
  // SIDEBAR_W + PREVIEW_MIN must always fit, or the panels overflow the viewport
  // and the sidebar appears to sit on top of the content.
  const SIDEBAR_W = 220, PREVIEW_MIN = 300;
  const idealContentWidth = useCallback((vw:number)=>
    Math.max(320, Math.min(780, Math.min(
      Math.round((vw - SIDEBAR_W) * 0.55),     // preferred split
      vw - SIDEBAR_W - PREVIEW_MIN,            // never starve the preview
    ))), []);
  const [contentMaxWidth,setContentMaxWidth]=useState(()=>{
    if(typeof window==='undefined') return 680;
    return Math.max(320, Math.min(780, Math.min(
      Math.round((window.innerWidth - 220) * 0.55),
      window.innerWidth - 220 - 300,
    )));
  });
  // Was computed once at mount only, so resizing the window left a stale width:
  // at ~1100-1300px the editor kept its wide value, pushed the preview below its
  // minimum, and forced a horizontal scrollbar with clipped headings.
  const contentWidthTouched = useRef(false);
  useEffect(()=>{
    const onResize=()=>{
      const vw=window.innerWidth;
      setContentMaxWidth(prev=>{
        if(!contentWidthTouched.current) return idealContentWidth(vw);
        // respect a manual drag, but never at the cost of overflowing
        return Math.max(320, Math.min(prev, vw - SIDEBAR_W - PREVIEW_MIN));
      });
    };
    onResize();
    window.addEventListener('resize',onResize);
    return ()=>window.removeEventListener('resize',onResize);
  },[idealContentWidth]);
  const [previewWidth,setPreviewWidth]=useState(0); // unused for layout now, kept for compat
  const [localBusiness,setLocalBusiness]=useState<Business|null>(business);
  const [bizEdit,setBizEdit]=useState({name:business?.name??'',category:normalizeCategory(business?.category)??'',phone:business?.phone??'',website:business?.website??'',address:business?.address??''});
  const [slugEdit,setSlugEdit]=useState(business?.slug??'');
  const [slugSaving,setSlugSaving]=useState(false);
  const [slugMsg,setSlugMsg]=useState('');
  const [pwSending,setPwSending]=useState(false);
  const [pwMsg,setPwMsg]=useState('');
  const [deleteArmed,setDeleteArmed]=useState(false);
  const [deleteConfirm,setDeleteConfirm]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [deleteMsg,setDeleteMsg]=useState('');
  const [helpOpen,setHelpOpen]=useState(false);
  const [tagDraft,setTagDraft]=useState('');
  // Live open-state read back from Google. `status` is Google's own enum string,
  // which is also how we learn the vocabulary this account actually uses.
  const [gStatus,setGStatus]=useState<{status:string|null;canReopen:boolean|null;isClosed:boolean}|null>(null);
  const [gBusy,setGBusy]=useState(false);
  const [gMsg,setGMsg]=useState('');

  const [undoBlock,setUndoBlock]=useState<OpenStatusBlock|null>(null);
  const undoTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [bizSaving,setBizSaving]=useState(false);
  const [bizSaved,setBizSaved]=useState(false);
  const [bizSaveError,setBizSaveError]=useState('');
  const [logoUploading,setLogoUploading]=useState(false);
  const [logoUploadError,setLogoUploadError]=useState('');
  const [bgUploading,setBgUploading]=useState(false);
  const [bgUploadError,setBgUploadError]=useState('');
  const [googlePhotos,setGooglePhotos]=useState<string[]>([]);
  const [analyticsData,setAnalyticsData]=useState<null|{metrics:{views:number;uniqueVisitors:number;directions:number;menu:number;orders:number;clicks:number};topActions:{id:string;count:number}[];trafficSources:{source:string;count:number}[];trend:{date:string;views:number;clicks:number}[]}>(null);
  const [analyticsLoading,setAnalyticsLoading]=useState(false);
  const [analyticsDays,setAnalyticsDays]=useState(30);
  const isResizing=useRef(false);
  const resizeStartX=useRef(0);
  const resizeStartW=useRef(0);
  const onResizeStart=useCallback((e:React.MouseEvent)=>{
    e.preventDefault();
    isResizing.current=true;
    resizeStartX.current=e.clientX;
    resizeStartW.current=contentMaxWidth;
    document.body.style.userSelect='none';
    document.body.style.cursor='col-resize';
    contentWidthTouched.current=true;
    const onMove=(ev:MouseEvent)=>{ if(!isResizing.current)return; const delta=ev.clientX-resizeStartX.current; const cap=window.innerWidth-SIDEBAR_W-PREVIEW_MIN; setContentMaxWidth(Math.max(320,Math.min(Math.min(840,cap),resizeStartW.current+delta))); };
    const onUp=()=>{ isResizing.current=false; document.body.style.userSelect=''; document.body.style.cursor=''; window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp); };
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',onUp);
  },[contentMaxWidth]);

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
  // What the owner has set for today, if anything. Passed into every preview so
  // the Hours block shows what customers actually see — previously the preview
  // read only the weekly schedule, so a "closed today" never appeared in it.
  const todayOverride: TodayOverride = (() => {
    const active = statusUpdates.find(u=>u.status==='active');
    if(!active) return null;
    return { kind: active.kind, closesAt: active.closes_at, opensAt: null };
  })();
  const bizTimeZone = localBusiness?.timezone ?? null;
  const {status:liveStatus,todayLabel}=getLiveStatus(config.weeklyHours, bizTimeZone, todayOverride);
  const hours = config.weeklyHours??{...DEFAULT_WEEK_HOURS};
  const showEditPanel = !!openBlock && sidebarTab==='design';
  const isEditSubTab = ['design','style'].includes(sidebarTab);
  const igHandle = (business as (Business & { instagram_handle?: string })|null)?.instagram_handle??null;

  function updateBlock(id:string,u:Partial<OpenStatusBlock>) {
    setConfig(c=>({...c,blocks:c.blocks.map(b=>b.id===id?{...b,...u}:b)}));
  }
  /** A link to anything — the thing a link-in-bio product is actually for. */
  function addCustomLink() {
    const id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    setConfig(c=>({
      ...c,
      blocks:[...c.blocks,{
        id, title:'New link', sub:'', icon:'', on:true, tone:'default',
        url:'', size:'full', color:'#7C3AED',
      }],
    }));
    setOpenId(id);
    setSidebarTab('design');
  }

  // Adding a block used to leave it wherever DEFAULT_BLOCKS put it, so a new
  // block appeared in the middle of the page (usually above Website). Append it.
  function enableBlock(id:string) {
    setConfig(c=>{
      const bs=[...c.blocks];
      const i=bs.findIndex(b=>b.id===id);
      if(i<0) return c;
      const [moved]=bs.splice(i,1);
      bs.push({...moved,on:true});
      return {...c,blocks:bs};
    });
  }
  // A block can hold a URL, an uploaded menu and a cover photo. Deleting used to
  // be instant and irreversible; an undo window is friendlier than a confirm.
  function removeBlock(id:string) {
    const snapshot=config.blocks.find(b=>b.id===id) ?? null;
    if(id.startsWith('custom-')) setConfig(c=>({...c,blocks:c.blocks.filter(b=>b.id!==id)}));
    else updateBlock(id,{on:false});
    setUndoBlock(snapshot);
    if(undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current=setTimeout(()=>setUndoBlock(null),8000);
  }
  function undoRemove() {
    if(!undoBlock) return;
    const snap=undoBlock;
    setConfig(c=>c.blocks.some(b=>b.id===snap.id)
      ? {...c,blocks:c.blocks.map(b=>b.id===snap.id?{...snap,on:true}:b)}
      : {...c,blocks:[...c.blocks,{...snap,on:true}]});
    setUndoBlock(null);
    if(undoTimer.current) clearTimeout(undoTimer.current);
  }

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
  // The public page reads hours from the `business_hours` TABLE, while the
  // builder keeps them in user metadata. Without this mirror the live page sees
  // zero rows, evaluates every day as closed, and tells customers the business
  // is "Closed today" while the builder shows "Open now".
  // Goes through the server route, not the browser client: row level security on
  // business_hours can silently block a delete or update, which is what produced
  // "duplicate key value violates unique constraint business_hours_business_id_day_of_week_key".
  async function syncHoursToDb(_businessId: string, wh: WeeklyHours) {
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error('Hours did not save to your live page: your session expired, sign in again.');
    const r = await fetch('/api/business/hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ weeklyHours: wh }),
    });
    if (!r.ok) {
      const b = await r.json().catch(() => ({}));
      throw new Error(b?.error ?? `Hours did not save to your live page (${r.status})`);
    }
  }

  async function save() {
    setSaving(true);setSaveError('');
    const {error}=await savePageConfig(business?.id,config);
    // Mirror hours to the table the public page actually reads
    if(business?.id&&config.weeklyHours&&!error){
      try{ await syncHoursToDb(business.id, config.weeklyHours); }
      catch(e){ setSaveError(e instanceof Error?e.message:'Hours failed to publish'); }
    }
    // On first publish, stamp onboarded_at in the businesses table
    if(!hasPublished&&business?.id&&!error){
      await supabase.from('businesses').update({onboarded_at:new Date().toISOString()}).eq('id',business.id);
      setHasPublished(true);
    }
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
          if(r.status===202){
            setGoogleSyncStatus('pending');
          } else if(r.ok){
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

  async function googleStatusRequest(payload: Record<string, unknown>, verb: 'GET'|'POST'='POST') {
    const {data:{session}}=await supabase.auth.getSession();
    const token=session?.access_token;
    if(!token) throw new Error('Session expired — sign in again.');
    const res=await fetch('/api/google/status', verb==='GET'
      ? { headers:{Authorization:`Bearer ${token}`} }
      : { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const body=await res.json().catch(()=>({}));
    if(!res.ok&&res.status!==202) throw new Error(body?.error ?? 'Google request failed');
    return body as Record<string, unknown>;
  }

  const loadGoogleStatus=useCallback(async()=>{
    if(!googleConnected) return;
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const token=session?.access_token;
      if(!token) return;
      const res=await fetch('/api/google/status',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      if(!res.ok) return;
      const b=await res.json() as {status:string|null;canReopen:boolean|null;isClosed:boolean};
      setGStatus(b);
    }catch{/* non-fatal — the local status controls still work */}
  },[googleConnected]);

  useEffect(()=>{ if(sidebarTab==='hours') void loadGoogleStatus(); },[sidebarTab,loadGoogleStatus]);

  /**
   * Dated exception. Written to BOTH Google's specialHours and our own
   * status_updates — otherwise the Google listing says closed while the
   * business's own OpenStatus page still says open.
   * It carries dates, so it expires on its own and there is nothing to undo.
   */
  async function googleCloseDates(from: Date, to: Date, label: string) {
    setGBusy(true);setGMsg('');
    const d=(x:Date)=>({year:x.getFullYear(),month:x.getMonth()+1,day:x.getDate()});
    const iso=(x:Date)=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    let googleOk=false, localOk=false, firstError='';
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const token=session?.access_token;
      if(!token) throw new Error('Session expired — sign in again.');

      // our own page
      try{
        const r=await fetch('/api/status',{
          method:'POST',
          headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
          body:JSON.stringify({action:'closed_dates',startDate:iso(from),endDate:iso(to),headline:label}),
        });
        const b=await r.json().catch(()=>({}));
        if(!r.ok) throw new Error(b?.error ?? 'Could not update your page');
        localOk=true;
      }catch(e){ firstError=e instanceof Error?e.message:'Could not update your page'; }

      // google listing
      if(googleConnected){
        try{
          await googleStatusRequest({action:'special_hours',periods:[{startDate:d(from),endDate:d(to),closed:true}]});
          googleOk=true;
        }catch(e){ if(!firstError) firstError=e instanceof Error?e.message:'Could not update Google'; }
      }

      if(localOk&&(googleOk||!googleConnected)) setGMsg(`✓ ${label}${googleConnected?' — your page and Google updated':' — your page updated'}`);
      else if(localOk) setGMsg(`✓ ${label} — your page updated, but Google failed: ${firstError}`);
      else setGMsg(firstError||'Could not apply that closure');

      await loadStatusUpdates();
    }catch(e){ setGMsg(e instanceof Error?e.message:'Could not apply that closure'); }
    finally{ setGBusy(false); }
  }

  /**
   * Reopen only — closing a listing from here was removed after it left an owner
   * unable to reopen without filing a "suggest an edit" on their own profile.
   *
   * The server re-reads openInfo after the write, so `applied` is Google's real
   * answer. We never claim success just because the PATCH returned 2xx.
   */
  async function googleReopen() {
    setGBusy(true);setGMsg('');
    try{
      const b=await googleStatusRequest({action:'reopen'}) as {
        applied?:boolean|null; message?:string; status?:string|null;
      };
      await loadGoogleStatus();
      if(b.applied===true) setGMsg('✓ '+(b.message??'Google now reports this listing as open.'));
      else setGMsg(b.message??'Google did not apply the reopen. Check your listing directly.');
    }catch(e){ setGMsg(e instanceof Error?e.message:'Could not update Google'); }
    finally{ setGBusy(false); }
  }

  function addCustomTag() {
    const t=tagDraft.trim();
    if(!t) return;
    setConfig(c=>{
      const cur=c.tags??[];
      if(cur.includes(t)||cur.length>=3) return c;
      return {...c,tags:[...cur,t]};
    });
    setTagDraft('');
  }

  async function saveSlug() {
    if(!localBusiness?.id||!slugEdit) return;
    setSlugSaving(true);setSlugMsg('');
    const clean=slugEdit.toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'').slice(0,48);
    if(!clean){setSlugSaving(false);setSlugMsg('Pick a link name.');return;}
    const {error}=await supabase.from('businesses').update({slug:clean}).eq('id',localBusiness.id);
    setSlugSaving(false);
    if(error){
      setSlugMsg(/duplicate|unique/i.test(error.message)?'That link is already taken — try another.':error.message);
      return;
    }
    setSlugEdit(clean);
    setLocalBusiness(b=>b?{...b,slug:clean}:b);
    setSlugMsg('✓ Link updated');
  }

  async function sendPasswordReset() {
    setPwSending(true);setPwMsg('');
    const {data:{session}}=await supabase.auth.getSession();
    const email=session?.user?.email;
    if(!email){setPwSending(false);setPwMsg('No email on this account.');return;}
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/login`});
    setPwSending(false);
    setPwMsg(error?error.message:`✓ Reset link sent to ${email}`);
  }

  async function deleteAccount() {
    if(deleteConfirm!=='DELETE') return;
    setDeleting(true);setDeleteMsg('');
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const token=session?.access_token;
      if(!token) throw new Error('Session expired — sign in again.');
      const r=await fetch('/api/account/delete',{
        method:'DELETE',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({confirm:'DELETE'}),
      });
      const d=await r.json() as {error?:string};
      if(!r.ok||d.error) throw new Error(d.error??'Could not delete account');
      await supabase.auth.signOut();
      window.location.href='/';
    }catch(e){
      setDeleting(false);
      setDeleteMsg(e instanceof Error?e.message:'Could not delete account');
    }
  }

  async function saveBizInfo() {
    if(!business?.id)return;
    setBizSaving(true);setBizSaveError('');setBizSaved(false);
    const update:Record<string,string|null>={
      name:bizEdit.name.trim()||null,
      category:bizEdit.category||null,
      phone:bizEdit.phone.trim()||null,
      website:bizEdit.website.trim()||null,
      address:bizEdit.address.trim()||null,
    };
    const {error}=await supabase.from('businesses').update(update).eq('id',business.id);
    setBizSaving(false);
    if(error){setBizSaveError(error.message);return;}
    setLocalBusiness(b=>b?{...b,...update,name:update.name??b.name}:b);
    setBizSaved(true);setTimeout(()=>setBizSaved(false),2500);
  }

  // Hours table row
  function HoursRow({dayKey,label,idx}:{dayKey:WeekDay;label:string;idx:number}) {
    const day=hours[dayKey];
    return (
      <div className={`flex items-center gap-4 px-5 ${idx<DAYS.length-1?'border-b border-[#F5F5F5]':''}`} style={{height:64}}>
        <span className="text-[13px] font-semibold text-[#0A0A0A] w-28 flex-shrink-0">{label}</span>
        <button
          onClick={()=>setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[dayKey]:{...day,closed:!day.closed}}}))}
          className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold flex-shrink-0 transition-all ${day.closed?'border-[#DEDEDC] text-[#858585] bg-white hover:border-[#D0D0D0]':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
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

  const SIDEBAR_NAV: { key:SidebarTab; label:string; icon:React.ReactNode; badge?:React.ReactNode }[] = [
    { key:'business', label:'Business', icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { key:'hours',    label:'Status',   icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
      badge:<span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium leading-none" style={{color:liveStatus==='open'?'#16A34A':'#98A2B3'}}>
        <span className="w-1.5 h-1.5 rounded-full" style={{background:liveStatus==='open'?'#16A34A':'#98A2B3'}}/>
        {liveStatus==='open'?'Open':'Closed'}
      </span> },
    { key:'design',   label:'Blocks',   icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key:'style',    label:'Style',    icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.58a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"/><path d="M14.5 17.5 4.5 15"/></svg> },

    { key:'analytics',label:'Analytics',icon:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
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
  // Escape hatch: clears every owner closure, re-publishes the weekly hours to the
  // table the public page reads, and reopens the Google listing if it is closed.
  // Needed because a failed hours save used to leave a page stuck on "closed"
  // with nothing in the UI to undo.
  const [reopenMsg,setReopenMsg]=useState<string>('');
  const reopenEverything=async()=>{
    setStatusPosting(true);setReopenMsg('');
    const problems:string[]=[];
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s?.session?.access_token;
      if(!token){setReopenMsg('Your session expired — sign in again.');setStatusPosting(false);return;}
      const r=await fetch('/api/status',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action:'clear'})});
      if(!r.ok) problems.push('could not clear your closures');
    }catch{ problems.push('could not clear your closures'); }
    if(business?.id&&config.weeklyHours){
      try{ await syncHoursToDb(business.id, config.weeklyHours); }
      catch(e){ problems.push(e instanceof Error?e.message:'hours did not republish'); }
    }
    if(googleConnected&&gStatus?.isClosed&&gStatus.canReopen!==false){
      try{ await googleReopen(); }
      catch{ problems.push('Google would not reopen — try the Temporarily closed tab'); }
    }
    await loadStatusUpdates();
    setReopenMsg(problems.length?problems.join(' · '):'✓ You\u2019re open again — your regular hours are live.');
    setStatusPosting(false);
    setTimeout(()=>setReopenMsg(''),8000);
  };
  /**
   * A change to today's hours is a change to today's hours everywhere.
   *
   * The point of OpenStatus is that the owner edits in one place and every
   * linked surface follows, so closing today or closing early writes BOTH the
   * OpenStatus page and — when connected — Google, as a dated specialHours
   * period. Dated is the important part: it expires by itself, so this can
   * never strand a listing the way openInfo.status did.
   *
   * A note is the one exception. Google has nowhere to put free text, so it
   * stays on the OpenStatus page and the UI says so.
   */
  const postStatus=async(preset:string)=>{
    setStatusPosting(true);setGMsg('');
    let pageOk=false; let firstError='';
    try{
      const {data:s}=await supabase.auth.getSession();
      const token=s?.session?.access_token;
      if(!token){setStatusPosting(false);return;}
      const body:Record<string,string>={action:'publish',preset};
      if(preset==='early_close') body.closesAt=statusCloseTime;
      if(preset==='custom_hours'){ body.opensAt=todayOpen; body.closesAt=todayClose; }
      if(preset==='note_today') body.note=statusNote;
      const r=await fetch('/api/status',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(r.ok) pageOk=true;
      else {
        const b=await r.json().catch(()=>({}));
        firstError=b?.error ?? 'Could not update your page';
      }
    }catch(e){ firstError=e instanceof Error?e.message:'Could not update your page'; }

    // Mirror to Google as a dated exception for today.
    let googleOk=false;
    const syncsToGoogle = googleConnected && preset!=='note_today';
    if(pageOk && syncsToGoogle){
      try{
        const now=new Date();
        const d={year:now.getFullYear(),month:now.getMonth()+1,day:now.getDate()};
        const period = preset==='closed_today'
          ? { startDate:d, endDate:d, closed:true }
          : (()=>{
              const day = config.weeklyHours?.[(['sun','mon','tue','wed','thu','fri','sat'] as WeekDay[])[now.getDay()]];
              // custom_hours sets both ends; early_close keeps the usual opening.
              const openStr  = preset==='custom_hours' ? todayOpen  : (day?.open ?? '09:00');
              const closeStr = preset==='custom_hours' ? todayClose : statusCloseTime;
              const [oh,om] = openStr.split(':').map(Number);
              const [ch,cm] = closeStr.split(':').map(Number);
              return { startDate:d, endDate:d, openTime:{hours:oh,minutes:om}, closeTime:{hours:ch,minutes:cm} };
            })();
        await googleStatusRequest({action:'special_hours',periods:[period]});
        googleOk=true;
      }catch(e){ if(!firstError) firstError=e instanceof Error?e.message:'Could not update Google'; }
    }

    if(pageOk && (googleOk || !syncsToGoogle)){
      setGMsg(preset==='note_today'
        ? '✓ Note added to your page'
        : googleConnected
          ? '✓ Updated on your page and Google'
          : '✓ Updated on your page');
    } else if(pageOk){
      setGMsg(`✓ Your page updated, but Google failed: ${firstError}`);
    } else {
      setGMsg(firstError||'Could not post that update');
    }

    await loadStatusUpdates();
    if(pageOk) setStatusNote('');
    setStatusPosting(false);
  };

  /**
   * Undo today's change in both places: clear the OpenStatus update and wipe
   * today's Google specialHours period so the listing falls back to the
   * regular week immediately rather than at midnight.
   */
  const clearStatusEverywhere=async()=>{
    setStatusPosting(true);setGMsg('');
    await clearStatus();
    if(googleConnected){
      try{
        await googleStatusRequest({action:'special_hours',periods:[]});
        setGMsg('✓ Back to your regular hours on your page and Google');
      }catch(e){ setGMsg(e instanceof Error?e.message:'Cleared your page, but Google failed'); }
    } else {
      setGMsg('✓ Back to your regular hours');
    }
    setStatusPosting(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ if(sidebarTab==='hours') loadStatusUpdates(); },[sidebarTab,hoursSubTab]);
  useEffect(()=>{
    if(sidebarTab!=='analytics'&&sidebarTab!=='business') return;
    setAnalyticsLoading(true);
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session?.access_token){setAnalyticsLoading(false);return;}
      try{
        const r=await fetch(`/api/analytics?days=${analyticsDays}`,{headers:{Authorization:'Bearer '+session.access_token}});
        const d=await r.json().catch(()=>({}));
        if(r.ok) setAnalyticsData(d);
      }finally{setAnalyticsLoading(false);}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[sidebarTab,analyticsDays]);
  useEffect(()=>{
    const check=()=>setIsMobile(window.innerWidth<768);
    check();
    window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  // ── Backfill the Google rating for accounts created before we pulled it ──
  // New signups seed reviewStars during setup, but existing businesses have a
  // place_id and no rating. Fetch it once on load so the header stars appear
  // without the owner having to paste a profile URL and hit Fetch by hand.
  const ratingBackfilled=useRef(false);
  useEffect(()=>{
    if(ratingBackfilled.current) return;
    const placeId=config.placeId;
    if(!placeId) return;
    const loc=config.blocks.find(b=>b.id==='location');
    if(loc?.reviewStars&&loc.reviewStars>0) return; // already has one
    ratingBackfilled.current=true;
    void (async()=>{
      try{
        const r=await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
        if(!r.ok) return;
        const d=await r.json() as {rating?:number;reviewCount?:number};
        if(!d.rating||d.rating<=0) return;
        setConfig(c=>({
          ...c,
          blocks:c.blocks.map(b=>b.id==='location'
            ?{...b,reviewStars:d.rating,...(d.reviewCount?{reviewCount:d.reviewCount}:{})}
            :b),
        }));
      }catch{/* non-fatal — owner can still set it manually in Business */}
    })();
  },[config.placeId,config.blocks]);

  // The font swatches each render in their own family, so every face has to be
  // loaded — not just the selected one. Without this, Playfair, Pacifico and
  // Lobster all fell back to the same generic serif and the picker was useless.
  useEffect(()=>{
    if(sidebarTab!=='style') return;
    for(const opt of FONT_OPTIONS){
      if(!opt.google) continue;
      const id=`gfont-${opt.google}`;
      if(document.getElementById(id)) continue;
      const link=document.createElement('link');
      link.id=id; link.rel='stylesheet';
      link.href=`https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
      document.head.appendChild(link);
    }
  },[sidebarTab]);

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

  // Auto-save after publish: debounce config changes and silently save
  const autosaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const isInitialMount=useRef(true);
  useEffect(()=>{
    if(isInitialMount.current){isInitialMount.current=false;return;}
    if(!hasPublished)return; // only autosave once published
    if(autosaveTimer.current)clearTimeout(autosaveTimer.current);
    autosaveTimer.current=setTimeout(()=>{
      setSaving(true);setSaveError('');
      savePageConfig(business?.id,config).then(async ({error})=>{
        if(!error&&business?.id&&config.weeklyHours){
          try{ await syncHoursToDb(business.id, config.weeklyHours); }
          catch{/* surfaced on an explicit save */}
        }
        setSaving(false);
        if(!error){setSaved(true);setTimeout(()=>setSaved(false),2000);}
        else{setSaveError(error.message);}
      });
    },1500);
    return ()=>{if(autosaveTimer.current)clearTimeout(autosaveTimer.current);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[config,hasPublished]);

  const closeEarlyTimes: string[] = [];
  for(let h=7;h<22;h++) for(const m of [0,30]) closeEarlyTimes.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F0F2F5] text-[#111111]" style={{fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>

      {/* ── Undo block removal ── */}
      {undoBlock&&(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-full bg-[#111] shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
          <span className="text-[12px] text-white/85">
            <strong className="font-semibold text-white">{undoBlock.title}</strong> removed
          </span>
          <button onClick={undoRemove}
            className="px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors">
            Undo
          </button>
        </div>
      )}

      {/* ── Help ── */}
      {helpOpen&&(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{background:'rgba(17,17,17,0.35)',backdropFilter:'blur(3px)'}}
          onClick={()=>setHelpOpen(false)}>
          <div className="w-full max-w-[380px] rounded-2xl bg-white border border-[#EBEBEA] shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-[16px] font-semibold text-[#111]">Need a hand?</h3>
              <button onClick={()=>setHelpOpen(false)} aria-label="Close"
                className="w-7 h-7 rounded-full bg-[#F4F6FA] flex items-center justify-center text-[#667085] hover:text-[#111] transition-colors flex-shrink-0">
                <LucideX size={12} color="currentColor"/>
              </button>
            </div>
            <p className="text-[13px] text-[#667085] leading-relaxed mb-5">
              Email us and a real person will get back to you. Tell us what you were trying to do and we&apos;ll sort it out.
            </p>
            <a href="mailto:info@openstatus.co?subject=OpenStatus%20help"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-[13px] font-semibold hover:bg-[#6D28D9] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>
              Email info@openstatus.co
            </a>
          </div>
        </div>
      )}



      {/* ── LEFT SIDEBAR (desktop) ── */}
      <aside className="w-[220px] flex-shrink-0 flex-col bg-white/80 backdrop-blur border-r border-[#EBEBEA]" style={{display:isMobile?"none":"flex"}}>
        {/* Wordmark */}
        <div className="px-5 h-14 flex items-center flex-shrink-0">
          <span className="font-semibold text-[18px] tracking-[-0.03em] text-[#111111]" style={{fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>OpenStatus</span>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-0.5">
          {SIDEBAR_NAV.map(({key,label,icon,badge})=>(
            <button key={key} onClick={()=>{setSidebarTab(key);setMobileSheetOpen(true);}}
              className={`relative w-full flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all ${
                sidebarTab===key ? 'bg-[#F5F3FF]' : 'hover:bg-[#FAFAF9]'
              }`}
              style={{color:sidebarTab===key?'#6D28D9':'#667085'}}>
              {/* purple left-edge marker on the active item */}
              {sidebarTab===key&&(
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{background:'#7C3AED'}}/>
              )}
              <span style={{color:sidebarTab===key?'#7C3AED':'#98A2B3'}}>{icon}</span>
              {label}
              {badge}
            </button>
          ))}
        </nav>
        {/* Bottom CTAs */}
        <div className="px-4 py-4 border-t border-[#EBEBEA] flex-shrink-0 space-y-2.5">
          <button
            onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login'; }}
            className="w-full flex items-center gap-2 text-[11px] font-normal text-[#667085] hover:text-[#6D28D9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
          <button onClick={()=>setHelpOpen(true)} className="w-full flex items-center gap-2 text-[11px] font-normal text-[#667085] hover:text-[#6D28D9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F7F7F5]">

        {/* ── TOP NAV BAR ── */}
        <header className="relative h-14 items-center justify-between px-4 md:px-6 flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-[#EBEBEA]" style={{display:isMobile?"none":"flex"}}>
          <span className="text-[13px] font-medium text-[#111111]" style={{fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>{sidebarLabel}</span>
          <div className="flex items-center gap-3">
            {business?.slug&&(
              <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 text-[12px] font-medium text-[#667085] hover:text-[#6D28D9] transition-colors">
                View your link <span className="text-[#98A2B3]">↗</span>
              </a>
            )}

            <div className="flex flex-col items-end gap-0.5">
              {showSaveButton&&(
              <button onClick={save} disabled={saving} data-tut="tut-save"
                className={`px-4 py-1.5 rounded-full text-[12px] md:text-[13px] md:px-5 font-semibold transition-all flex-shrink-0 ${saved?'bg-[#EDE9FE] text-[#5B21B6]':saving?'bg-[#F4F6FA] text-[#98A2B3]':saveError?'bg-red-100 text-red-600':hasPublished?'bg-[#F5F3FF] text-[#6D28D9] hover:bg-[#EDE9FE]':'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'}`}>
                {saving?'Saving…':saved?'✓ Saved':saveError?'Error':hasPublished?'Save':'Publish'}
              </button>
              )}
              {sidebarTab==='hours'&&(
                <span className="text-[11px] text-[#98A2B3] hidden sm:block">Changes here go live right away</span>
              )}
              {saveError&&<p className="text-[10px] text-red-500 max-w-[160px] text-right leading-tight">{saveError}</p>}
              {googleConnected&&googleSyncStatus==='syncing'&&<p className="text-[10px] text-[#4285F4] text-right">Syncing to Google…</p>}
              {googleConnected&&googleSyncStatus==='ok'&&<p className="text-[10px] text-[#166534] text-right">✓ Synced to Google</p>}
              {googleConnected&&googleSyncStatus==='pending'&&(
                <p className="text-[10px] text-[#B54708] max-w-[180px] text-right leading-tight">Saved here · Google sync pending</p>
              )}
              {googleConnected&&googleSyncStatus&&typeof googleSyncStatus==='object'&&(
                <p className="text-[10px] text-[#C4453F] max-w-[160px] text-right leading-tight" title={googleSyncStatus.error}>Google sync failed — check Integrations tab</p>
              )}
            </div>

          </div>
        </header>

        {/* ── CONTENT + RIGHT PREVIEW ── */}
        <div className="flex-1 overflow-hidden select-none" style={{display:isMobile?"none":"flex"}}>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 overflow-y-auto min-w-0 pb-[env(safe-area-inset-bottom)] md:pb-0 bg-white/72 backdrop-blur-md rounded-tl-2xl" style={{maxWidth:contentMaxWidth}}>

            {/* ══ HOURS & STATUS ══ */}
            {sidebarTab==='hours'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-[26px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.04em]">
                    Status
                  </h1>
                  <p className="text-[#858585] text-[14px] mt-1.5 leading-relaxed">
                    Close for today, or open back up. Your normal week lives in the Hours block.
                  </p>
                </div>

                {/* Google recovery — only when Google itself reports the listing closed */}
                {googleConnected&&gStatus?.isClosed&&(
                  <div className="rounded-2xl border border-[#FEC84B] bg-[#FFFCF5] p-4 mb-5">
                    <p className="text-[13px] font-semibold text-[#111] mb-1">
                      Google lists you as {gStatus.status==='CLOSED_TEMPORARILY'?'temporarily closed':(gStatus.status??'closed')}
                    </p>
                    <p className="text-[12px] text-[#B54708] leading-relaxed mb-3">
                      Google reviews reopenings, so this can take a few days to show.
                    </p>
                    <button disabled={gBusy||gStatus.canReopen===false}
                      onClick={()=>void googleReopen()}
                      className="px-4 py-2 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                      {gBusy?'Asking Google…':'Ask Google to reopen'}
                    </button>
                  </div>
                )}

                {/*
                  ONE decision, one button.

                  This panel used to have sub-tabs, a "live status" list, a reset
                  button with a paragraph of explanation and a separate presets
                  grid. All of it expressed the same two states a shop owner
                  actually has: I'm open, or I'm not. Everything else is now
                  secondary and folded away.
                */}
                {(()=>{
                  const active = statusUpdates.filter(u=>u.status!=='needs_review');
                  const isOverridden = active.length>0;
                  return (
                    <div className={`rounded-[22px] border p-6 mb-4 transition-colors ${isOverridden?'border-[#FDE68A] bg-[#FFFCF5]':'border-[#DEDEDC] bg-white'}`}>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full ${isOverridden?'bg-amber-500':liveStatus==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                        <p className="text-[19px] font-semibold text-[#111] tracking-[-0.02em]">
                          {isOverridden ? active[0].headline : liveStatus==='open' ? 'You’re open' : 'Closed right now'}
                        </p>
                      </div>
                      <p className="text-[13px] text-[#858585] mb-5 leading-relaxed">
                        {isOverridden
                          ? 'This is what customers see instead of your normal hours today.'
                          : liveStatus==='open'
                            ? `Your normal hours for today — ${todayLabel}.`
                            : `Outside your normal hours for today — ${todayLabel}.`}
                      </p>

                      {isOverridden ? (
                        <button
                          onClick={reopenEverything}
                          disabled={statusPosting}
                          className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#16A34A] text-white text-[14px] font-semibold hover:bg-[#15803D] transition-colors disabled:opacity-40"
                        >
                          {statusPosting?'Working…':'I’m open again'}
                        </button>
                      ) : (
                        <button
                          onClick={()=>postStatus('closed_today')}
                          disabled={statusPosting}
                          className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#111] text-white text-[14px] font-semibold hover:bg-black transition-colors disabled:opacity-40"
                        >
                          {statusPosting?'Working…':'Close for today'}
                        </button>
                      )}

                      {gMsg&&<p className={`text-[12px] mt-3 ${gMsg.startsWith('✓')?'text-[#166534]':'text-[#EF4444]'}`}>{gMsg}</p>}
                      {reopenMsg&&<p className={`text-[12px] mt-2 ${reopenMsg.startsWith('✓')?'text-emerald-600':'text-[#EF4444]'}`}>{reopenMsg}</p>}
                    </div>
                  );
                })()}

                {/* Everything else is a rarer case, so it stays out of the way. */}
                <button
                  onClick={()=>setStatusMore(v=>!v)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-[#667085] hover:text-[#111] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    style={{transform:statusMore?'rotate(90deg)':'none',transition:'transform .18s'}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  Something else
                </button>

                {statusMore&&(
                  <div className="mt-4 space-y-3">
                    {/* Different hours today — the common case that wasn't
                        covered by "closed" or "closing early". */}
                    <div className="p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                      <p className="text-[13px] font-semibold text-[#111]">Different hours today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        {googleConnected?'Sets today\u2019s opening and closing on your page and on Google.':'Sets today\u2019s opening and closing on your page.'}
                      </p>
                      <div className="flex items-center gap-2 max-w-[400px]">
                        <select value={todayOpen} onChange={e=>setTodayOpen(e.target.value)}
                          className="flex-1 bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none cursor-pointer">
                          {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                        </select>
                        <span className="text-[12px] text-[#98A2B3]">to</span>
                        <select value={todayClose} onChange={e=>setTodayClose(e.target.value)}
                          className="flex-1 bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none cursor-pointer">
                          {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                        </select>
                        <button onClick={()=>postStatus('custom_hours')} disabled={statusPosting||todayClose<=todayOpen}
                          className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                          {statusPosting?'…':'Set'}
                        </button>
                      </div>
                      {todayClose<=todayOpen&&(
                        <p className="text-[11px] text-[#EF4444] mt-2">Closing time has to be after the opening time.</p>
                      )}
                    </div>

                    {/* Closing early */}
                    <div className="p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                      <p className="text-[13px] font-semibold text-[#111]">Closing early today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        {googleConnected?'Your page and Google show the earlier time, today only.':'Your page shows the earlier time, today only.'}
                      </p>
                      <div className="flex items-center gap-2 max-w-[320px]">
                        <div className="relative flex-1">
                          <select value={statusCloseTime} onChange={e=>setStatusCloseTime(e.target.value)}
                            className="w-full bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none cursor-pointer">
                            {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                          </select>
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevronDown size={11} color="#858585"/></div>
                        </div>
                        <button onClick={()=>postStatus('early_close')} disabled={statusPosting}
                          className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                          {statusPosting?'…':'Set'}
                        </button>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                      <p className="text-[13px] font-semibold text-[#111]">Add a note for today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        Shows beside your hours without marking you closed. Your page only — Google has nowhere to put free text.
                      </p>
                      <textarea value={statusNote} onChange={e=>setStatusNote(e.target.value.slice(0,100))}
                        placeholder="Running about 20 minutes behind today…" rows={2}
                        className="w-full bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none resize-none"/>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-[#C0C0C0]">{statusNote.length}/100</span>
                        <button onClick={()=>postStatus('note_today')} disabled={statusPosting||!statusNote.trim()}
                          className="px-4 py-2 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                          {statusPosting?'…':'Add note'}
                        </button>
                      </div>
                    </div>

                    {/* Dated closures — the old "Special hours" tab, now just a row of buttons */}
                    <div className="p-4 rounded-2xl border border-[#DEDEDC] bg-white">
                      <p className="text-[13px] font-semibold text-[#111]">Closing on another day</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        Has real dates on it, so your hours come back by themselves
                        {googleConnected?' — and it updates Google too.':'.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          {label:'Tomorrow',     days:1 },
                          {label:'This weekend', days:-1},
                        ]).map(({label,days})=>(
                          <button key={label} disabled={gBusy}
                            onClick={()=>{
                              const now=new Date();
                              let from=new Date(now), to=new Date(now);
                              if(days===1){ from.setDate(now.getDate()+1); to=new Date(from); }
                              if(days===-1){
                                const dow=now.getDay();
                                from=new Date(now); from.setDate(now.getDate()+((6-dow+7)%7));
                                to=new Date(from);  to.setDate(from.getDate()+1);
                              }
                              void googleCloseDates(from,to,`Closed ${label.toLowerCase()}`);
                            }}
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] hover:border-[#7C3AED] transition-colors disabled:opacity-40">
                            <LucideCalendar size={13} color="#7C3AED"/>
                            <span className="text-[12px] font-semibold text-[#111]">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
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
                      <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight">Design</h2>
                      <p className="text-[#858585] text-[13px] mt-1">Tap any block to edit it. Drag to reorder.</p>
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
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${liveStatus==='open'?'bg-[#DCFCE7] text-[#166534]':'bg-[#EEEEEC] text-[#858585]'}`}>
                                  {liveStatus==='open'?'● open':'● closed'}
                                </span>
                              )}
                              {block.size==='half'&&<span className="text-[9px] px-1.5 py-0.5 rounded bg-[#EEEEEC] text-[#858585] flex-shrink-0" title="Half width">Half</span>}
                              {blockNeedsSetup(block)&&(
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 bg-[#FEF0C7] text-[#B54708]"
                                  title="This block has no link yet, so it won't appear on your live page">
                                  Needs setup
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[#858585] leading-tight mt-0.5 truncate">
                              {block.id==='hours'?todayLabel:block.sub}
                            </p>
                          </div>
                          <LucideChevronRight size={13} color="#D0D0D0"/>
                          {block.id!=='hours'&&(
                            <button
                              onClick={e=>{e.stopPropagation();removeBlock(block.id);}}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[#C0C0C0] hover:text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all flex-shrink-0"
                              title="Remove block">
                              <LucideX size={11} color="currentColor"/>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mb-10">
                      <button data-tut="tut-add" onClick={()=>setShowPicker(true)}
                        className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[#D8D8D8] text-[#858585] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-all">
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center flex-shrink-0">
                          <span className="text-[14px] leading-none">+</span>
                        </div>
                        <span className="text-[13px] font-medium">Add block</span>
                      </button>
                      <button onClick={addCustomLink}
                        className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[#DDD6FE] text-[#6D28D9] hover:border-[#7C3AED] hover:bg-[#FAFAFF] transition-all">
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center flex-shrink-0">
                          <span className="text-[14px] leading-none">+</span>
                        </div>
                        <span className="text-[13px] font-medium">Add link</span>
                      </button>
                    </div>

                    {/* Style: logo + background + socials */}
                    <div className="space-y-8 border-t border-[#F0F0F0] pt-8">
                      <div>
                        <p className="text-[14px] font-semibold text-[#0A0A0A] mb-1">Style</p>
                        <p className="text-[#858585] text-[13px] mb-5">Logo, page color, and fonts.</p>
                        {/* Logo upload */}
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-3">Logo</p>
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
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-3 mt-6">Page background</p>
                        <PageBackgroundPicker value={config.bg} onChange={(v,a,sp)=>setConfig(p=>({...p,bg:v,bgAnim:a,bgAnimSpeed:sp}))}/>
                      </div>


                      {/* Background photo */}
                      <div>
                        <p className="text-[11px] font-semibold text-[#858585] uppercase tracking-[0.12em] mb-3">Cover photo</p>
                        {config.bgImage&&(
                          <CoverPhotoCrop
                            src={config.bgImage}
                            position={config.bgImagePosition}
                            onChange={pos=>setConfig(c=>({...c,bgImagePosition:pos}))}
                            onRemove={()=>setConfig(c=>({...c,bgImage:undefined,bgImagePosition:undefined}))}
                          />
                        )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className={`cursor-pointer ${bgUploading?'pointer-events-none opacity-60':''}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                          const file=e.target.files?.[0];if(!file)return;
                          setBgUploading(true);setBgUploadError('');
                          try{
                            const ref=await uploadAsset(file,'header');
                            const bgUrl=localBusiness?.id?`/api/assets?businessId=${localBusiness.id}&kind=header&v=${encodeURIComponent(ref.replace(/^storage:/,''))}`:ref;
                            setConfig(c=>({...c,bgImage:bgUrl}));
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
                </div>
                  </>
                )}
              </div>
            )}

            {/* ══ BUSINESS ══ */}
            {sidebarTab==='business'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-semibold text-[#111111] leading-tight tracking-[-0.03em]">Business</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Your page, your Google connection, and how you&apos;re doing.</p>
                </div>

                {/* ── Analytics snapshot ── */}
                {analyticsData&&(
                  <div className="mb-7">
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Last 30 days</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {label:'Page views',value:analyticsData.metrics.views,color:'#12B76A',data:(analyticsData.trend??[]).map(t=>t.views)},
                        {label:'Directions',value:analyticsData.metrics.directions,color:'#2563EB',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                        {label:'Menu taps',value:analyticsData.metrics.menu,color:'#7C3AED',data:(analyticsData.trend??[]).map(t=>t.views)},
                        {label:'Link clicks',value:analyticsData.metrics.clicks,color:'#D97706',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                      ].map(({label,value,color,data})=>(
                        <div key={label} className="rounded-2xl border border-[#EBEBEA] bg-white p-3.5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{background:`${color}14`,color}}>
                                {METRIC_ICONS[label]}
                              </span>
                              <p className="text-[11px] font-medium text-[#98A2B3] truncate">{label}</p>
                            </div>
                            <BuilderSparkline data={data} color={color}/>
                          </div>
                          <p className="text-[22px] font-semibold text-[#111] leading-none">{value.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analyticsLoading&&(
                  <div className="mb-7 rounded-2xl border border-[#EBEBEA] bg-white p-5 text-center">
                    <p className="text-[13px] text-[#98A2B3]">Loading analytics…</p>
                  </div>
                )}

                {/* ── Live page link ── */}
                {localBusiness?.slug&&(
                  <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl border border-[#DEDEDC] bg-[#F9FAFB]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-0.5">Your page</p>
                      <p className="text-[13px] font-medium text-[#111] truncate">{SITE_DOMAIN}/{localBusiness.slug}</p>
                    </div>
                    <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] hover:bg-[#FAFAF9] transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View
                    </a>
                  </div>
                )}

                {/* ── Google connection status ── */}
                <div className={`mb-5 p-4 rounded-2xl border ${googleConnected?'border-[#BBF7D0] bg-[#F0FDF4]':'border-[#E8EBF0] bg-[#F9FAFB]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E8EBF0] flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#111]">Google Business</p>
                      <p className="text-[11px] text-[#98A2B3]">{googleConnected?'Syncing hours, photos & reviews':'Sync your hours, photos & reviews'}</p>
                    </div>
                    {googleConnected&&(
                      <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#BBF7D0] text-[#166534] text-[10px] font-semibold">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Connected
                      </span>
                    )}
                  </div>
                  {!googleConnected&&(
                    <a href="/connect/google"
                      className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] hover:bg-[#FAFAF9] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Connect Google Business
                    </a>
                  )}
                </div>

                {/* ── Reviews & rating ── */}
                <ReviewsCard block={allBlocks.find(b=>b.id==='location')} placeId={config.placeId} onUpdateBlock={u=>updateBlock('location',u)}/>

                {/* ── Tips for success ── */}
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Tips for success</p>
                  <div className="space-y-2">
                    {([
                      {tab:'hours' as SidebarTab, bg:'#ECFDF3', fg:'#16A34A', text:"Set your hours so customers always know when you're open"},
                      {tab:'style' as SidebarTab, bg:'#F5F3FF', fg:'#7C3AED', text:'Add a cover photo and pick a background that feels like you'},
                      {tab:'design' as SidebarTab, bg:'#EFF6FF', fg:'#2563EB', text:'Turn on the blocks your customers actually need'},
                    ]).map(({tab,bg,fg,text})=>(
                      <button key={tab} onClick={()=>setSidebarTab(tab)}
                        className="flex items-center gap-3 w-full p-3 rounded-2xl border border-[#E8EBF0] hover:border-[#111] hover:bg-[#F9FAFB] transition-all text-left">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{background:bg,color:fg}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <p className="text-[12px] text-[#667085] leading-relaxed flex-1">{text}</p>
                        <LucideChevronRight size={14} color="#C0C0C0"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ LINKS ══ */}
            {sidebarTab==='links'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-semibold text-[#111111] leading-tight tracking-[-0.03em]">Your link</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Share this anywhere — it always shows your live status.</p>
                </div>
                {localBusiness?.slug
                  ?(
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#DEDEDC] bg-[#F9FAFB]">
                      <p className="flex-1 min-w-0 text-[13px] font-medium text-[#111] truncate">{SITE_DOMAIN}/{localBusiness.slug}</p>
                      <button
                        onClick={()=>{ void navigator.clipboard?.writeText(`${SITE_URL}/${localBusiness.slug}`); }}
                        className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] transition-colors">
                        Copy
                      </button>
                      <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] transition-colors">
                        View
                      </a>
                    </div>
                  )
                  :<p className="text-[13px] text-[#667085]">No link set yet.</p>
                }
              </div>
            )}

            {/* ══ STYLE ══ */}
            {sidebarTab==='style'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px] space-y-8">
                <div>
                  <h2 className="text-[22px] font-semibold text-[#111111] leading-tight tracking-[-0.03em]">Style</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Background, cover photo, and fonts.</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Page background</p>
                  <PageBackgroundPicker value={config.bg} onChange={(v,a,sp)=>setConfig(pc=>({...pc,bg:v,bgAnim:a,bgAnimSpeed:sp}))}/>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Cover photo</p>
                  {config.bgImage&&(
                    <CoverPhotoCrop
                      src={config.bgImage}
                      position={config.bgImagePosition}
                      onChange={pos=>setConfig(c=>({...c,bgImagePosition:pos}))}
                      onRemove={()=>setConfig(c=>({...c,bgImage:undefined,bgImagePosition:undefined}))}
                    />
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className={`cursor-pointer ${bgUploading?'pointer-events-none opacity-60':''}`}>
                      <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                        const file=e.target.files?.[0];if(!file)return;
                        setBgUploading(true);setBgUploadError('');
                        try{
                          const ref=await uploadAsset(file,'header');
                          const bgUrl=localBusiness?.id?`/api/assets?businessId=${localBusiness.id}&kind=header&v=${encodeURIComponent(ref.replace(/^storage:/,''))}`:ref;
                          setConfig(c=>({...c,bgImage:bgUrl}));
                        }catch(err){setBgUploadError(err instanceof Error?err.message:'Upload failed');}
                        finally{setBgUploading(false);e.target.value='';}
                      }}/>
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F6FA] border border-[#E8EBF0] text-[12px] font-medium text-[#111111] hover:bg-[#E8EBF0] transition-colors">
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

                {/* ── Logo ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Logo</p>
                  <div className="flex items-center gap-4">
                    {localBusiness?.avatar_url
                      ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                          className="w-14 h-14 rounded-full object-cover border border-[#DEDEDC] flex-shrink-0" alt="Logo"/>
                      :<div className="w-14 h-14 rounded-full bg-[#EEEEEC] flex items-center justify-center flex-shrink-0"><LucideImage size={18} color="#C0C0C0"/></div>
                    }
                    <label className={`cursor-pointer ${logoUploading?'pointer-events-none opacity-60':''}`}>
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
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F4F6FA] border border-[#E8EBF0] text-[12px] font-medium text-[#111111] hover:bg-[#E8EBF0] transition-colors">
                        <LucideImage size={13} color="#667085"/>
                        {logoUploading?'Uploading…':'Upload logo'}
                      </span>
                    </label>
                  </div>
                  {logoUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{logoUploadError}</p>}
                </div>

                {/* ── Business name colour ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Business name color</p>
                  <NameColorPicker
                    value={config.nameColor}
                    autoColor={isDarkBg(config.bg)?'#FFFFFF':'#0A0A0A'}
                    onChange={v=>setConfig(c=>({...c,nameColor:v}))}
                  />
                </div>

                {/* ── Tags on the link preview ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-1">Tags</p>
                  <p className="text-[11px] text-[#98A2B3] mb-3">Pick up to 3 — these show under your business name.</p>
                  {/* custom tag entry */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      value={tagDraft}
                      onChange={e=>setTagDraft(e.target.value.slice(0,24))}
                      onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addCustomTag(); } }}
                      placeholder="Add your own…"
                      className="flex-1 min-w-0 bg-white border border-[#DEDEDC] rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-[#7C3AED] transition-colors"/>
                    <button onClick={addCustomTag}
                      disabled={!tagDraft.trim()||(config.tags??[]).length>=3||(config.tags??[]).includes(tagDraft.trim())}
                      className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                      Add
                    </button>
                  </div>

                  {/* chosen tags, including custom ones */}
                  {(config.tags??[]).length>0&&(
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(config.tags??[]).map(tag=>(
                        <button key={`sel-${tag}`}
                          onClick={()=>setConfig(c=>({...c,tags:(c.tags??[]).filter(t=>t!==tag)}))}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-[#7C3AED] text-white">
                          {tag}
                          <LucideX size={9} color="currentColor"/>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_TAGS.filter(t=>!(config.tags??[]).includes(t)).map(tag=>{
                      const sel=(config.tags??[]).includes(tag);
                      const full=(config.tags??[]).length>=3;
                      return (
                        <button key={tag}
                          disabled={!sel&&full}
                          onClick={()=>setConfig(c=>{
                            const cur=c.tags??[];
                            return {...c, tags: cur.includes(tag) ? cur.filter(t=>t!==tag) : (cur.length>=3?cur:[...cur,tag])};
                          })}
                          className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                            sel ? 'bg-[#7C3AED] text-white border-[#111]'
                                : full ? 'border-[#EBEBEA] text-[#D0D5DD] cursor-not-allowed'
                                       : 'border-[#DEDEDC] text-[#667085] hover:border-[#111] hover:text-[#111]'
                          }`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-1">Font</p>
                  <p className="text-[11px] text-[#98A2B3] mb-3">Applies to everything on your page.</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {FONT_OPTIONS.map(opt=>{
                      const isActive=(config.font??FONT_OPTIONS[0].family)===opt.family;
                      return (
                        <button key={opt.family} onClick={()=>setConfig(c=>({...c,font:opt.family}))}
                          className={`flex flex-col items-start px-3 py-2.5 rounded-2xl border transition-all text-left ${isActive?'border-[#111] bg-[#111]':'border-[#E8EBF0] bg-[#F9FAFB] hover:border-[#111]'}`}>
                          <span className={`text-[16px] leading-tight ${isActive?'text-white':'text-[#111]'}`} style={{fontFamily:opt.family}}>Aa</span>
                          <span className={`text-[10px] font-medium mt-0.5 ${isActive?'text-white/70':'text-[#98A2B3]'}`}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══ ANALYTICS ══ */}
            {sidebarTab==='analytics'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[760px] space-y-7">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-[22px] font-semibold text-[#111111] leading-tight tracking-[-0.03em]">Analytics</h2>
                    <p className="text-[#667085] text-[13px] mt-1">What people actually do when they land on your page.</p>
                  </div>
                  <div className="flex gap-1 p-1 rounded-full bg-[#F4F6FA]">
                    {[7,30,90].map(d=>(
                      <button key={d} onClick={()=>setAnalyticsDays(d)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${analyticsDays===d?'bg-white text-[#6D28D9] shadow-sm':'text-[#98A2B3] hover:text-[#111]'}`}>
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                {analyticsLoading&&(
                  <div className="rounded-2xl border border-[#EBEBEA] bg-white p-10 text-center">
                    <p className="text-[13px] text-[#98A2B3]">Loading…</p>
                  </div>
                )}

                {!analyticsLoading&&!analyticsData&&(
                  <div className="rounded-2xl border border-[#EBEBEA] bg-white p-10 text-center">
                    <p className="text-[13px] text-[#98A2B3]">No data yet. Share your link and check back.</p>
                  </div>
                )}

                {!analyticsLoading&&analyticsData&&(()=>{
                  const m = analyticsData.metrics;
                  const trend = analyticsData.trend ?? [];
                  const maxV = Math.max(1, ...trend.map(t=>t.views));
                  const topMax = analyticsData.topActions[0]?.count || 1;
                  const actionRate = m.views ? Math.round((m.clicks/m.views)*100) : 0;
                  const TILES = [
                    {label:'Page views',      value:m.views,          color:'#12B76A'},
                    {label:'Unique visitors', value:m.uniqueVisitors, color:'#7C3AED'},
                    {label:'Directions',      value:m.directions,     color:'#2563EB'},
                    {label:'Menu taps',       value:m.menu,           color:'#D97706'},
                  ];
                  return (
                    <>
                      {/* headline numbers */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {TILES.map(({label,value,color})=>(
                          <div key={label} className="rounded-2xl border border-[#EBEBEA] bg-white p-3.5">
                            <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center mb-2"
                              style={{background:`${color}14`,color}}>{METRIC_ICONS[label]}</span>
                            <p className="text-[24px] font-semibold text-[#111] leading-none">{value.toLocaleString()}</p>
                            <p className="text-[11px] text-[#98A2B3] mt-1.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* views over time */}
                      <div className="rounded-2xl border border-[#EBEBEA] bg-white p-5">
                        <div className="flex items-baseline justify-between mb-4">
                          <p className="text-[13px] font-semibold text-[#111]">Page views over time</p>
                          <p className="text-[11px] text-[#98A2B3]">Peak {maxV.toLocaleString()}</p>
                        </div>
                        {trend.length>0
                          ?(
                            <div className="flex items-end gap-[3px]" style={{height:150}}>
                              {trend.map(t=>(
                                <div key={t.date} className="group relative flex-1 min-w-[3px] h-full flex items-end">
                                  <div className="w-full rounded-t-[3px] bg-[#7C3AED]/80 group-hover:bg-[#6D28D9] transition-colors"
                                    style={{height:`${Math.max(2,(t.views/maxV)*100)}%`}}/>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-lg bg-[#111] px-2 py-1 text-[10px] text-white">
                                    {t.date}: {t.views}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                          :<p className="text-[12px] text-[#98A2B3] py-10 text-center">No visits recorded yet.</p>
                        }
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* what people tap */}
                        <div className="rounded-2xl border border-[#EBEBEA] bg-white p-5">
                          <p className="text-[13px] font-semibold text-[#111] mb-3.5">What people tap</p>
                          {analyticsData.topActions.length>0
                            ?(
                              <div className="space-y-2.5">
                                {analyticsData.topActions.slice(0,6).map(({id,count})=>(
                                  <div key={id} className="flex items-center gap-2.5">
                                    <span className="text-[12px] text-[#111] w-24 truncate capitalize">{id}</span>
                                    <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                                      <div className="h-full bg-[#7C3AED] rounded-full" style={{width:`${Math.round((count/topMax)*100)}%`}}/>
                                    </div>
                                    <span className="text-[11px] text-[#667085] w-8 text-right tabular-nums">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )
                            :<p className="text-[12px] text-[#98A2B3]">Nothing tapped yet.</p>
                          }
                        </div>

                        {/* where they came from */}
                        <div className="rounded-2xl border border-[#EBEBEA] bg-white p-5">
                          <p className="text-[13px] font-semibold text-[#111] mb-3.5">Where they came from</p>
                          {analyticsData.trafficSources.length>0
                            ?(
                              <div className="space-y-2.5">
                                {analyticsData.trafficSources.slice(0,6).map(({source,count})=>(
                                  <div key={source} className="flex items-center justify-between gap-2">
                                    <span className="text-[12px] text-[#111] truncate">{source||'Direct'}</span>
                                    <span className="text-[11px] text-[#667085] tabular-nums">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )
                            :<p className="text-[12px] text-[#98A2B3]">No referrers yet — most link-in-bio traffic shows as Direct.</p>
                          }
                        </div>
                      </div>

                      {/* one honest summary line */}
                      <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-5">
                        <p className="text-[13px] font-semibold text-[#6D28D9]">
                          {actionRate}% of visitors did something
                        </p>
                        <p className="text-[12px] text-[#667085] mt-1 leading-relaxed">
                          {m.clicks.toLocaleString()} taps from {m.views.toLocaleString()} views in the last {analyticsDays} days.
                          Your own visits aren&apos;t counted.
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ══ SETTINGS ══ */}
            {sidebarTab==='settings'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[640px] space-y-8">
                <div>
                  <h2 className="text-[22px] font-semibold text-[#111111] leading-tight tracking-[-0.03em]">Settings</h2>
                  <p className="text-[#667085] text-[13px] mt-1">Your business, your link, your account.</p>
                </div>

                {/* ── Business name ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Business name</p>
                  <div className="rounded-2xl border border-[#E8EBF0] p-4 bg-white space-y-3">
                    <input value={bizEdit.name} onChange={e=>setBizEdit(bz=>({...bz,name:e.target.value}))}
                      placeholder="Your business name"
                      className="w-full bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#111] transition-colors"/>
                    <div className="flex items-center gap-2">
                      <button onClick={saveBizInfo} disabled={bizSaving||!bizEdit.name.trim()}
                        className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                        {bizSaving?'Saving…':bizSaved?'✓ Saved':'Save name'}
                      </button>
                    </div>
                    {bizSaveError&&<p className="text-[11px] text-red-500">{bizSaveError}</p>}
                    <p className="text-[11px] text-[#98A2B3]">This is the name shown at the top of your page.</p>
                  </div>
                </div>

                {/* ── Link name (slug) ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Your link</p>
                  <div className="rounded-2xl border border-[#E8EBF0] p-4 bg-white space-y-3">
                    <div className="flex items-stretch gap-0">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#DEDEDC] bg-[#F9FAFB] text-[12px] text-[#98A2B3] whitespace-nowrap">{SITE_DOMAIN}/</span>
                      <input value={slugEdit} onChange={e=>{setSlugEdit(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,48));setSlugMsg('');}}
                        placeholder="your-business"
                        className="flex-1 min-w-0 bg-white border border-[#DEDEDC] rounded-r-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#111] transition-colors"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={saveSlug} disabled={slugSaving||!slugEdit||slugEdit===localBusiness?.slug}
                        className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                        {slugSaving?'Saving…':'Update link'}
                      </button>
                      {localBusiness?.slug&&(
                        <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] transition-colors">
                          Open ↗
                        </a>
                      )}
                    </div>
                    {slugMsg&&<p className={`text-[11px] ${slugMsg.startsWith('✓')?'text-[#166534]':'text-red-500'}`}>{slugMsg}</p>}
                    <p className="text-[11px] text-[#98A2B3]">Changing this breaks any link you&apos;ve already shared. Letters, numbers and dashes only.</p>
                  </div>
                </div>

                {/* ── Plan ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Plan</p>
                  <div className="rounded-2xl border border-[#E8EBF0] bg-white overflow-hidden">
                    <div className="p-4 flex items-center gap-3 border-b border-[#F4F6FA]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111]">Free</p>
                        <p className="text-[11px] text-[#98A2B3] mt-0.5">Your current plan.</p>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#F4F6FA] text-[#667085] text-[10px] font-semibold">Active</span>
                    </div>
                    <div className="p-4">
                      <p className="text-[13px] font-semibold text-[#111] mb-2">Pro</p>
                      <div className="space-y-1.5 mb-3">
                        {['Remove OpenStatus branding from your page','Full visitor analytics'].map(f=>(
                          <div key={f} className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span className="text-[12px] text-[#667085]">{f}</span>
                          </div>
                        ))}
                      </div>
                      <button disabled
                        className="w-full py-2.5 rounded-xl bg-[#F4F6FA] text-[#98A2B3] text-[12px] font-semibold cursor-not-allowed">
                        Coming soon
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Account ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-3">Account</p>
                  <div className="rounded-2xl border border-[#E8EBF0] p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111]">Password</p>
                        <p className="text-[11px] text-[#98A2B3] mt-0.5">We&apos;ll email you a reset link.</p>
                      </div>
                      <button onClick={sendPasswordReset} disabled={pwSending}
                        className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] transition-colors disabled:opacity-40">
                        {pwSending?'Sending…':'Reset password'}
                      </button>
                    </div>
                    {pwMsg&&<p className={`text-[11px] ${pwMsg.startsWith('✓')?'text-[#166534]':'text-red-500'}`}>{pwMsg}</p>}
                  </div>
                </div>

                {/* ── Danger zone ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#B42318] uppercase tracking-[0.12em] mb-3">Danger zone</p>
                  <div className="rounded-2xl border border-[#FECDCA] bg-[#FFFBFA] p-4">
                    <p className="text-[13px] font-semibold text-[#111]">Delete account</p>
                    <p className="text-[11px] text-[#667085] mt-1 leading-relaxed">
                      Permanently deletes your business, your page, your hours and your analytics. Your link stops working immediately. This cannot be undone.
                    </p>
                    {!deleteArmed
                      ?(
                        <button onClick={()=>setDeleteArmed(true)}
                          className="mt-3 px-4 py-2 rounded-xl bg-white border border-[#FDA29B] text-[#B42318] text-[12px] font-semibold hover:bg-[#FEF3F2] transition-colors">
                          Delete my account
                        </button>
                      )
                      :(
                        <div className="mt-3 space-y-2.5">
                          <p className="text-[11px] text-[#667085]">Type <strong className="text-[#B42318]">DELETE</strong> to confirm.</p>
                          <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                            className="w-full bg-white border border-[#FDA29B] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#B42318] transition-colors"/>
                          <div className="flex items-center gap-2">
                            <button onClick={deleteAccount} disabled={deleteConfirm!=='DELETE'||deleting}
                              className="px-4 py-2 rounded-xl bg-[#B42318] text-white text-[12px] font-semibold hover:bg-[#912018] transition-colors disabled:opacity-40">
                              {deleting?'Deleting…':'Permanently delete'}
                            </button>
                            <button onClick={()=>{setDeleteArmed(false);setDeleteConfirm('');setDeleteMsg('');}}
                              className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-medium hover:border-[#111] transition-colors">
                              Cancel
                            </button>
                          </div>
                          {deleteMsg&&<p className="text-[11px] text-red-500">{deleteMsg}</p>}
                        </div>
                      )
                    }
                  </div>
                </div>
              </div>
            )}
            {sidebarTab==='integrations'&&(
              <div className="p-5 space-y-4">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Integrations</p>
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
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">Google Business Profile</p>
                        {googleConnected&&(
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#BBF7D0] text-[#166534] text-[10px] font-semibold">
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
                              if(r.status===202){setGoogleSyncStatus('pending');}
                              else if(r.ok){setGoogleSyncStatus('ok');setTimeout(()=>setGoogleSyncStatus(null),4000);}
                              else{setGoogleSyncStatus({error:body?.error??`Sync failed (${r.status})`});}
                            }catch(e){setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});}
                          }}
                          disabled={googleSyncStatus==='syncing'}
                          className="w-full py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
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
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D0D5DD] text-[#111] text-[12px] font-semibold hover:border-[#111] hover:bg-[#FAFAF9] transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
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

          {/* ── Right: Phone Preview ── */}
          {!['hours','settings','integrations'].includes(sidebarTab)&&(
            <>
              {/* Drag-resize handle */}
              <div
                onMouseDown={onResizeStart}
                className="w-2 flex-shrink-0 cursor-col-resize group flex items-center justify-center transition-colors hover:bg-[#a78bfa]/20 active:bg-[#a78bfa]/40"
                style={{background:'transparent'}}
                title="Drag to resize"
              >
                <div className="w-0.5 h-10 rounded-full bg-[#C0C0C0] group-hover:bg-[#a78bfa] transition-colors"/>
              </div>
              {/* Preview panel */}
              <div
                className="flex-1 flex flex-col items-center justify-center relative"
                style={{
                  minWidth: 280,
                  overflow: 'hidden',
                  backgroundImage:'linear-gradient(rgba(139,92,246,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.12) 1px,transparent 1px)',
                  backgroundSize:'24px 24px',
                  backgroundColor:'#f5f3ff',
                }}
              >
                {/* Phone / Web toggle */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-0.5 p-1 rounded-full bg-white/85 backdrop-blur border border-[#EBEBEA] shadow-sm">
                  {([
                    {key:'mobile'  as const, label:'Phone', icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>},
                    {key:'desktop' as const, label:'Web',   icon:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>},
                  ]).map(({key,label,icon})=>(
                    <button key={key} onClick={()=>setPreviewMode(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${previewMode===key?'bg-[#F5F3FF] text-[#6D28D9]':'text-[#98A2B3] hover:text-[#111]'}`}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {/* Centered preview */}
                <div className="flex flex-col items-center gap-3 w-full" style={{padding:'0 24px',maxWidth:previewMode==='desktop'?'100%':undefined}}>
                  {previewMode==='mobile'
                    ?(
                      <div className="rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{width:300,maxWidth:'calc(100% - 48px)'}}>
                        <LivePhonePreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride} selectedId={openId}
                          onSelectBlock={id=>{setOpenId(id);setSidebarTab('design');}}/>
                      </div>
                    )
                    :(
                      <div className="rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[#DEDEDC] bg-white"
                        style={{width:'100%'}}>
                        {/* browser chrome, so "Web" reads as a real page */}
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F4F6FA] border-b border-[#E8EBF0]">
                          <span className="w-2 h-2 rounded-full bg-[#FF5F57]"/>
                          <span className="w-2 h-2 rounded-full bg-[#FEBC2E]"/>
                          <span className="w-2 h-2 rounded-full bg-[#28C840]"/>
                          <span className="ml-2 flex-1 truncate text-[9px] text-[#98A2B3] bg-white rounded px-2 py-0.5 border border-[#E8EBF0]">
                            {SITE_DOMAIN}/{localBusiness?.slug??'your-page'}
                          </span>
                        </div>
                        <div className="overflow-y-auto" style={{maxHeight:560}}>
                          <LiveDesktopPreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride}/>
                        </div>
                      </div>
                    )
                  }
                  {localBusiness?.slug&&(
                    <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6d28d9] hover:text-[#4c1d95] transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View live page
                    </a>
                  )}
                </div>
                {/* Refresh button */}
                <button
                  onClick={()=>setPreviewKey(k=>k+1)}
                  title="Refresh preview"
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors border border-white/50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
           MOBILE LAYOUT  (phone only — the desktop layout above is a
           separate branch and is not affected by anything in here)
           ══════════════════════════════════════════════════════════ */}

      {/* ── TOP BAR ── names the section you're in; Save only where it means something */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b border-[#EBEBEA] flex items-center justify-between px-4 gap-3"
        style={{display:isMobile?"flex":"none",height:'calc(52px + env(safe-area-inset-top))',paddingTop:'env(safe-area-inset-top)',fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>
        <span className="text-[#111111] font-semibold text-[17px] tracking-[-0.03em] truncate">
          {isEditSubTab?'Edit page'
            :sidebarTab==='business'?'Business'
            :sidebarTab==='hours'?'Status'
            :sidebarTab==='analytics'?'Analytics'
            :sidebarTab==='settings'?'Settings'
            :'OpenStatus'}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {business?.slug&&isEditSubTab&&(
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-[12px] font-medium text-[#667085] px-2 py-1">View ↗</a>
          )}
          {showSaveButton?(
            <button onClick={save} disabled={saving}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${saved?'bg-[#EDE9FE] text-[#5B21B6]':saving?'bg-[#F4F6FA] text-[#98A2B3]':hasPublished?'bg-[#F5F3FF] text-[#6D28D9]':'bg-[#7C3AED] text-white'}`}>
              {saving?'Saving…':saved?'✓ Saved':hasPublished?'Save':'Publish'}
            </button>
          ):sidebarTab==='hours'?(
            <span className="text-[11px] text-[#98A2B3]">Goes live right away</span>
          ):null}
        </div>
      </div>

      {/* ══ FULL PAGES ══ Business, Status, Analytics and Settings are real pages,
           not sheets over the canvas. The nav stays put underneath them. */}
      <div className="fixed left-0 right-0 z-20 bg-white flex flex-col"
        style={{
          display: isMobile && !isEditSubTab ? 'flex' : 'none',
          top:'calc(52px + env(safe-area-inset-top))',
          bottom:'calc(56px + env(safe-area-inset-bottom))',
          fontFamily:'var(--font-poppins), system-ui, sans-serif',
        }}>

{/* ── BUSINESS tab content ── */}
        {sidebarTab==='business'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-semibold text-[#111] pt-1 pb-3">Business</h2>
            {/* Analytics snapshot - mobile */}
            {analyticsData&&(
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-2">Last 30 days</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {label:'Page views',value:analyticsData.metrics.views,color:'#12B76A',data:(analyticsData.trend??[]).map(t=>t.views)},
                    {label:'Directions',value:analyticsData.metrics.directions,color:'#2563EB',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                    {label:'Menu taps',value:analyticsData.metrics.menu,color:'#7C3AED',data:(analyticsData.trend??[]).map((_,i)=>i%3===0?analyticsData.metrics.menu:0)},
                    {label:'Link clicks',value:analyticsData.metrics.clicks,color:'#D97706',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                  ].map(({label,value,color,data})=>(
                    <div key={label} className="rounded-2xl border border-[#E8EBF0] bg-white p-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                            style={{background:`${color}14`,color}}>
                            {METRIC_ICONS[label]}
                          </span>
                          <p className="text-[10px] font-normal text-[#98A2B3] truncate">{label}</p>
                        </div>
                        <BuilderSparkline data={data} color={color}/>
                      </div>
                      <p className="text-[20px] font-semibold text-[#111] leading-none">{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hours & Status */}
            <div className="mb-3 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-[#111]">Hours & Status</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${liveStatus==='open'?'bg-emerald-100 text-emerald-700':'bg-[#F4F6FA] text-[#667085]'}`}>
                  {liveStatus==='open'?'● Open now':'● Closed'}
                </span>
              </div>
              <p className="text-[12px] text-[#667085] mb-2">{todayLabel}</p>
              <button onClick={()=>setSidebarTab('hours' as SidebarTab)}
                className="text-[12px] font-semibold text-[#667085] hover:text-[#111] underline underline-offset-2">
                Edit hours →
              </button>
            </div>

            {/* Reviews & rating */}
            <ReviewsCard block={allBlocks.find(b=>b.id==='location')} placeId={config.placeId} onUpdateBlock={u=>updateBlock('location',u)}/>

            {/* Social Profiles */}
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-2">Social Profiles</p>
            <div className="space-y-2 mb-3">
              {[
                {key:'instagram', label:'Instagram', placeholder:'@username or full URL'},
                {key:'tiktok',    label:'TikTok',    placeholder:'@username or full URL'},
                {key:'facebook',  label:'Facebook',  placeholder:'Page URL'},
                {key:'twitter',   label:'Twitter / X',placeholder:'@username or full URL'},
                {key:'youtube',   label:'YouTube',   placeholder:'Channel URL'},
              ].map(({key,label,placeholder})=>(
                <div key={key} className="flex items-center gap-2 bg-[#F9FAFB] rounded-xl border border-[#E8EBF0] px-3 py-2">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">{label}</span>
                  <input value={(config.socials??{})[key]??''}
                    onChange={e=>setConfig(c=>({...c,socials:{...(c.socials??{}),[key]:e.target.value}}))}
                    placeholder={placeholder}
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
              ))}
            </div>

            {/* ── Business Profile inline editor ── */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-2">Business Profile</p>
              <div className="rounded-2xl border border-[#E8EBF0] bg-[#F9FAFB] overflow-hidden divide-y divide-[#E8EBF0]">
                {/* Name */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">Name</span>
                  <input value={bizEdit.name} onChange={e=>setBizEdit(b=>({...b,name:e.target.value}))}
                    placeholder="Business name"
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
                {/* Category */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">Category</span>
                  <select value={bizEdit.category} onChange={e=>setBizEdit(b=>({...b,category:e.target.value}))}
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none appearance-none cursor-pointer">
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c=>(
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                {/* Phone */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">Phone</span>
                  <input value={bizEdit.phone} onChange={e=>setBizEdit(b=>({...b,phone:e.target.value}))}
                    placeholder="+1 (555) 000-0000" type="tel"
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
                {/* Website */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">Website</span>
                  <input value={bizEdit.website} onChange={e=>setBizEdit(b=>({...b,website:e.target.value}))}
                    placeholder="https://yoursite.com" type="url"
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
                {/* Address */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="text-[11px] font-normal text-[#667085] w-20 flex-shrink-0">Address</span>
                  <input value={bizEdit.address} onChange={e=>setBizEdit(b=>({...b,address:e.target.value}))}
                    placeholder="123 Main St, City, State"
                    className="flex-1 text-[12px] text-[#111] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                {bizSaveError&&<p className="text-[11px] text-red-500">{bizSaveError}</p>}
                {bizSaved&&<p className="text-[11px] text-emerald-600 font-semibold">✓ Saved</p>}
                {!bizSaveError&&!bizSaved&&<span/>}
                <button onClick={saveBizInfo} disabled={bizSaving}
                  className="ml-auto rounded-xl bg-[#7C3AED] text-white text-[11px] font-semibold px-4 py-2 hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                  {bizSaving?'Saving…':'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ── STATUS page ── one decision: closed, or open. Everything else folds away. ── */}
        {sidebarTab==='hours'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>

            {googleConnected&&gStatus?.isClosed&&(
              <div className="rounded-2xl border border-[#FEC84B] bg-[#FFFCF5] p-4 mt-3">
                <p className="text-[13px] font-semibold text-[#111] mb-1">
                  Google lists you as {gStatus.status==='CLOSED_TEMPORARILY'?'temporarily closed':(gStatus.status??'closed')}
                </p>
                <p className="text-[11.5px] text-[#B54708] leading-relaxed mb-3">
                  Google reviews reopenings, so it can take a few days.
                </p>
                <button disabled={gBusy||gStatus.canReopen===false}
                  onClick={()=>void googleReopen()}
                  className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                  {gBusy?'Asking Google…':'Ask Google to reopen'}
                </button>
              </div>
            )}

            {(()=>{
              const active = statusUpdates.filter(u=>u.status!=='needs_review');
              const isOverridden = active.length>0;
              return (
                <div className={`rounded-[22px] border p-5 mt-4 ${isOverridden?'border-[#FDE68A] bg-[#FFFCF5]':'border-[#E8EBF0] bg-white'}`}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOverridden?'bg-amber-500':liveStatus==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                    <p className="text-[17px] font-semibold text-[#111] tracking-[-0.02em]">
                      {isOverridden ? active[0].headline : liveStatus==='open' ? 'You’re open' : 'Closed right now'}
                    </p>
                  </div>
                  <p className="text-[12.5px] text-[#858585] mb-4 leading-relaxed">
                    {isOverridden
                      ? 'This is what customers see instead of your normal hours today.'
                      : `Your normal hours for today — ${todayLabel}.`}
                  </p>

                  {isOverridden ? (
                    <button onClick={reopenEverything} disabled={statusPosting}
                      className="w-full py-3.5 rounded-2xl bg-[#16A34A] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                      {statusPosting?'Working…':'I’m open again'}
                    </button>
                  ) : (
                    <button onClick={()=>postStatus('closed_today')} disabled={statusPosting}
                      className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                      {statusPosting?'Working…':'Close for today'}
                    </button>
                  )}

                  {gMsg&&<p className={`text-[12px] mt-3 ${gMsg.startsWith('✓')?'text-[#166534]':'text-[#EF4444]'}`}>{gMsg}</p>}
                  {reopenMsg&&<p className={`text-[12px] mt-2 ${reopenMsg.startsWith('✓')?'text-emerald-600':'text-[#EF4444]'}`}>{reopenMsg}</p>}
                </div>
              );
            })()}

            <button onClick={()=>setStatusMore(v=>!v)}
              className="flex items-center gap-1.5 mt-4 text-[13px] font-medium text-[#667085] active:opacity-60">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{transform:statusMore?'rotate(90deg)':'none',transition:'transform .18s'}}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Something else
            </button>

            {statusMore&&(
              <div className="mt-3 space-y-2.5">
                <div className="p-4 rounded-2xl border border-[#E8EBF0] bg-white">
                  <p className="text-[13px] font-semibold text-[#111]">Different hours today</p>
                  <p className="text-[11px] text-[#667085] mt-0.5 mb-2.5">{googleConnected?'Page + Google, today only.':'Today only.'}</p>
                  <div className="flex items-center gap-2">
                    <select value={todayOpen} onChange={e=>setTodayOpen(e.target.value)}
                      className="flex-1 bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                    <span className="text-[11px] text-[#98A2B3]">to</span>
                    <select value={todayClose} onChange={e=>setTodayClose(e.target.value)}
                      className="flex-1 bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>postStatus('custom_hours')} disabled={statusPosting||todayClose<=todayOpen}
                    className="mt-2.5 w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                    {statusPosting?'…':'Set today\u2019s hours'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-[#E8EBF0] bg-white">
                  <p className="text-[13px] font-semibold text-[#111]">Closing early today</p>
                  <p className="text-[11px] text-[#667085] mt-0.5 mb-2.5">{googleConnected?'Page + Google, today only.':'Today only.'}</p>
                  <div className="flex items-center gap-2">
                    <select value={statusCloseTime} onChange={e=>setStatusCloseTime(e.target.value)}
                      className="flex-1 bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#111] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                    <button onClick={()=>postStatus('early_close')} disabled={statusPosting}
                      className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-95 transition-transform disabled:opacity-40">
                      {statusPosting?'…':'Set'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#E8EBF0] bg-white">
                  <p className="text-[13px] font-semibold text-[#111]">Add a note for today</p>
                  <p className="text-[11px] text-[#667085] mt-0.5 mb-2.5">Shows beside your hours. Your page only.</p>
                  <textarea value={statusNote} onChange={e=>setStatusNote(e.target.value.slice(0,100))}
                    placeholder="Running about 20 minutes behind today…" rows={2}
                    className="w-full bg-[#F4F6FA] border border-[#E8EBF0] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none resize-none"/>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[#C0C0C0]">{statusNote.length}/100</span>
                    <button onClick={()=>postStatus('note_today')} disabled={statusPosting||!statusNote.trim()}
                      className="px-4 py-2 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-95 transition-transform disabled:opacity-40">
                      {statusPosting?'…':'Add note'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#E8EBF0] bg-white">
                  <p className="text-[13px] font-semibold text-[#111]">Closing on another day</p>
                  <p className="text-[11px] text-[#667085] mt-0.5 mb-2.5">
                    Dated, so your hours return on their own{googleConnected?' — updates Google too.':'.'}
                  </p>
                  <div className="flex gap-2">
                    {([
                      {label:'Tomorrow',     days:1 },
                      {label:'This weekend', days:-1},
                    ]).map(({label,days})=>(
                      <button key={label} disabled={gBusy}
                        onClick={()=>{
                          const now=new Date();
                          let from=new Date(now), to=new Date(now);
                          if(days===1){ from.setDate(now.getDate()+1); to=new Date(from); }
                          if(days===-1){
                            const dow=now.getDay();
                            from=new Date(now); from.setDate(now.getDate()+((6-dow+7)%7));
                            to=new Date(from);  to.setDate(from.getDate()+1);
                          }
                          void googleCloseDates(from,to,`Closed ${label.toLowerCase()}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] active:scale-95 transition-transform disabled:opacity-40">
                        <LucideCalendar size={13} color="#7C3AED"/>
                        <span className="text-[12px] font-semibold text-[#111]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mt-7 mb-2">Your normal week</p>
            <div className="rounded-2xl border border-[#E8EBF0] overflow-hidden bg-white">
              {DAYS.map(({key,label},i)=><HoursRow key={key} dayKey={key} label={label} idx={i}/>)}
            </div>
          </div>
        )}

{/* ── ANALYTICS mobile tab ── */}
        {sidebarTab==='analytics'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>
            <div className="flex items-center justify-between pt-1 pb-3">
              <h2 className="text-[20px] font-semibold text-[#111]">Analytics</h2>
              <div className="flex gap-1.5">
                {[7,30,90].map(d=>(
                  <button key={d} onClick={()=>setAnalyticsDays(d)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${analyticsDays===d?'bg-[#7C3AED] text-white':'bg-[#F4F6FA] text-[#667085]'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {analyticsLoading&&<div className="text-center py-10 text-[13px] text-[#98A2B3]">Loading…</div>}
            {!analyticsLoading&&analyticsData&&(
              <div className="space-y-3">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {label:'Page views',value:analyticsData.metrics.views},
                    {label:'Unique visitors',value:analyticsData.metrics.uniqueVisitors},
                    {label:'Block taps',value:analyticsData.metrics.clicks},
                    {label:'Directions',value:analyticsData.metrics.directions},
                  ].map(({label,value})=>(
                    <div key={label} className="bg-[#F9FAFB] border border-[#E8EBF0] rounded-2xl p-3">
                      <span className="inline-flex w-6 h-6 rounded-lg items-center justify-center mb-2"
                        style={{background:'#F5F3FF',color:'#7C3AED'}}>
                        {METRIC_ICONS[label]}
                      </span>
                      <p className="text-[22px] font-semibold text-[#111] leading-none">{value.toLocaleString()}</p>
                      <p className="text-[10px] text-[#98A2B3] font-medium mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Top blocks */}
                {analyticsData.topActions.length>0&&(
                  <div className="bg-[#F9FAFB] border border-[#E8EBF0] rounded-2xl p-3">
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-2.5">Top blocks</p>
                    <div className="space-y-2">
                      {analyticsData.topActions.slice(0,6).map(({id,count})=>{
                        const max=analyticsData.topActions[0]?.count||1;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <span className="text-[12px] text-[#111] font-medium w-20 truncate capitalize">{id}</span>
                            <div className="flex-1 h-2 bg-[#E8EBF0] rounded-full overflow-hidden">
                              <div className="h-full bg-[#111] rounded-full" style={{width:`${Math.round(count/max*100)}%`}}/>
                            </div>
                            <span className="text-[11px] text-[#667085] w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Traffic sources */}
                {analyticsData.trafficSources.length>0&&(
                  <div className="bg-[#F9FAFB] border border-[#E8EBF0] rounded-2xl p-3">
                    <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-2.5">Traffic sources</p>
                    <div className="space-y-1.5">
                      {analyticsData.trafficSources.slice(0,5).map(({source,count})=>(
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-[12px] text-[#111] font-medium">{source}</span>
                          <span className="text-[11px] text-[#667085]">{count} visits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!analyticsLoading&&!analyticsData&&(
              <div className="text-center py-10">
                <p className="text-[13px] text-[#98A2B3]">No data yet — share your link to start tracking.</p>
              </div>
            )}
          </div>
        )}
{/* ── SETTINGS tab ── */}
        {sidebarTab==='settings'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-semibold text-[#111] pt-1 pb-3">Settings</h2>
            {/* Your link */}
            {business?.slug&&(
              <div className="mb-4 p-4 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
                <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-[0.12em] mb-1">Your Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[#111] flex-1 truncate">{SITE_DOMAIN}/{business.slug}</p>
                  <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-normal text-[#667085] hover:text-[#111] flex items-center gap-1">
                    Open ↗
                  </a>
                </div>
              </div>
            )}

            {/* Settings menu */}
            <div className="space-y-2">
              <button onClick={()=>setSidebarTab('business')} className="flex items-center gap-3 p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0] w-full text-left">
                <div className="w-9 h-9 rounded-xl bg-[#E8EBF0] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#111] flex-1">Edit business info</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <a href="mailto:info@openstatus.co?subject=Help" className="flex items-center gap-3 p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0]">
                <div className="w-9 h-9 rounded-xl bg-[#E8EBF0] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#111] flex-1">Help & Support</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#98A2B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login';}}
                className="flex items-center gap-3 p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0] w-full text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFF0F0] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#E53935] flex-1">Log out</span>
              </button>
              <a href="mailto:info@openstatus.co?subject=Delete%20my%20account" className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#FFD6D6] bg-[#FFF8F8]">
                <div className="w-9 h-9 rounded-xl bg-[#FFE8E8] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#B91C1C] flex-1">Delete account</span>
              </a>
            </div>
          </div>
        )}

      </div>{/* end of the full-page container */}

      {/* ══ EDIT CANVAS ══ the phone page itself is the editing surface.
           Tap a widget to edit it, press and hold to pick it up and rearrange. */}
      <div className="fixed left-0 right-0 overflow-y-auto"
        style={{
          display: isMobile && isEditSubTab ? 'block' : 'none',
          top:'calc(52px + env(safe-area-inset-top))',
          // The canvas gives way when a sheet opens, so the widget you're editing
          // stays on screen above it instead of hiding behind it.
          bottom: mSheet
            ? 'calc(48vh + 56px + env(safe-area-inset-bottom))'
            : 'calc(112px + env(safe-area-inset-bottom))',
          transition:'bottom .3s cubic-bezier(.32,.72,0,1)',
          backgroundColor:'#f5f3ff',
          backgroundImage:'linear-gradient(rgba(139,92,246,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.12) 1px,transparent 1px)',
          backgroundSize:'24px 24px',
          touchAction: mDragId ? 'none' : undefined,
        }}>
        <div className="min-h-full flex items-start justify-center py-3 px-2" style={{position:'relative'}}>
          <div style={{position:'absolute',top:12,right:12,zIndex:10}}>
            <button onClick={e=>{e.stopPropagation();setPreviewKey(k=>k+1);}} title="Refresh preview"
              style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(8px)',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 8px rgba(0,0,0,0.12)',cursor:'pointer'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#292929" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>

          <div className="w-full rounded-[24px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
            style={{maxWidth:340,marginLeft:'auto',marginRight:'auto'}}>
            <LivePhonePreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride}
              selectedId={mSheet==='block'?openId:null}
              onSelectBlock={id=>{ if(dragging.current||suppressTap.current) return; setOpenId(id); setSidebarTab('design'); setMSheet('block'); }}
              blockProps={mobileBlockProps}/>
          </div>
        </div>

        {/* Coach line — the hold gesture isn't discoverable on its own */}
        <p className="text-center text-[11px] text-[#8B5CF6] pb-4 pt-1 font-medium">
          {mDragId?'Drag to rearrange, let go to drop':'Tap a widget to edit · hold to move it'}
        </p>
      </div>

      {/* ══ EDIT TOOLBAR ══ replaces the full-screen Blocks/Style sheet */}
      <div className="fixed left-0 right-0 z-40 flex justify-center px-3"
        style={{
          display: isMobile ? 'flex' : 'none',
          bottom:'calc(56px + env(safe-area-inset-bottom))',
          paddingBottom:8,
          transform:isEditSubTab?'translateY(0)':'translateY(calc(100% + 12px))',
          opacity:isEditSubTab?1:0,
          pointerEvents:isEditSubTab?'auto':'none',
          transition:'transform .25s cubic-bezier(.32,.72,0,1), opacity .2s ease',
        }}>
        <div className="flex w-full max-w-[420px] bg-white/92 backdrop-blur border border-[#EBEBEA] rounded-2xl p-1 gap-1 shadow-[0_6px_24px_rgba(124,58,237,0.16)]">
          {([
            {key:'add'        as const, label:'Block',      svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>},
            {key:'font'       as const, label:'Font',       svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>},
            {key:'color'      as const, label:'Color',      svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>},
            {key:'background' as const, label:'Background', svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>},
          ]).map(({key,label,svg})=>(
            <button key={key}
              onClick={()=>{ setSidebarTab('design'); setOpenId(null); setMSheet(m=>m===key?null:key); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10.5px] font-semibold transition-all active:scale-95 ${mSheet===key?'bg-[#F5F3FF] text-[#6D28D9]':'text-[#667085]'}`}>
              {svg}{label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SMALL SHEETS ══ one per toolbar button, plus the per-widget editor */}

      <MobileSheet open={isMobile&&mSheet==='block'} title={openBlock?.title||'Edit widget'} onClose={()=>{setMSheet(null);setOpenId(null);}} maxVh={46} dim={false}>
        {openBlock&&(
          <BlockEditPanel
            block={openBlock} config={config}
            onUpdateBlock={u=>updateBlock(openBlock.id,u)}
            onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
            onClose={()=>{setMSheet(null);setOpenId(null);}}
          />
        )}
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='add'} title="Add a block" onClose={()=>setMSheet(null)} maxVh={56}>
        {/*
          There are seven blocks. Filtering seven things into six categories was
          never going to help, and two of those tabs ("Social", "More") mapped to
          nothing at all — they looked like buttons and did nothing. Just show
          them all, plus the one thing people actually want that isn't in the list.
        */}
        <div className="grid grid-cols-2 gap-2.5">
          {DEFAULT_BLOCKS.map(def=>{
            const isOn = allBlocks.find(b=>b.id===def.id)?.on;
            return (
              <button key={def.id}
                onClick={()=>{ if(!isOn){ enableBlock(def.id); } else { setOpenId(def.id); setMSheet('block'); } }}
                className="flex items-center gap-2.5 p-3 bg-[#F9FAFB] rounded-2xl border border-[#E8EBF0] text-left active:scale-[0.97] transition-transform">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{backgroundColor:`${def.color}18`,border:`1px solid ${def.color}30`}}>
                  <BlockIcon id={def.id} size={17} color={def.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-semibold text-[#111] leading-tight truncate">{def.title}</p>
                  <p className="text-[10px] text-[#667085] leading-tight mt-0.5 truncate">{isOn?'On — tap to edit':'Tap to add'}</p>
                </div>
                {isOn&&(
                  <span className="w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={()=>{ addCustomLink(); setMSheet('block'); }}
          className="mt-2.5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#D0D5DD] text-[12.5px] font-semibold text-[#667085] active:scale-[0.98] transition-transform"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add any other link
        </button>
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='font'} title="Font" onClose={()=>setMSheet(null)} maxVh={46} dim={false}>
        <p className="text-[11.5px] text-[#667085] mb-3">Changes every bit of text on your page.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {FONT_OPTIONS.map(opt=>{
            const isActive=(config.font??FONT_OPTIONS[0].family)===opt.family;
            return (
              <button key={opt.family} onClick={()=>setConfig(c=>({...c,font:opt.family}))}
                className={`flex flex-col items-start px-3 py-3 rounded-2xl border transition-all active:scale-95 ${isActive?'border-[#7C3AED] bg-[#F5F3FF]':'border-[#E8EBF0] bg-[#F9FAFB]'}`}>
                <span className={`text-[19px] leading-tight ${isActive?'text-[#6D28D9]':'text-[#111]'}`} style={{fontFamily:opt.family}}>Aa</span>
                <span className={`text-[10px] font-semibold mt-1 ${isActive?'text-[#7C3AED]':'text-[#98A2B3]'}`}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='color'} title="Business name colour" onClose={()=>setMSheet(null)} maxVh={44} dim={false}>
        <p className="text-[11.5px] text-[#667085] mb-3">Pick a colour that reads clearly on your background.</p>
        <NameColorPicker
          value={config.nameColor}
          autoColor={isDarkBg(config.bg)?'#FFFFFF':'#0A0A0A'}
          onChange={v=>setConfig(c=>({...c,nameColor:v}))}
        />
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='background'} title="Background" onClose={()=>setMSheet(null)} maxVh={50} dim={false}>
        <p className="text-[11.5px] text-[#667085] mb-3">Your widgets lighten or darken automatically to stay readable.</p>
        <PageBackgroundPicker value={config.bg} onChange={(v,a,sp)=>setConfig(p=>({...p,bg:v,bgAnim:a,bgAnimSpeed:sp}))}/>
      </MobileSheet>


      {/* ── BOTTOM NAV ── always visible, on every page */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#E8EBF0] flex items-stretch"
        style={{display:isMobile?"flex":"none", paddingBottom:'env(safe-area-inset-bottom)', height:'calc(56px + env(safe-area-inset-bottom))', fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>
        {([
          {key:'business'  as SidebarTab, label:'Business',  active:sidebarTab==='business',
           svg:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>},
          {key:'hours'     as SidebarTab, label:'Status',    active:sidebarTab==='hours',
           svg:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>},
          {key:'analytics' as SidebarTab, label:'Analytics', active:sidebarTab==='analytics',
           svg:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>},
          {key:'design'    as SidebarTab, label:'Edit',      active:isEditSubTab,
           svg:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>},
          {key:'settings'  as SidebarTab, label:'Settings',  active:sidebarTab==='settings',
           svg:<svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>},
        ]).map(({key,label,active,svg})=>(
          <button key={label}
            onClick={()=>{ setSidebarTab(key); setMSheet(null); setOpenId(null); }}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 active:opacity-70 transition-opacity">
            {active&&<div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-7 rounded-xl bg-[#F5F3FF]"/>}
            <span className="relative z-10" style={{color:active?'#6D28D9':'#98A2B3'}}>{svg}</span>
            <span className={`text-[9px] font-medium leading-none relative z-10 ${active?'text-[#6D28D9]':'text-[#98A2B3]'}`}>{label}</span>
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
              <p className="text-[15px] font-semibold text-[#111]">
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
                  const {error}=await savePageConfig(business?.id,newConfig);
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
                        if(r.status===202){setGoogleSyncStatus('pending');}
                              else if(r.ok){setGoogleSyncStatus('ok');setTimeout(()=>setGoogleSyncStatus(null),4000);}
                        else{setGoogleSyncStatus({error:body?.error??`Google sync failed (${r.status})`});}
                      }catch(e){setGoogleSyncStatus({error:e instanceof Error?e.message:'Could not reach server'});}
                    }).catch(e=>{setGoogleSyncStatus({error:e instanceof Error?e.message:'Session error'});});
                  }
                }}
                className="flex-1 py-2.5 rounded-full bg-[#7C3AED] text-white text-[13px] font-semibold hover:bg-[#6D28D9] transition-colors">
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
