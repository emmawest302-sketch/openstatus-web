'use client';

import Link from 'next/link';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SITE_DOMAIN, SITE_URL } from '@/lib/site';
import { BG_KEYFRAMES, bgAnimationStyle, isDarkBg } from '@/lib/page-theme';
import { getBusinessStatus, applyOverride, type TodayOverride, type WeeklySchedule } from '@/lib/business-status';
import { swapById, canDrag } from '@/lib/reorder';
import OwnerLinkCard from '@/components/owner-link-card';
import { imageTreatment } from '@/lib/image-treatment';
import { shortAddress } from '@/lib/address';
import { localDay, activeOffers, newOfferId, MAX_OFFERS, OFFER_TITLE_MAX, OFFER_DESC_MAX, OFFER_CODE_MAX, type Offer } from '@/lib/offers';
import { externalUrl } from '@/lib/url';
import { PAGE_METRICS_CSS, PAGE_CONTAINER_CLASS } from '@/lib/page-metrics';
import { applyVibe } from '@/lib/page-vibes';
import VibePicker from '@/components/builder/vibe-picker';
// The preview renders the published page's own components, so the two cannot
// drift. See the note on LivePhonePreview.
import { publishedBlocks, blockHasDestination, HEADER_ACTION_IDS } from '@/lib/page-rows';
import PublicBioCard from '@/components/public-bio-card';
import PublicBanner from '@/components/public-banner';
import PublicHoursRow from '@/components/public-hours-row';
import PublicBlockRow from '@/components/public-block-row';
import PublicUpdatesPlaceholder from '@/components/public-updates-placeholder';
import PublicSocialLinks from '@/components/public-social-links';
import type { OpenStatusBlock as LibBlock } from '@/lib/openstatus-page-config';
import {
  BlockIcon,
  IconAcuity,
  IconCalendly,
  IconDoorDash,
  IconFacebook,
  IconGoogle,
  IconGrubhub,
  IconInstagram,
  IconMindbody,
  IconOpenTable,
  IconResy,
  IconSquare,
  IconTikTok,
  IconToast,
  IconTwitterX,
  IconUberEats,
  IconYouTube,
  LucideCalendar,
  LucideChevronRight,
  LucideClock,
  LucideGlobe,
  LucideGrip,
  LucideImage,
  LucideLayoutGrid,
  LucideLayoutList,
  LucideList,
  LucidePin,
  LucideShare,
  LucideShoppingBag,
  
  LucideThumbsDown,
  LucideThumbsUp,
  LucideX,
  ProviderIcon,
  SocialIcon,
} from '@/components/builder/icons';
import {
  BG_DESIGNS,
  BG_RAINBOW,
  BOOK_PROVIDERS,
  SHOP_PROVIDERS,
  DAYS,
  DEFAULT_BLOCKS,
  DEFAULT_WEEK_HOURS,
  FEATURE_TAGS,
  FONT_OPTIONS,
  ORDER_PROVIDERS,
  SHOP_SUGGESTED_CATEGORIES,
  SOCIAL_PLATFORMS,
} from '@/components/builder/constants';


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

/**
 * A block with no destination is excluded from the published page, so the
 * builder has to say so rather than letting the owner think it went live.
 *
 * This used to keep its own list of self-contained blocks and its own
 * url/menuFile check, and the two drifted: Reviews was missing from the
 * builder's list, so a Reviews row that publishes perfectly well was badged
 * "Needs setup" — and googleUrl-only blocks were judged by a rule that never
 * looked at googleUrl. One function decides for both surfaces now.
 */
function blockNeedsSetup(b: OpenStatusBlock) {
  if (b.id === 'hours' || HEADER_ACTION_IDS.has(b.id)) return false;
  return !blockHasDestination(b);
}
export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
interface DayHours { open: string; close: string; closed: boolean; }
export type WeeklyHours = Record<WeekDay, DayHours>;
export interface OpenStatusBlock {
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
  /** Offers block only. Structured, so expiry and analytics are possible. */
  offers?: Offer[];
  _googleFetching?: boolean; _googleError?: string;
}
export interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[]; bg: string; bgImage?: string; bgImagePosition?: string;
  socials: Record<string, string>;
  imageIntensity?: number;
  imageBlur?: 'none'|'soft'|'strong';
  imageOverlay?: 'auto'|'light'|'dark'|'none';
  location?: string; directionsUrl?: string; banner?: string; bannerOn?: boolean;
  tags?: string[]; weeklyHours?: WeeklyHours;
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
  // Explicit hours for today override a normally-closed day; checking the
  // schedule first made the preview say "Closed today" for a shop the owner
  // had just opened 12-4.
  const customToday = !!override?.opensAt && !!override?.closesAt;
  if (customToday) {
    return {
      status: s.state==='open' ? 'open' : 'closed',
      todayLabel: `Today ${fmt12(override!.opensAt!)} – ${fmt12(override!.closesAt!)}`,
    };
  }
  if (!today || today.closed) return { status:'closed', todayLabel:'Closed today' };
  const closeLabel = override?.closesAt ? fmt12(override.closesAt) : fmt12(today.close);
  const openLabel  = override?.opensAt  ? fmt12(override.opensAt)  : fmt12(today.open);
  return {
    status: s.state==='open' ? 'open' : 'closed',
    todayLabel: `Today ${openLabel} – ${closeLabel}`,
  };
}

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string,unknown>;
  const isEmpty = !raw || (typeof raw==='object' && Object.keys(raw as object).length===0);
  const saved = Array.isArray(r.blocks) ? r.blocks as OpenStatusBlock[] : [];
  // When nothing has been configured yet, default to orange bg + all blocks on
  // Built-ins are merged onto their defaults. Anything saved that has no
  // default is carried through untouched.
  //
  // This used to keep only DEFAULT_BLOCKS plus ids starting "custom-", which
  // quietly deleted every other saved block on load — and since the load
  // feeds the autosave, the deletion was then written back to the database.
  // Photos, Reviews and Updates all lived in this gap: an owner could have
  // one, and the builder would erase it the next time they opened the page.
  // Carrying unknown ids through costs nothing and makes the merge
  // non-destructive by construction.
  const defaultIds = new Set(DEFAULT_BLOCKS.map(b=>b.id));
  const merged = DEFAULT_BLOCKS.map(def => { const f=saved.find(b=>b.id===def.id); return f?{...def,...f}:{...def}; });
  const customs = saved.filter(b=>typeof b.id==='string' && !defaultIds.has(b.id));
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
    imageIntensity: typeof r.imageIntensity==='number'?r.imageIntensity:undefined,
    imageBlur:      (r.imageBlur==='none'||r.imageBlur==='soft'||r.imageBlur==='strong')?r.imageBlur:undefined,
    imageOverlay:   (r.imageOverlay==='auto'||r.imageOverlay==='light'||r.imageOverlay==='dark'||r.imageOverlay==='none')?r.imageOverlay:undefined,
    location:     typeof r.location==='string'?r.location:undefined,
    directionsUrl: typeof r.directionsUrl==='string'?r.directionsUrl:undefined,
    banner:       typeof r.banner==='string'?r.banner:undefined,
    bannerOn:     typeof r.bannerOn==='boolean'?r.bannerOn:undefined,
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
      className="w-full bg-white border border-[#E9E9E7] rounded-xl px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors"
    />
  );
}
function PillSelect({ options,selected,onSelect }: { options:string[]; selected:string; onSelect:(v:string)=>void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o=>(
        <button key={o} onClick={()=>onSelect(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected===o?'bg-[#7C3AED] text-white font-semibold border-[#0A0A0A]':'border-[#E9E9E7] text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'}`}>
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
            className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition-all ${active ? 'border-[#0A0A0A] bg-[#EEEEEC] shadow-sm' : 'border-[#E9E9E7] hover:border-[#C0C0C0] bg-white'}`}
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
/**
 * The per-block layout picker used to sit here — Minimal / Clock / Hero for
 * Hours, Map / Minimal for Location.
 *
 * It is gone because it had stopped being a choice. Every row renders through
 * one component now, and none of them read block.blockStyle, so the thumbnails
 * offered three looks and delivered the same one. A control that does nothing
 * is worse than a missing control: the owner picks "Hero", sees no change, and
 * stops trusting the rest of the builder.
 */

function ImageAppearanceControls({ config, onChange }: {
  config: OpenStatusPageConfig;
  onChange: (patch: Partial<OpenStatusPageConfig>) => void;
}) {
  const intensity = config.imageIntensity ?? 78;
  const blur = config.imageBlur ?? 'none';
  const overlay = config.imageOverlay ?? 'auto';

  const seg = (active: boolean) =>
    `flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
      active ? 'bg-[#7C3AED] text-white' : 'bg-[#F7F7F6] text-[#777777] hover:text-[#0A0A0A]'
    }`;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel>Image intensity</FieldLabel>
          <span className="text-[11px] font-semibold text-[#777777] tabular-nums">{intensity}%</span>
        </div>
        <input
          type="range" min={0} max={100} step={1} value={intensity}
          onChange={e=>onChange({ imageIntensity: Number(e.target.value) })}
          className="w-full accent-[#7C3AED]"
          aria-label="Image intensity"
        />
        <p className="text-[11px] text-[#9A9A97] mt-1">
          Fades the photo only. Your text and widgets stay fully solid.
        </p>
      </div>

      <div>
        <FieldLabel>Blur</FieldLabel>
        <div className="flex gap-1.5 mt-1.5">
          {(['none','soft','strong'] as const).map(k=>(
            <button key={k} type="button" onClick={()=>onChange({ imageBlur: k })} className={seg(blur===k)}>
              {k==='none'?'None':k==='soft'?'Soft':'Strong'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Overlay</FieldLabel>
        <div className="flex gap-1.5 mt-1.5">
          {(['auto','light','dark','none'] as const).map(k=>(
            <button key={k} type="button" onClick={()=>onChange({ imageOverlay: k })} className={seg(overlay===k)}>
              {k==='auto'?'Auto':k==='light'?'Light':k==='dark'?'Dark':'None'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#9A9A97] mt-1.5">
          Auto picks whichever keeps your text readable on this background.
        </p>
      </div>
    </div>
  );
}

// ── Page background picker: rainbow swatches, colour wheel, designed presets ──
function PageBackgroundPicker({ value, onChange, dark=false }: {
  value: string; onChange:(v:string, anim?:string, speed?:number)=>void; dark?:boolean;
}) {
  const border = dark ? '#E9E9E7' : '#E9E9E7';
  const accent = dark ? '#0A0A0A' : '#0A0A0A';
  const [tab,setTab] = useState<'color'|'design'>('color');
  return (
    <div>
      <style>{BG_KEYFRAMES}</style>
      {/* tabs */}
      <div className="inline-flex gap-1 mb-4 p-1 rounded-xl bg-[#F1F2F3]">
        {([['color','Solid'],['design','Design']] as const).map(([k,label])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${tab===k?'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08)]':'text-[#777777] hover:text-[#0A0A0A]'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab==='color'&&(
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {BG_RAINBOW.map(c=>(
              <button key={c} onClick={()=>onChange(c)} title={c}
                className="w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110"
                style={{background:c,borderColor:value===c?accent:border}}/>
            ))}
          </div>
          {/* colour wheel */}
          {/* Same as above: the finger has to land on the real input, or iOS
              never opens the wheel. */}
          <span className="relative inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border"
            style={{borderColor:border}}>
            <span aria-hidden className="w-5 h-5 rounded-full flex-shrink-0" style={{background:'conic-gradient(#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)'}}/>
            <span aria-hidden className="text-[12px] font-semibold text-[#0A0A0A]">Pick any color</span>
            <input type="color" aria-label="Custom background color"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              value={/^#[0-9a-fA-F]{6}$/.test(value)?value:'#ffffff'}
              onChange={e=>onChange(e.target.value)}/>
          </span>
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
              <span className={`text-[9px] font-semibold ${value===d.css?'text-[#0A0A0A]':'text-[#9A9A97]'}`}>{d.label}{d.anim?" ✦":""}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

// Photo upload field
function TimeSelect({ value,onChange }: { value:string; onChange:(v:string)=>void }) {
  const times:string[]=[];
  for(let h=0;h<24;h++) for(const m of [0,30]) times.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      className="bg-white border border-[#E9E9E7] rounded-lg px-2.5 py-1.5 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] cursor-pointer appearance-none">
      {times.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

// Customer-facing tags are profile details, not actions.
function TagsRow({ tags, isDark }: { tags: string[]; isDark: boolean }) {
  return (
    <p className={`mt-2 px-2 text-center text-[9px] leading-relaxed ${isDark?'text-white/70':'text-black/55'}`}>
      {tags.filter(Boolean).join(' · ')}
    </p>
  );
}

// ── Screen preview (no phone frame) ───────────────────────────────────────────
/**
 * The preview.
 *
 * It renders the same components the published page does — PublicBioCard,
 * PublicHoursRow, PublicBlockRow, PublicSocialLinks — rather than its own
 * copy of them.
 *
 * It used to be a parallel implementation, and everything that can go wrong
 * with that did: it showed a "(100%)" score from a voting system the page no
 * longer had, drew social icons in brand colours while the page drew them in
 * one ink, sized blocks by a grid the page had stopped using, and kept the old
 * floating header for a day after the page grew a frosted bio card. Every one
 * of those was the owner being shown a page their customers would never see.
 *
 * So there is one implementation now. The preview's job is to supply the same
 * props from builder-shaped config, and to layer the editing affordances —
 * selection outline, click-to-edit, drag — on top without touching what is
 * underneath.
 */
function LivePhonePreview({ business,config,selectedId,onSelectBlock,blockProps,timeZone,override }: {
  business:Business|null;
  config:OpenStatusPageConfig;
  selectedId?:string|null;
  onSelectBlock?:(id:string)=>void;
  timeZone?:string|null;
  override?:TodayOverride;
  /** Long-press drag hook. Returns extra DOM props per block. */
  blockProps?:(id:string)=>{ style?:React.CSSProperties } & React.DOMAttributes<HTMLDivElement> & Record<string,unknown>;
}) {
  const isDark = isDarkBg(config.bg);
  const { status } = getLiveStatus(config.weeklyHours, timeZone, override);
  const accent = config.themeColor || '#DB6B8F';
  const pageFont = config.font ?? 'Inter, system-ui, sans-serif';

  // Same filter the published page runs. The preview used to have its own,
  // looser one, so it showed rows the live page then dropped.
  const activeBlocks = publishedBlocks(config.blocks);
  const hoursOn = config.blocks.find(b => b.id === 'hours')?.on !== false;

  // Header actions. Same precedence as the live page: the business's own
  // Website and Address fields first, the retired blocks only as a fallback
  // for pages configured before those stopped being rows.
  const websiteUrl = externalUrl(business?.website)
    || externalUrl(config.blocks.find(b => b.id === 'website')?.url)
    || null;
  const addr = (business?.address || config.blocks.find(b => b.id === 'location')?.address || config.location || '').trim();
  const directionsUrl = externalUrl(config.directionsUrl)
    || (addr ? `https://maps.google.com/?q=${encodeURIComponent(addr)}` : null);
  // Directions uses the full address; the card shows the short one, same as
  // the live page. The preview used to print Google's whole string, postcode
  // and "USA" included, which wrapped to a second line the page never had.
  const displayAddr = shortAddress(addr);

  const avatar = business?.avatar_url?.startsWith('storage:') && business?.id
    ? `/api/assets?businessId=${business.id}&kind=avatar`
    : business?.avatar_url ?? null;
  const initials = (business?.name ?? 'B').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();

  const DAY_KEYS: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const DAY_LABELS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayIdx = new Date().getDay();
  const dayRow = (i: number, label: string) => {
    const d = config.weeklyHours?.[DAY_KEYS[i]];
    return {
      label,
      hours: !d || d.closed ? 'Closed' : `${fmt12(d.open)} – ${fmt12(d.close)}`,
      isToday: i === todayIdx,
      closed: !d || d.closed,
    };
  };

  const cover = imageTreatment({
    intensity: config.imageIntensity, blur: config.imageBlur,
    overlay: config.imageOverlay, pageIsDark: isDark,
  });

  /** Selection outline and drag handles, wrapped around a real page component. */
  const editable = (id: string, node: React.ReactNode) => {
    const extra = blockProps?.(id);
    const { style: extraStyle, ...extraRest } = extra ?? {};
    return (
      <div
        key={id}
        data-block-id={id}
        onClick={() => onSelectBlock?.(id)}
        {...extraRest}
        style={{
          borderRadius: 20,
          ...(onSelectBlock ? { cursor: 'pointer' } : {}),
          ...(selectedId === id ? { outline: '2px solid #7C3AED', outlineOffset: 3 } : {}),
          ...(extraStyle ?? {}),
        }}
      >
        {node}
      </div>
    );
  };

  return (
    <div className={PAGE_CONTAINER_CLASS} style={{ width:'100%', background: config.bg || '#F7F7F5', fontFamily: pageFont }}>
      <style>{PAGE_METRICS_CSS}</style>
      {config.bannerOn !== false && <PublicBanner text={config.banner}/>}
      {config.bgImage && (
        <div style={{ position:'relative', height:'var(--os-cover-h, 214px)', overflow:'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={config.bgImage} alt="" style={{
            width:'100%', height:'100%', objectFit:'cover',
            objectPosition: config.bgImagePosition ?? 'center 60%', display:'block',
            opacity: cover.opacity,
            filter: cover.blur ? `blur(${cover.blur}px)` : undefined,
            transform: cover.scale !== 1 ? `scale(${cover.scale})` : undefined,
          }}/>
          {cover.overlay && <div style={{ position:'absolute', inset:0, background: cover.overlay }}/>}
        </div>
      )}

      <div style={{ padding: '0 clamp(9px, 3.2cqw, 12px)' }}>
        <PublicBioCard
          businessName={business?.name ?? 'Your business'}
          businessId={business?.id ?? ''}
          slug={business?.slug ?? ''}
          address={displayAddr || null}
          tags={config.tags ?? []}
          // The rating row only fetches when it knows there's a place to
          // fetch for. This was hardcoded null, so the preview never showed
          // the Google rating the live page did.
          placeId={config.placeId ?? null}
          websiteUrl={websiteUrl}
          directionsUrl={directionsUrl}
          shareUrl={business?.slug ? `${SITE_URL}/${business.slug}` : SITE_URL}
          dark={isDark}
          accent={accent}
          nameColor={config.nameColor ?? (isDark ? '#FFFFFF' : '#151515')}
          pageFont={pageFont}
          logo={avatar}
          initials={initials}
        />
      </div>

      <div style={{ padding: 'clamp(12px, 4cqw, 18px) clamp(9px, 3.2cqw, 12px) 18px', display:'flex', flexDirection:'column', gap:'var(--os-gap, 10px)' }}>
        {hoursOn && editable('hours', (
          <PublicHoursRow
            state={status === 'open' ? 'open' : 'closed'}
            headline={status === 'open' ? 'Open now' : 'Closed'}
            detail={status === 'open' ? 'Closes at ' : 'Tap for hours'}
            accent={status === 'open' ? (dayRow(todayIdx,'x').hours.split(' – ')[1] ?? null) : null}
            today={dayRow(todayIdx, 'Today')}
            tomorrow={dayRow((todayIdx + 1) % 7, 'Tomorrow')}
            week={DAY_LABELS.map((n,i)=>dayRow(i,n))}
            dark={isDark}
          />
        ))}

        {activeBlocks.map(b => editable(b.id, (
          // Instagram updates reads the database on the server, so the preview
          // shows a stand-in rather than an empty gap the owner can't explain.
          b.id === 'updates'
            ? <PublicUpdatesPlaceholder dark={isDark}/>
            : <PublicBlockRow
                block={b as unknown as LibBlock}
                businessId={business?.id ?? ''}
                placeId={config.placeId ?? null}
                dark={isDark}
                accent={accent}
                today={localDay(new Date(), timeZone || 'America/Chicago')}
              />
        )))}

        {activeBlocks.length === 0 && !hoursOn && (
          <p style={{ textAlign:'center', fontSize:11, padding:'26px 0', color: isDark?'rgba(255,255,255,0.5)':'#9A9A97' }}>
            Turn on features to see them here
          </p>
        )}
      </div>

      <PublicSocialLinks businessId={business?.id ?? ''} socials={config.socials ?? {}}/>

      <p className="text-center text-[11px] text-[#858585] mt-2 pb-2 font-medium">{SITE_DOMAIN}/…</p>
    </div>
  );
}

// ── Desktop page preview ──────────────────────────────────────────────────────
/**
 * This used to be ~180 lines of its own markup: its own cover, its own logo,
 * its own name, its own block rows. It was the last parallel implementation of
 * the business page, and it drifted — coloured social icons, a stale vote
 * score, the old floating header — so an owner designing on a laptop was
 * looking at a page that no longer existed.
 *
 * It renders the same tree as the phone preview and the live page now. Desktop
 * differs only in how wide the column is allowed to get, which the live page
 * already handles with its own max-width.
 */
function LiveDesktopPreview(props: React.ComponentProps<typeof LivePhonePreview>) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <LivePhonePreview {...props}/>
    </div>
  );
}

function NameColorPicker({ value, autoColor, onChange }: {
  value?: string; autoColor: string; onChange:(v:string|undefined)=>void;
}) {
  const SWATCHES = ['#FFFFFF','#0A0A0A','#7C3AED','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <button onClick={()=>onChange(undefined)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${!value?'bg-[#7C3AED] text-white border-[#0A0A0A]':'border-[#E9E9E7] text-[#777777] hover:border-[#0A0A0A]'}`}>
          Auto
        </button>
        {SWATCHES.map(c=>(
          <button key={c} onClick={()=>onChange(c)} title={c}
            className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
            style={{background:c,borderColor:value===c?'#0A0A0A':'#E9E9E7'}}/>
        ))}
        {/*
          The real colour input sits on top, invisible, at full size.

          It used to be .sr-only with a button calling .click() on it. A
          synthetic click on a clipped input does not open the colour picker on
          iOS Safari — the wheel simply never appeared, and there was no error
          to see. Letting the finger land on the actual input is the only way
          that works on a phone, and it costs nothing on desktop.
        */}
        <span className="relative w-7 h-7 flex-shrink-0">
          <span aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed border-[#D4D4D4] flex items-center justify-center">
            <span className="text-[11px] text-[#9A9A97]">+</span>
          </span>
          <input type="color" title="Custom color" aria-label="Custom business name color"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            value={/^#[0-9a-fA-F]{6}$/.test(value??'')?value:autoColor}
            onChange={e=>onChange(e.target.value)}/>
        </span>
      </div>
      <p className="text-[10px] text-[#9A9A97]">
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
        <span className="text-[10px] font-normal text-[#9A9A97] w-8 flex-shrink-0">Up</span>
        <input type="range" min={0} max={100} value={py}
          onChange={e=>onChange(`${px}% ${e.target.value}%`)}
          className="flex-1 accent-[#7C3AED]" aria-label="Vertical crop position"/>
        <span className="text-[10px] font-normal text-[#9A9A97] w-10 flex-shrink-0 text-right">Down</span>
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
    `w-6 h-6 rounded-lg text-[11px] leading-none flex items-center justify-center border transition-colors ${
      on ? 'bg-[rgba(124,58,237,0.07)] border-[#7C3AED] text-[#0A0A0A]' : 'bg-white border-[#E9E9E7] text-[#9A9A97] hover:border-[#DCDCD9]'
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
    <div className="rounded-xl border border-[#E9E9E7] overflow-hidden">
      <button type="button" onClick={()=>setOpen(v=>!v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#F7F7F6] hover:bg-[#F4F4F2] transition-colors">
        <span className="text-[12px] font-semibold text-[#777777]">{label}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9A97" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
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

/**
 * What Google actually returns for this place's reviews.
 *
 * "My reviews aren't showing up" has three completely different causes — no
 * Google place linked, nobody has written one yet, or the API key's plan
 * doesn't include review text — and the page looks identical in all three.
 * This asks the same endpoint the public row asks and says which it is.
 */
function ReviewsProbe({ businessId, placeId }: { businessId?: string; placeId?: string }) {
  const [state,setState] = useState<{n:number;count:number;error?:string}|null>(null);
  const [busy,setBusy] = useState(false);

  const check = useCallback(async () => {
    if(!businessId) return;
    setBusy(true);
    try{
      const r = await fetch(`/api/places?businessId=${businessId}&type=reviews`);
      const d = await r.json() as { reviews?:unknown[]; reviewCount?:number; error?:string };
      setState({ n:(d.reviews??[]).length, count:d.reviewCount??0, error:d.error });
    }catch{
      setState({ n:0, count:0, error:'Could not reach the server' });
    }finally{ setBusy(false); }
  },[businessId]);

  if(!placeId) return null;

  return (
    <div className="mt-2.5">
      <button onClick={()=>void check()} disabled={busy}
        className="text-[11px] font-semibold text-[#777777] hover:text-[#0A0A0A] underline underline-offset-2 disabled:opacity-40">
        {busy?'Checking…':'Check what Google returns'}
      </button>
      {state && (
        <p className="text-[11px] mt-1.5 leading-relaxed text-[#777777]">
          {state.error
            ? <span className="text-red-500">Google said: {state.error}</span>
            : state.n > 0
              ? <>Found {state.n} written {state.n===1?'review':'reviews'}{state.count?` of ${state.count.toLocaleString()} total`:''}. The row will show {Math.min(state.n,3)}.</>
              : state.count > 0
                ? <>You have {state.count.toLocaleString()} {state.count===1?'rating':'ratings'} but no written reviews yet, so the row shows your score and links to Google.</>
                : <>Google has no reviews for this place yet. The row stays hidden until it does.</>}
        </p>
      )}
    </div>
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
    <div className="mb-5 rounded-2xl border border-[#E9E9E7] bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-[12px] font-semibold text-[#0A0A0A]">Reviews &amp; rating</p>
        <button onClick={()=>void refresh()} disabled={busy}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[11px] font-semibold hover:border-[#0A0A0A] transition-colors disabled:opacity-40">
          {busy?'Refreshing…':'Refresh from Google'}
        </button>
      </div>

      {hasRating
        ?(
          <div className="flex items-center gap-2 mt-2.5">
            <StarRating value={stars}/>
            <span className="text-[15px] font-semibold text-[#0A0A0A] leading-none">{stars.toFixed(1)}</span>
            {!!block.reviewCount&&(
              <span className="text-[12px] text-[#9A9A97]">({block.reviewCount.toLocaleString()})</span>
            )}
          </div>
        )
        :<p className="text-[12px] text-[#9A9A97] mt-1">No rating yet — hit refresh once your Google listing has reviews.</p>
      }

      <p className="text-[11px] text-[#9A9A97] mt-2.5 leading-relaxed">
        This is your real Google rating, so it can&apos;t be typed by hand. It shows in your page header, under your business name.
      </p>
      {err&&<p className="text-[11px] text-red-500 mt-2">{err}</p>}
    </div>
  );
}

// ── Block edit panel (inline right of blocks, no modal) ───────────────────────
/**
 * The offers editor.
 *
 * One list, one row per offer, everything optional except the title. The
 * owner is not designing a coupon — how it looks is the page's job — so there
 * is nothing here but the words, the code and the date.
 */
function OffersEditor({ offers, today, onChange }: {
  offers: Offer[] | undefined;
  today: string;
  onChange: (next: Offer[]) => void;
}) {
  const list = offers ?? [];
  const live = activeOffers(list, today).length;

  const update = (id: string, patch: Partial<Offer>) =>
    onChange(list.map(o => (o.id === id ? { ...o, ...patch } : o)));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] text-[#777777] leading-relaxed">
          Shown as one row on your page that opens to the list. Expired and switched-off
          offers never appear, and with none live the row hides itself.
        </p>
        <span className="flex-shrink-0 text-[11px] font-semibold text-[#9A9A97] tabular-nums">
          {live} live
        </span>
      </div>

      {list.length === 0 && (
        <p className="rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] px-3 py-2.5 text-[11.5px] text-[#777777]">
          No offers yet. Add one and it goes live as soon as you save.
        </p>
      )}

      <div className="space-y-3">
        {list.map((offer) => {
          const expired = !!offer.expiresAt && offer.expiresAt < today;
          return (
            <div key={offer.id} className="rounded-2xl border border-[#E9E9E7] bg-white p-3.5">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${
                  expired ? 'text-[#B45309]' : offer.on === false ? 'text-[#9A9A97]' : 'text-[#15803D]'
                }`}>
                  {expired ? 'Expired' : offer.on === false ? 'Off' : 'Live'}
                </span>
                <div className="flex items-center gap-2">
                  <Toggle on={offer.on !== false} onChange={v => update(offer.id, { on: v })}/>
                  <button
                    onClick={() => onChange(list.filter(o => o.id !== offer.id))}
                    aria-label="Remove this offer"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#C0C0C0] hover:text-[#0A0A0A] hover:bg-[#F0F0F0] transition-all">
                    <LucideX size={11} color="currentColor"/>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <Input
                  value={offer.title}
                  onChange={v => update(offer.id, { title: v.slice(0, OFFER_TITLE_MAX) })}
                  placeholder="10% off your first visit"
                />
                <Input
                  value={offer.description ?? ''}
                  onChange={v => update(offer.id, { description: v.slice(0, OFFER_DESC_MAX) })}
                  placeholder="Details (optional)"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    value={offer.code ?? ''}
                    onChange={v => update(offer.id, { code: v.slice(0, OFFER_CODE_MAX) })}
                    placeholder="Code (optional)"
                  />
                  <input
                    type="date"
                    value={offer.expiresAt ?? ''}
                    onChange={e => update(offer.id, { expiresAt: e.target.value || undefined })}
                    className="w-full bg-white border border-[#E9E9E7] rounded-xl px-3 py-2 text-[12px] text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors"
                  />
                </div>
                <Input
                  value={offer.url ?? ''}
                  onChange={v => update(offer.id, { url: v })}
                  placeholder="Redeem link (optional)"
                />
              </div>
              {expired && (
                <p className="text-[10.5px] text-[#B45309] mt-2">
                  Past its date, so customers can&apos;t see it. Change the date or delete it.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={list.length >= MAX_OFFERS}
        onClick={() => onChange([...list, { id: newOfferId(), title: '', on: true }])}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#D0D5DD] text-[12.5px] font-semibold text-[#777777] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:hover:border-[#D0D5DD]">
        {list.length >= MAX_OFFERS ? `That\u2019s the limit of ${MAX_OFFERS}` : 'Add an offer'}
      </button>
    </div>
  );
}

function BlockEditPanel({ block,config,businessId,today,onUpdateBlock,onUpdateConfig,onClose,timeZone,override }: {
  block:OpenStatusBlock; config:OpenStatusPageConfig;
  /** For the rows that read live data from the business's Google listing. */
  businessId?:string;
  /** Today where the shop is — offers expire on a calendar date. */
  today?:string;
  onUpdateBlock:(u:Partial<OpenStatusBlock>)=>void;
  onUpdateConfig:(u:Partial<OpenStatusPageConfig>)=>void;
  onClose:()=>void;
  /** The third place that shows open/closed. Missed when the other two were
      fixed, so this panel kept saying "Open now" after the owner closed. */
  timeZone?:string|null;
  override?:TodayOverride;
}) {
  const hours=config.weeklyHours??DEFAULT_WEEK_HOURS;
  const {status,todayLabel}=getLiveStatus(hours, timeZone, override);
  function copyMonToWeekdays() {
    const mon=hours.mon;
    onUpdateConfig({ weeklyHours:{ ...hours, tue:{...mon},wed:{...mon},thu:{...mon},fri:{...mon} } });
  }

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-3 pb-5 mb-6 border-b border-[#E9E9E7] flex-shrink-0">
        <button onClick={onClose} className="flex items-center gap-1.5 text-[12px] text-[#858585] hover:text-[#0A0A0A] transition-colors font-medium -ml-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Blocks
        </button>
        <div className="h-4 w-px bg-[#E9E9E7]"/>
        <div className="w-7 h-7 rounded-lg bg-[#EEEEEC] border border-[#E9E9E7] flex items-center justify-center flex-shrink-0">
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
          {/* Location and Website used to have editors here. Both are header
              buttons now, not rows, so neither panel was reachable — and the
              location one wrote the address into block.sub, a field nothing
              reads any more. They are edited under Business, beside the rest
              of the business's details. */}

          {/* ── CUSTOM LINK ── */}
          {block.id.startsWith('custom-') && (
            <div className="space-y-5">
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
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border ${status==='open'?'bg-[#F0FDF4] border-[#BBF7D0]':'bg-[#F4F5F6] border-[#E9E9E7]'}`}>
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
                <div className="rounded-2xl border border-[#E9E9E7] overflow-hidden">
                  {DAYS.map(({key,label},i)=>{
                    const day=hours[key];
                    return (
                      <div key={key} className={`flex flex-wrap items-center gap-2 px-4 py-3 ${i<DAYS.length-1?'border-b border-[#F5F5F5]':''}`}>
                        <span className="text-[13px] font-medium text-[#0A0A0A] w-10 flex-shrink-0">{label.slice(0,3)}</span>
                        <button
                          onClick={()=>onUpdateConfig({weeklyHours:{...hours,[key]:{...day,closed:!day.closed}}})}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex-shrink-0 font-semibold ${day.closed?'border-[#E9E9E7] text-[#858585] bg-white':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
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
              {/* This used to offer PDF / Photos / Link. Three ways to attach a
                  menu is three ways to get it wrong, and the PDF path stored
                  the whole file as a data URL inside the page config. A link
                  is the one every business already has. */}
              <div>
                <FieldLabel>Menu link</FieldLabel>
                <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/>
                <p className="mt-1 text-[10px] text-black/35">
                  Wherever your menu already lives — your site, a Google Doc, a Toast or Square page.
                  Without a link this block won&apos;t publish.
                </p>
              </div>
              {!!block.menuFile && !block.url?.trim() && (
                <p className="rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] px-3 py-2.5 text-[11.5px] text-[#777777] leading-relaxed">
                  You have a PDF uploaded from before. It still opens on your page — paste a link
                  above whenever you want to replace it.
                </p>
              )}
            </div>
          )}

          {/* ── ORDER ── */}
          {block.id==='order' && (
            <div className="space-y-5">
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

          {/* ── PHOTOS ── */}
          {block.id==='gallery' && (
            <div className="space-y-4">
              <p className="text-[12.5px] text-[#777777] leading-relaxed">
                Pulls the photos from your Google listing — nothing to upload. Customers
                tap the row to open them without leaving your page.
              </p>
              {!config.placeId && (
                <p className="rounded-xl bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2.5 text-[11.5px] text-[#9A3412] leading-relaxed">
                  No Google place linked yet, so there are no photos to show. Connect
                  Google Business in the Business tab and this row fills itself in.
                </p>
              )}
              <div>
                <FieldLabel>Album link (optional)</FieldLabel>
                <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://… a fuller gallery"/>
                <p className="mt-1 text-[10px] text-black/35">
                  Adds a &ldquo;See more photos&rdquo; link under the grid. Leave it blank to show Google&rsquo;s photos only.
                </p>
              </div>
              <p className="text-[11px] text-[#9A9A97] leading-relaxed">
                If Google has no photos and there&rsquo;s no album link, this row hides
                itself rather than publishing an empty one.
              </p>
            </div>
          )}

          {/* ── REVIEWS ── */}
          {block.id==='reviews' && (
            <div className="space-y-4">
              <p className="text-[12.5px] text-[#777777] leading-relaxed">
                Shows your three most recent Google reviews, in full, when a customer
                taps the row. Your star rating already sits under your business name.
              </p>
              {!config.placeId
                ? (
                  <p className="rounded-xl bg-[#FFF7ED] border border-[#FED7AA] px-3 py-2.5 text-[11.5px] text-[#9A3412] leading-relaxed">
                    No Google place linked yet. Connect Google Business in the Business
                    tab and your reviews appear here automatically.
                  </p>
                )
                : (
                  <p className="rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] px-3 py-2.5 text-[11.5px] text-[#777777] leading-relaxed">
                    Reviews come straight from Google and refresh on their own. There is
                    deliberately no way to write or edit one here — a rating a customer
                    can&rsquo;t trust is worth nothing to you.
                  </p>
                )}
              <p className="text-[11px] text-[#9A9A97] leading-relaxed">
                No written reviews yet? The row still shows your score and links to Google.
              </p>
              <ReviewsProbe businessId={businessId} placeId={config.placeId}/>
            </div>
          )}

          {/* ── OFFERS ── */}
          {block.id==='offers' && (
            <OffersEditor
              offers={block.offers}
              today={today ?? localDay(new Date(), timeZone || 'America/Chicago')}
              onChange={next=>onUpdateBlock({ offers: next })}
            />
          )}

          {/* ── SHOP ── */}
          {block.id==='shop' && (
            <div className="space-y-5">
              <p className="text-[12.5px] text-[#777777] leading-relaxed">
                Sends people to the store you already run. OpenStatus doesn&apos;t hold your
                products or take the payment — it just makes sure customers can find it.
              </p>
              <div>
                <FieldLabel>Where you sell</FieldLabel>
                <BrandProviderPicker
                  providers={SHOP_PROVIDERS}
                  selectedKey={block.provider??''}
                  onSelect={(key,label)=>onUpdateBlock({ provider:key, sub: key==='other' ? 'Shop online' : label })}
                />
                <p className="mt-1 text-[10px] text-black/35">
                  Optional. Picking one shows their logo and name on the row.
                </p>
              </div>
              <div>
                <FieldLabel>Shop link</FieldLabel>
                <Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://\u2026 your store"/>
                <p className="mt-1 text-[10px] text-black/35">Without a link this block won&apos;t publish.</p>
              </div>
            </div>
          )}

          {/* ── UPDATES ── */}
          {block.id==='updates' && (
            <div className="space-y-4">
              <p className="text-[12.5px] text-[#777777] leading-relaxed">
                Shows your three most recent Instagram posts, refreshed nightly, so a
                customer can see you&rsquo;re open and active without leaving the page.
              </p>
              <p className="rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] px-3 py-2.5 text-[11.5px] text-[#777777] leading-relaxed">
                Needs your Instagram connected under Settings. Until it is, this row
                doesn&rsquo;t publish — the preview shows a placeholder so you can see
                where it will sit.
              </p>
            </div>
          )}



          {/* The size picker used to live here — Small / Square / Large.
              It is gone deliberately. An owner sizing each feature was an
              owner laying out a web page, and it produced holes where a small
              block sat alone and mismatched heights where two disagreed, for a
              choice no customer benefits from. The page has one shape now; the
              owner chooses the feel in Style instead. */}

        </div>
      </div>
    </div>
  );
}

// ── Block picker (command palette style) ──────────────────────────────────────
/**
 * Website and Directions are not in here.
 *
 * They are permanent header actions — the two things a customer reaches for
 * first — so they live in the bio card, not the row list. They were still
 * being offered as blocks, which meant an owner could add "Website", drag it
 * around, and watch it never appear on their page. Their values are edited
 * under Business, where the rest of the business's details are.
 */
const PICKER_CATEGORIES = [
  { label:'Essential',      ids:['hours'] },
  { label:'Promotions',     ids:['offers'] },
  { label:'Food & Beverage',ids:['menu','order'] },
  { label:'Selling online', ids:['shop'] },
  { label:'Engagement',     ids:['book','reviews','gallery'] },
];

function BlockPicker({ blocks, category, onAdd, onClose }: {
  blocks: OpenStatusBlock[];
  /** Used only to suggest, never to hide. See SHOP_SUGGESTED_CATEGORIES. */
  category?: string | null;
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/15"/>
      <div className="relative bg-white rounded-2xl w-full max-w-[380px] shadow-[0_12px_48px_rgba(0,0,0,0.12)] border border-[#E9E9E7] overflow-hidden" onClick={e=>e.stopPropagation()}>
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
                  // Progressive relevance: a boutique sees Shop flagged, a
                  // restaurant still finds it in the same list. Nothing is
                  // hidden from anyone on the strength of a category.
                  const suggested = def.id === 'shop'
                    && !isOn
                    && !!category
                    && SHOP_SUGGESTED_CATEGORIES.has(category);
                  return (
                    <button key={def.id}
                      onClick={()=>{ onAdd(def.id); onClose(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F4F5F6] transition-colors text-left">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        suggested ? 'bg-[#EEF2FF] border-[#C7D2FE]' : 'bg-[#EEEEEC] border-[#E9E9E7]'
                      }`}>
                        <BlockIcon id={def.id} size={14} color={suggested ? '#4338CA' : '#0A0A0A'}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#0A0A0A] leading-tight">{def.title}</p>
                        <p className="text-[11px] text-[#858585] leading-tight">{def.sub}</p>
                      </div>
                      {isOn
                        ? <span className="text-[10px] text-[#C0C0C0] font-medium flex-shrink-0">Added</span>
                        : suggested
                          ? <span className="text-[10px] font-semibold text-[#4338CA] bg-[#EEF2FF] rounded-full px-2 py-0.5 flex-shrink-0">Suggested</span>
                          : null}
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
          <button onClick={onDone} className="text-[12px] text-[#858585] hover:text-[#0A0A0A] font-medium transition-colors">Skip</button>
          <div className="flex items-center gap-2">
            {step>0&&<button onClick={()=>setStep(s=>s-1)} className="px-4 py-1.5 text-[12px] font-semibold rounded-full border border-[#E0E0E0] text-[#6B6B6B] hover:border-[#0A0A0A] transition-colors">Back</button>}
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
      className="flex-1 min-w-0 bg-[#EEEEEC] border border-[#E9E9E7] rounded-xl px-2 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition-colors cursor-pointer hover:bg-[#EEEEEE]">
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
    <div className="rounded-2xl border border-[#E9E9E7] bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4285F4"/></svg>
        <p className="text-[13px] font-semibold text-[#0A0A0A]">Sync from Google Business</p>
      </div>
      <p className="text-[11px] text-[#858585]">Paste your Place ID (starts with ChIJ…) or a Google Maps link to pull in your hours automatically.</p>
      <div className="flex gap-2">
        <input value={placeInput} onChange={e=>setPlaceInput(e.target.value)} placeholder="ChIJ... or Google Maps URL" className="flex-1 text-[12px] border border-[#E9E9E7] rounded-xl px-3 py-2 outline-none focus:border-[#0A0A0A] bg-[#FAFAFA]"/>
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
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', margin: 0, letterSpacing: '-0.02em' }}>{title}</p>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#F2F4F7', color: '#777777', fontSize: 15, lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>
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
  const [statusUpdates,setStatusUpdates]=useState<{id:number;kind:string;headline:string;detail:string|null;closes_at:string|null;opens_at?:string|null;created_at:string;expires_at:string;status:string}[]>([]);
  const [statusLoading,setStatusLoading]=useState(false);
  const [statusPosting,setStatusPosting]=useState(false);
  const [statusNote,setStatusNote]=useState('');
  const [statusCloseTime,setStatusCloseTime]=useState('15:00');
  const [openId,setOpenId]=useState<string|null>(null);
  const [showPicker,setShowPicker]=useState(false);
  const [showTutorial,setShowTutorial]=useState(()=>{try{return!localStorage.getItem('os_tutorial_done')}catch{return true}});
  // A first-run tutorial state used to live here, set from ?new=1 and never
  // read by anything. Removed rather than left as a promise the UI does not keep.
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
  type MSheetKind = null | 'block' | 'add' | 'vibe' | 'font' | 'color' | 'background';
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

  /** Live-reorders as the pointer passes each block. Logic and tests in lib/reorder. */
  const swapBlocks = useCallback((a:string,b:string)=>{
    setConfig(c=>{
      const next=swapById(c.blocks,a,b);
      return next===c.blocks ? c : {...c,blocks:next};
    });
  },[]);

  /**
   * Move a row one place up or down.
   *
   * Press-and-hold is a lovely gesture and it is not a reliable one: iOS fires
   * pointercancel the instant it decides a touch is a scroll, which kills the
   * hold before it completes and leaves an owner pressing a widget that never
   * lifts. Two arrows in the widget's own editor always work, on every device,
   * and they are the thing someone actually finds. The drag stays for the
   * people it works for.
   *
   * Moves are computed over ROWS only — hours is pinned first and the two
   * header actions are not on the page as rows at all, so stepping over them
   * would look like a press that did nothing.
   */
  const moveBlock = useCallback((id:string, dir:-1|1)=>{
    setConfig(c=>{
      const rows=c.blocks.filter(b=>!HEADER_ACTION_IDS.has(b.id)&&b.id!=='hours');
      const i=rows.findIndex(b=>b.id===id);
      if(i<0) return c;
      const j=i+dir;
      if(j<0||j>=rows.length) return c;
      const next=swapById(c.blocks,id,rows[j].id);
      return next===c.blocks?c:{...c,blocks:next};
    });
  },[]);

  /**
   * Long-press a widget to pick it up, then drag to rearrange — the iOS
   * home-screen gesture. We reorder live as the finger crosses each neighbour
   * rather than computing drop gaps, which keeps it correct in the two-column
   * grid where blocks are different widths.
   */
  const previewBlockProps = useCallback((id:string)=>({
    style:{
      touchAction: mDragId ? 'none' as const : undefined,
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      WebkitTouchCallout: 'none' as const,
      transform: mDragId===id ? 'scale(1.06)' : undefined,
      boxShadow: mDragId===id ? '0 12px 32px rgba(0,0,0,0.28)' : undefined,
      opacity: mDragId && mDragId!==id ? 0.55 : undefined,
      zIndex: mDragId===id ? 5 : undefined,
      position: mDragId===id ? 'relative' as const : undefined,
      transition: 'transform .18s cubic-bezier(.32,.72,0,1), opacity .18s, box-shadow .18s',
    },
    onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
      if(!canDrag(id)) return;            // the hours hero is pinned first
      pointerKind.current=e.pointerType;
      dragStart.current={x:e.clientX,y:e.clientY};
      cancelLongPress();
      // A mouse picks a block up as soon as you move with the button held.
      // Making someone hold still for a third of a second with a mouse feels
      // broken; on touch the hold is what separates a drag from a scroll.
      if(e.pointerType==='mouse') return;
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
        if(!st) return;
        const moved=Math.hypot(e.clientX-st.x, e.clientY-st.y);
        if(pointerKind.current==='mouse'){
          if(!canDrag(id) || !(e.buttons & 1) || moved <= 4) return;
          dragging.current=true;
          setMDragId(id);
        } else {
          // Before pick-up, real movement means the user is scrolling.
          if(moved > 8) cancelLongPress();
          return;
        }
      }
      e.preventDefault();
      const el=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null;
      const over=el?.closest('[data-block-id]') as HTMLElement|null;
      const overId=over?.getAttribute('data-block-id');
      const from=mDragId ?? id;
      if(overId && overId!==from) swapBlocks(from,overId);
    },
    onPointerUp:()=>{ const wasDragging=dragging.current; endDrag(); if(wasDragging) try{ navigator.vibrate?.(8); }catch{} },
    onPointerCancel:endDrag,
    onContextMenu:(e:React.MouseEvent)=>{ if(dragging.current) e.preventDefault(); },
    // Native link/image dragging bubbles from the anchors and photos inside a
    // block. Left alone it takes over the mouse and the reorder never starts.
    onDragStart:(e:React.DragEvent)=>{ e.preventDefault(); },
  }),[mDragId,cancelLongPress,endDrag,swapBlocks]);

  // A mouse released outside the preview never fires the block's own
  // pointerup, which would leave a block stuck to the cursor. Watch the window
  // for as long as a drag is live.
  useEffect(()=>{
    if(!mDragId) return;
    const stop=()=>endDrag();
    window.addEventListener('pointerup',stop);
    window.addEventListener('pointercancel',stop);
    return ()=>{
      window.removeEventListener('pointerup',stop);
      window.removeEventListener('pointercancel',stop);
    };
  },[mDragId,endDrag]);

  const [isMobile,setIsMobile]=useState<boolean>(false);
  const sheetDragRef=useRef<{startY:number,open:boolean}|null>(null);
  const [dragOverId,setDragOverId]=useState<string|null>(null);
  const pointerKind=useRef<string>('mouse');
  // contentMaxWidth: how wide the editor panel can grow. Drag handle shrinks it to give more room to preview.
  // SIDEBAR_W + PREVIEW_MIN must always fit, or the panels overflow the viewport
  // and the sidebar appears to sit on top of the content.
  // PREVIEW_MIN has to clear the phone itself (340) plus the stage's 24px
  // gutters, or maxWidth:100% quietly scales the preview down and the page
  // renders smaller than it really is. It was 300, so once the editor column
  // was allowed to grow to 760 the phone shrank to about 250.
  const SIDEBAR_W = 220, PREVIEW_MIN = 400;
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
  const [bizInfoOpen,setBizInfoOpen]=useState(false);
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
  // Website and Directions still live in the config — they hold the values the
  // page header reads — but they are not rows, so they are not in the list the
  // owner reorders. Leaving them in meant dragging a block that never appeared
  // on the page and switching off a button that stayed on.
  const rowBlocks = allBlocks.filter(b=>!HEADER_ACTION_IDS.has(b.id));
  // Saved order, with hours pinned to the top — exactly what publishedBlocks
  // does, so the list an owner reads top to bottom is the page they publish.
  const orderedBlocks = [...rowBlocks].sort((a,b)=>{
    const pin = (id:string)=> id==='hours' ? 0 : 1;
    return pin(a.id) - pin(b.id);
  });
  const activeBlocks = orderedBlocks.filter(b=>b.on);
  const openBlock = allBlocks.find(b=>b.id===openId)??null;
  // What the owner has set for today, if anything. Passed into every preview so
  // the Hours block shows what customers actually see — previously the preview
  // read only the weekly schedule, so a "closed today" never appeared in it.
  const todayOverride: TodayOverride = (() => {
    const active = statusUpdates.find(u=>u.status==='active');
    if(!active) return null;
    return { kind: active.kind, closesAt: active.closes_at, opensAt: active.opens_at ?? null };
  })();
  const bizTimeZone = localBusiness?.timezone ?? null;
  const {status:liveStatus,todayLabel}=getLiveStatus(config.weeklyHours, bizTimeZone, todayOverride);
  const hours = config.weeklyHours??{...DEFAULT_WEEK_HOURS};
  const showEditPanel = !!openBlock && sidebarTab==='design';
  const isEditSubTab = ['design','style'].includes(sidebarTab);

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
          await googleStatusRequest({action:'special_hours',periods:[{startDate:d(from),endDate:d(to),closed:true}],today:d(new Date())});
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
      <div className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-5 ${idx<DAYS.length-1?'border-b border-[#F5F5F5]':''}`} style={{minHeight:60}}>
        <span className="text-[12px] sm:text-[13px] font-semibold text-[#0A0A0A] w-[42px] sm:w-28 flex-shrink-0">
          <span className="sm:hidden">{label.slice(0,3)}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <button
          onClick={()=>setConfig(c=>({...c,weeklyHours:{...(c.weeklyHours??DEFAULT_WEEK_HOURS),[dayKey]:{...day,closed:!day.closed}}}))}
          className={`text-[11px] px-2.5 sm:px-3 py-1.5 rounded-full border font-semibold flex-shrink-0 transition-all ${day.closed?'border-[#E9E9E7] text-[#858585] bg-white hover:border-[#D0D0D0]':'border-[#BBF7D0] text-[#166534] bg-[#F0FDF4]'}`}
        >
          {day.closed?'Closed':'● Open'}
        </button>
        {!day.closed&&(
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
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
      badge:<span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium leading-none" style={{color:liveStatus==='open'?'#16A34A':'#9A9A97'}}>
        <span className="w-1.5 h-1.5 rounded-full" style={{background:liveStatus==='open'?'#16A34A':'#9A9A97'}}/>
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
    // Closing today wrote a DATED specialHours period on the Google listing.
    // Clearing the OpenStatus row does nothing to that, so the page reopened
    // while Google stayed shut until midnight. This is the exact undo of what
    // postStatus('closed_today') writes.
    if(googleConnected){
      try{
        const tz=bizTimeZone||'America/Chicago';
        const [ty,tm,td]=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'})
          .format(new Date()).split('-').map(Number);
        const todayDate={year:ty,month:tm,day:td};
        await googleStatusRequest({action:'special_hours',periods:[],clearDates:[todayDate],today:todayDate});
      }catch(e){ problems.push(e instanceof Error?e.message:'Google kept today\u2019s closure'); }
    }
    // CLOSED_TEMPORARILY is a separate flag from today's dated period.
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
        await googleStatusRequest({action:'special_hours',periods:[period],today:period.startDate});
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
  // The vibe cards on mobile show the same specimens, and they live under the
  // design tab rather than style — without this they all rendered in Inter and
  // "Bakery" and "Night Shift" looked identical.
  useEffect(()=>{
    if(sidebarTab!=='style' && mSheet!=='vibe') return;
    for(const opt of FONT_OPTIONS){
      if(!opt.google) continue;
      const id=`gfont-${opt.google}`;
      if(document.getElementById(id)) continue;
      const link=document.createElement('link');
      link.id=id; link.rel='stylesheet';
      link.href=`https://fonts.googleapis.com/css2?family=${opt.google}&display=swap`;
      document.head.appendChild(link);
    }
  },[sidebarTab, mSheet]);

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
        // Hours are not just another config field. The public page reads them
        // from business_hours, not from the config blob — so if this mirror
        // fails, the saved config says one thing and every customer sees
        // another. Swallowing that and showing a green "Saved" told the owner
        // their new hours were live when they were not, which is the single
        // most damaging thing this builder can get wrong.
        let hoursError: string | null = null;
        if(!error&&business?.id&&config.weeklyHours){
          try{ await syncHoursToDb(business.id, config.weeklyHours); }
          catch(e){ hoursError = e instanceof Error ? e.message : 'Hours could not be published'; }
        }
        setSaving(false);
        if(error){ setSaveError(error.message); return; }
        if(hoursError){ setSaveError(`Your hours didn’t publish — customers still see the old ones. ${hoursError}`); return; }
        setSaved(true);setTimeout(()=>setSaved(false),2000);
      });
    },1500);
    return ()=>{if(autosaveTimer.current)clearTimeout(autosaveTimer.current);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[config,hasPublished]);

  const closeEarlyTimes: string[] = [];
  for(let h=7;h<22;h++) for(const m of [0,30]) closeEarlyTimes.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#F0F2F5] text-[#0A0A0A]" style={{fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>

      {/* ── Undo block removal ── */}
      {undoBlock&&(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-full bg-[#0A0A0A] shadow-[0_10px_40px_rgba(0,0,0,0.28)]">
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
          <div className="w-full max-w-[380px] rounded-2xl bg-white border border-[#E9E9E7] shadow-[0_20px_60px_rgba(0,0,0,0.18)] p-6"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Need a hand?</h3>
              <button onClick={()=>setHelpOpen(false)} aria-label="Close"
                className="w-7 h-7 rounded-full bg-[#F7F7F6] flex items-center justify-center text-[#777777] hover:text-[#0A0A0A] transition-colors flex-shrink-0">
                <LucideX size={12} color="currentColor"/>
              </button>
            </div>
            <p className="text-[13px] text-[#777777] leading-relaxed mb-5">
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
      <aside className="w-[220px] flex-shrink-0 flex-col bg-white/80 backdrop-blur border-r border-[#E9E9E7]" style={{display:isMobile?"none":"flex"}}>
        {/* Mark + wordmark. A plain word read like placeholder text. */}
        <div className="px-5 h-[60px] flex items-center gap-2.5 flex-shrink-0">
          <span className="w-7 h-7 rounded-lg bg-[#0A0A0A] grid place-items-center flex-shrink-0" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="9" r="3.2"/><path d="M12 12.2 10.7 19h2.6L12 12.2Z"/>
            </svg>
          </span>
          <span className="font-semibold text-[16px] tracking-[-0.03em] text-[#0A0A0A]" style={{fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>OpenStatus</span>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-0.5">
          {SIDEBAR_NAV.map(({key,label,icon,badge})=>(
            <button key={key} onClick={()=>{setSidebarTab(key);setMobileSheetOpen(true);}}
              className={`relative w-full flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-xl text-[13px] font-medium text-left transition-colors ${
                sidebarTab===key ? 'bg-[#ECECEA]' : 'hover:bg-[#F7F7F6]'
              }`}
              style={{color:sidebarTab===key?'#0A0A0A':'#777777',fontWeight:sidebarTab===key?600:500}}>
              {/* A hairline accent is enough to mark the page. */}
              {sidebarTab===key&&(
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-full" style={{background:'#7C3AED'}}/>
              )}
              <span style={{color:sidebarTab===key?'#0A0A0A':'#9A9A97'}}>{icon}</span>
              {label}
              {badge}
            </button>
          ))}
        </nav>
        {/* Bottom: the live page, then who you are signed in as */}
        <div className="px-4 py-4 flex-shrink-0 space-y-2.5">
          {business?.slug&&(
            <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-2 text-[12px] font-medium text-[#777777] hover:text-[#0A0A0A] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              View live page
            </a>
          )}
          <button
            onClick={async()=>{ await supabase.auth.signOut(); window.location.href='/login'; }}
            className="w-full flex items-center gap-2 text-[11px] font-normal text-[#777777] hover:text-[#6D28D9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
          <button onClick={()=>setHelpOpen(true)} className="w-full flex items-center gap-2 text-[11px] font-normal text-[#777777] hover:text-[#6D28D9] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Help
          </button>

          {/* Identity row */}
          <div className="flex items-center gap-2.5 pt-3 mt-1 border-t border-[#E9E9E7]">
            {business?.avatar_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={business.avatar_url.startsWith('storage:')?`/api/assets?businessId=${business.id}&kind=avatar`:business.avatar_url}
                  alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0"/>
              : <span className="w-7 h-7 rounded-lg bg-[#ECECEA] grid place-items-center text-[10px] font-bold text-[#777777] flex-shrink-0">
                  {(business?.name??'?').slice(0,2).toUpperCase()}
                </span>}
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-[#0A0A0A] truncate leading-tight">{business?.name??'Your business'}</span>
              <span className="block text-[10.5px] text-[#9A9A97] leading-tight">
                {business?.slug ? `${SITE_DOMAIN}/${business.slug}` : 'Not published yet'}
              </span>
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F4F5F6]">

        {/* ── TOP NAV BAR ── */}
        <header className="relative h-14 items-center justify-between px-4 md:px-6 flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-[#E9E9E7]" style={{display:isMobile?"none":"flex"}}>
          <span aria-hidden="true"/>
          <div className="flex items-center gap-3">
            {/* Preview target. It used to float on top of the phone, covering
                the owner's own cover photo. */}
            {!['hours','settings','integrations'].includes(sidebarTab)&&(
              <div className="inline-flex gap-1 p-1 rounded-xl bg-[#F1F2F3]">
                {([['mobile','Mobile'] as const,['desktop','Desktop'] as const]).map(([k,label])=>(
                  <button key={k} onClick={()=>setPreviewMode(k)}
                    className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors ${
                      previewMode===k?'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(10,10,10,0.08)]':'text-[#777777] hover:text-[#0A0A0A]'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {business?.slug&&(
              <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E9E9E7] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F7F7F6]">
                Preview <span className="text-[#9A9A97]">↗</span>
              </a>
            )}

            <div className="flex flex-col items-end gap-0.5">
              {showSaveButton&&(
              <button onClick={save} disabled={saving} data-tut="tut-save"
                className={`px-4 py-2 rounded-xl text-[12.5px] md:text-[13px] md:px-5 font-semibold transition-colors flex-shrink-0 ${saved?'bg-[#F0FDF4] text-[#15803D]':saving?'bg-[#F7F7F6] text-[#9A9A97]':saveError?'bg-red-50 text-red-600':'bg-[#0A0A0A] text-white hover:bg-[#242424]'}`}>
                {saving?'Saving…':saved?'✓ Saved':saveError?'Error':hasPublished?'Save':'Publish'}
              </button>
              )}
              {sidebarTab==='hours'&&(
                <span className="text-[11px] text-[#9A9A97] hidden sm:block">Changes here go live right away</span>
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
                    <p className="text-[13px] font-semibold text-[#0A0A0A] mb-1">
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
                    <div className={`rounded-[22px] border px-7 py-8 mb-5 transition-colors ${isOverridden?'border-[#FDE68A] bg-[#FFFCF5]':'border-[#E9E9E7] bg-[#F7F7F6]'}`}>
                      <p className="mb-4 text-[12px] font-medium text-[#777777]">What customers see today</p>
                      <div className="flex items-start gap-3 mb-1">
                        <span className={`mt-3 w-2.5 h-2.5 shrink-0 rounded-full ${isOverridden?'bg-amber-500':liveStatus==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                        <p className="text-[32px] font-semibold leading-tight text-[#0A0A0A] tracking-[-0.045em]">
                          {isOverridden ? active[0].headline : liveStatus==='open' ? 'You’re open' : 'Closed right now'}
                        </p>
                      </div>
                      <p className="pl-[22px] text-[13px] text-[#777777] mb-6 leading-relaxed">
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
                          className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#0A0A0A] text-white text-[14px] font-semibold hover:bg-black transition-colors disabled:opacity-40"
                        >
                          {statusPosting?'Working…':'Close for today'}
                        </button>
                      )}

                      {gMsg&&<p className={`text-[12px] mt-3 ${gMsg.startsWith('✓')?'text-[#166534]':'text-[#EF4444]'}`}>{gMsg}</p>}
                      {reopenMsg&&<p className={`text-[12px] mt-2 ${reopenMsg.startsWith('✓')?'text-emerald-600':'text-[#EF4444]'}`}>{reopenMsg}</p>}
                      {googleConnected&&(
                        <p className="text-[11.5px] text-[#9A9A97] mt-3 leading-relaxed">
                          Your page updates instantly. Google usually catches up within about 10 minutes — that delay is on their end, not yours.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Everything else is a rarer case, so it stays out of the way. */}
                <button
                  onClick={()=>setStatusMore(v=>!v)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-[#777777] hover:text-[#0A0A0A] transition-colors"
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
                    <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">Different hours today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        {googleConnected?'Sets today\u2019s opening and closing on your page and on Google.':'Sets today\u2019s opening and closing on your page.'}
                      </p>
                      <div className="flex items-center gap-2 max-w-[400px]">
                        <select value={todayOpen} onChange={e=>setTodayOpen(e.target.value)}
                          className="flex-1 bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none cursor-pointer">
                          {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                        </select>
                        <span className="text-[12px] text-[#9A9A97]">to</span>
                        <select value={todayClose} onChange={e=>setTodayClose(e.target.value)}
                          className="flex-1 bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none cursor-pointer">
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
                    <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">Closing early today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        {googleConnected?'Your page and Google show the earlier time, today only.':'Your page shows the earlier time, today only.'}
                      </p>
                      <div className="flex items-center gap-2 max-w-[320px]">
                        <div className="relative flex-1">
                          <select value={statusCloseTime} onChange={e=>setStatusCloseTime(e.target.value)}
                            className="w-full bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none cursor-pointer">
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
                    <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">Add a note for today</p>
                      <p className="text-[11.5px] text-[#858585] mt-0.5 mb-3">
                        Shows beside your hours without marking you closed. Your page only — Google has nowhere to put free text.
                      </p>
                      <textarea value={statusNote} onChange={e=>setStatusNote(e.target.value.slice(0,100))}
                        placeholder="Running about 20 minutes behind today…" rows={2}
                        className="w-full bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none resize-none"/>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-[#C0C0C0]">{statusNote.length}/100</span>
                        <button onClick={()=>postStatus('note_today')} disabled={statusPosting||!statusNote.trim()}
                          className="px-4 py-2 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                          {statusPosting?'…':'Add note'}
                        </button>
                      </div>
                    </div>

                    {/* Dated closures — the old "Special hours" tab, now just a row of buttons */}
                    <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">Closing on another day</p>
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
                            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E9E9E7] bg-[#F7F7F6] hover:border-[#7C3AED] transition-colors disabled:opacity-40">
                            <LucideCalendar size={13} color="#7C3AED"/>
                            <span className="text-[12px] font-semibold text-[#0A0A0A]">{label}</span>
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
                    businessId={localBusiness?.id}
                    today={localDay(new Date(), bizTimeZone || 'America/Chicago')}
                    block={openBlock} config={config} timeZone={bizTimeZone} override={todayOverride}
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
                    <div className="rounded-2xl border border-[#E9E9E7] overflow-hidden mb-1">
                      {activeBlocks.length===0&&(
                        <div className="px-4 py-8 text-center text-[13px] text-[#858585]">No blocks yet — hit + Add block below.</div>
                      )}
                      {activeBlocks.map((block,i)=>(
                        <div key={block.id}
                          data-tut={i===0&&block.id==='hours'?'tut-hours':undefined}
                          className={`flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-[#F4F5F6]
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
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#E9E9E7] bg-[#EEEEEC]"
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
                        className="flex-1 flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-[#DCDCD9] text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors">
                        <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center flex-shrink-0">
                          <span className="text-[14px] leading-none">+</span>
                        </div>
                        <span className="text-[13px] font-medium">Add link</span>
                      </button>
                    </div>

                    {/* ── Notice ──────────────────────────────────────────
                         Above everything on the page, and above the fold on
                         every phone. Hours cannot say "snow day, delivery
                         only", and those are the days it matters most. */}
                    <div className="mb-8 rounded-2xl border border-[#E9E9E7] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#0A0A0A]">Notice at the top</p>
                          <p className="text-[12px] text-[#777777] mt-0.5">
                            One line above your page. Leave it blank when there&apos;s nothing to say.
                          </p>
                        </div>
                        <Toggle
                          on={config.bannerOn !== false}
                          onChange={v=>setConfig(c=>({...c,bannerOn:v}))}
                        />
                      </div>
                      <div className="mt-3">
                        <Input
                          value={config.banner ?? ''}
                          onChange={v=>setConfig(c=>({...c,banner:v.slice(0,160)}))}
                          placeholder="Snow day — delivery only until 2pm"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-black/35">
                            Shows on your live page and nowhere else. It stays until you clear it.
                          </p>
                          <span className="text-[10px] text-[#C0C0C0] tabular-nums flex-shrink-0 ml-3">
                            {(config.banner ?? '').length}/160
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Logo, page background and cover photo used to be
                        duplicated down here, below the block list. They are
                        not blocks — they are the look of the whole page — and
                        having a second copy of each control next to the blocks
                        meant two places to change the same thing, which is how
                        a builder starts disagreeing with itself. They live in
                        Style, which is the tab named after them. */}
                    <div className="border-t border-[#F0F0F0] pt-7">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">Logo, background and cover photo</p>
                      <p className="text-[12.5px] text-[#777777] mt-0.5 mb-3">
                        Everything about how the page looks lives in Style.
                      </p>
                      <button
                        type="button"
                        onClick={()=>{ setOpenId(null); setSidebarTab('style' as SidebarTab); }}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#E9E9E7] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors">
                        Open Style
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══ BUSINESS ══ */}
            {sidebarTab==='business'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[700px]">
                <div className="mb-7">
                  <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">Business</h2>
                  <p className="text-[#777777] text-[13px] mt-1">Your page, your Google connection, and how you&apos;re doing.</p>
                </div>

                {/* ── Analytics snapshot ── */}
                {analyticsData&&(
                  <div className="mb-7">
                    <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Last 30 days</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {label:'Page views',value:analyticsData.metrics.views,color:'#12B76A',data:(analyticsData.trend??[]).map(t=>t.views)},
                        {label:'Directions',value:analyticsData.metrics.directions,color:'#2563EB',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                        {label:'Menu taps',value:analyticsData.metrics.menu,color:'#7C3AED',data:(analyticsData.trend??[]).map(t=>t.views)},
                        {label:'Link clicks',value:analyticsData.metrics.clicks,color:'#D97706',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                      ].map(({label,value,color,data})=>(
                        <div key={label} className="rounded-2xl border border-[#E9E9E7] bg-white p-3.5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{background:`${color}14`,color}}>
                                {METRIC_ICONS[label]}
                              </span>
                              <p className="text-[11px] font-medium text-[#9A9A97] truncate">{label}</p>
                            </div>
                            <BuilderSparkline data={data} color={color}/>
                          </div>
                          <p className="text-[22px] font-semibold text-[#0A0A0A] leading-none">{value.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analyticsLoading&&(
                  <div className="mb-7 rounded-2xl border border-[#E9E9E7] bg-white p-5 text-center">
                    <p className="text-[13px] text-[#9A9A97]">Loading analytics…</p>
                  </div>
                )}

                {/* ── Live page link ── */}
                {localBusiness?.slug&&(
                  <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl border border-[#E9E9E7] bg-[#F7F7F6]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-0.5">Your page</p>
                      <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{SITE_DOMAIN}/{localBusiness.slug}</p>
                    </div>
                    <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View
                    </a>
                  </div>
                )}

                <OwnerLinkCard/>

                {/* Business details and social links used to sit here. They are
                    settings, not a dashboard: an owner types them once at setup
                    and then never again, while this tab is the thing they open
                    every week to see how the page is doing. They live in
                    Settings → Business info now, on phone and desktop both. */}

                {/* ── Google connection status ── */}
                <div className={`mb-5 p-4 rounded-2xl border ${googleConnected?'border-[#BBF7D0] bg-[#F0FDF4]':'border-[#E9E9E7] bg-[#F7F7F6]'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E9E9E7] flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#0A0A0A]">Google Business</p>
                      <p className="text-[11px] text-[#9A9A97]">{googleConnected?'Syncing hours, photos & reviews':'Sync your hours, photos & reviews'}</p>
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
                      className="mt-3 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Connect Google Business
                    </a>
                  )}
                </div>

                {/* ── Reviews & rating ── */}
                <ReviewsCard block={allBlocks.find(b=>b.id==='location')} placeId={config.placeId} onUpdateBlock={u=>updateBlock('location',u)}/>

                {/* ── Tips for success ── */}
                <div className="mb-5">
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Tips for success</p>
                  <div className="space-y-2">
                    {([
                      {tab:'hours' as SidebarTab, bg:'#F7F7F6', fg:'#0A0A0A', text:"Set your hours so customers always know when you're open"},
                      {tab:'style' as SidebarTab, bg:'#F7F7F6', fg:'#0A0A0A', text:'Add a cover photo and pick a background that feels like you'},
                      {tab:'design' as SidebarTab, bg:'#F7F7F6', fg:'#0A0A0A', text:'Turn on the blocks your customers actually need'},
                    ]).map(({tab,bg,fg,text})=>(
                      <button key={tab} onClick={()=>setSidebarTab(tab)}
                        className="flex items-center gap-3 w-full p-3 rounded-2xl border border-[#E9E9E7] hover:border-[#0A0A0A] hover:bg-[#F7F7F6] transition-all text-left">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{background:bg,color:fg}}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        </div>
                        <p className="text-[12px] text-[#777777] leading-relaxed flex-1">{text}</p>
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
                  <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">Your link</h2>
                  <p className="text-[#777777] text-[13px] mt-1">Share this anywhere — it always shows your live status.</p>
                </div>
                {localBusiness?.slug
                  ?(
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#E9E9E7] bg-[#F7F7F6]">
                      <p className="flex-1 min-w-0 text-[13px] font-medium text-[#0A0A0A] truncate">{SITE_DOMAIN}/{localBusiness.slug}</p>
                      <button
                        onClick={()=>{ void navigator.clipboard?.writeText(`${SITE_URL}/${localBusiness.slug}`); }}
                        className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] transition-colors">
                        Copy
                      </button>
                      <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] transition-colors">
                        View
                      </a>
                    </div>
                  )
                  :<p className="text-[13px] text-[#777777]">No link set yet.</p>
                }
              </div>
            )}

            {/* ══ STYLE ══ */}
            {sidebarTab==='style'&&(
              <div className="px-4 md:px-10 py-7 md:py-10 max-w-[760px] space-y-11">
                <div>
                  <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">Style</h2>
                  <p className="text-[#777777] text-[13px] mt-1">Background, imagery, brand and type.</p>
                </div>

                {/* ── 1. Vibe ───────────────────────────────────────────────
                     This used to open on a grid of colour swatches and a hex
                     wheel, which asks a shop owner to art-direct their own
                     page. A vibe picks the background, the font, the name
                     colour, the accent and the photo treatment as a set. The
                     individual controls are still here, under Fine-tune, for
                     the owner who wants their exact brand green. */}
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">1. Vibe</p>
                  <p className="text-[12.5px] text-[#777777] mt-0.5 mb-3.5">Pick a feel. You can change any part of it below.</p>
                  <VibePicker config={config} onPick={v=>setConfig(c=>applyVibe(c,v))}/>
                </div>

                {/* ── 2. Brand ── */}
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">2. Brand</p>
                  <p className="text-[12.5px] text-[#777777] mt-0.5 mb-3.5">Add your logo and cover photo.</p>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] items-start">
                    <div className="rounded-2xl border border-[#E9E9E7] bg-white p-4">
                      <p className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Logo</p>
                    <div>
                      <div className="flex items-center gap-4">
                        {localBusiness?.avatar_url
                          ?<img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                              className="w-14 h-14 rounded-full object-cover border border-[#E9E9E7] flex-shrink-0" alt="Logo"/>
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
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] text-[12px] font-medium text-[#0A0A0A] hover:bg-[#E9E9E7] transition-colors">
                            <LucideImage size={13} color="#777777"/>
                            {logoUploading?'Uploading…':'Upload logo'}
                          </span>
                        </label>
                      </div>
                      {logoUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{logoUploadError}</p>}
                    </div>
                    </div>
                    <div className="rounded-2xl border border-[#E9E9E7] bg-white p-4">
                      <p className="text-[13px] font-semibold text-[#0A0A0A] mb-3">Cover photo</p>
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
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] text-[12px] font-medium text-[#0A0A0A] hover:bg-[#E9E9E7] transition-colors">
                            <LucideImage size={13} color="#777777"/>
                            {bgUploading?'Uploading…':'Upload photo'}
                          </span>
                        </label>
                        {googlePhotos.map((url,i)=>(
                          <button key={i} onClick={()=>setConfig(c=>({...c,bgImage:url}))}
                            className={`relative w-10 h-10 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${config.bgImage===url?'border-[#0A0A0A]':'border-[#E9E9E7] hover:border-[#0A0A0A]'}`}>
                            <img src={url} className="w-full h-full object-cover" alt=""/>
                          </button>
                        ))}
                      </div>
                      {bgUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{bgUploadError}</p>}
                    </div>
                  </div>
                </div>

                {/* ── 3. Tags ── */}
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">3. Tags</p>
                  <p className="text-[12.5px] text-[#777777] mt-0.5 mb-3.5">Pick up to 3 — these show under your business name.</p>
                  {/* custom tag entry */}
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      value={tagDraft}
                      onChange={e=>setTagDraft(e.target.value.slice(0,24))}
                      onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addCustomTag(); } }}
                      placeholder="Add your own…"
                      className="flex-1 min-w-0 bg-white border border-[#E9E9E7] rounded-xl px-3 py-2 text-[12px] focus:outline-none focus:border-[#7C3AED] transition-colors"/>
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
                            sel ? 'bg-[#7C3AED] text-white border-[#0A0A0A]'
                                : full ? 'border-[#E9E9E7] text-[#D0D5DD] cursor-not-allowed'
                                       : 'border-[#E9E9E7] text-[#777777] hover:border-[#0A0A0A] hover:text-[#0A0A0A]'
                          }`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>


                {/* ── 4. Fine-tune ──────────────────────────────────────────
                     Everything a vibe already decided, for the owner who
                     wants their own brand colour or their own typeface. It is
                     closed by default because the page is finished without
                     it, and open-by-default controls read as work to do. */}
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">4. Fine-tune</p>
                  <p className="text-[12.5px] text-[#777777] mt-0.5 mb-3.5">Optional. Override any part of your vibe.</p>
                  <div className="space-y-3">
                    <MoreOptions label="Background">
                      <PageBackgroundPicker value={config.bg} onChange={(v,a,sp)=>setConfig(pc=>({...pc,bg:v,bgAnim:a,bgAnimSpeed:sp}))}/>
                    </MoreOptions>

                    <MoreOptions label="Cover photo appearance">
                      <p className="text-[12px] text-[#777777] -mt-1 mb-1">Soften a photo so it sits behind your page, not in front of it.</p>
                      <ImageAppearanceControls config={config} onChange={patch=>setConfig(c=>({...c,...patch}))}/>
                    </MoreOptions>

                    <MoreOptions label="Font">
                      <p className="text-[12px] text-[#777777] -mt-1 mb-1">Applies to everything on your page.</p>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {FONT_OPTIONS.map(opt=>{
                          const isActive=(config.font??FONT_OPTIONS[0].family)===opt.family;
                          return (
                            <button key={opt.family} onClick={()=>setConfig(c=>({...c,font:opt.family}))}
                              className={`flex flex-col items-start px-3 py-2.5 rounded-2xl border transition-all text-left ${isActive?'border-[#0A0A0A] bg-[#0A0A0A]':'border-[#E9E9E7] bg-[#F7F7F6] hover:border-[#0A0A0A]'}`}>
                              <span className={`text-[16px] leading-tight ${isActive?'text-white':'text-[#0A0A0A]'}`} style={{fontFamily:opt.family}}>Aa</span>
                              <span className={`text-[10px] font-medium mt-0.5 ${isActive?'text-white/70':'text-[#9A9A97]'}`}>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </MoreOptions>

                    <MoreOptions label="Business name colour">
                      <NameColorPicker
                        value={config.nameColor}
                        autoColor={isDarkBg(config.bg)?'#FFFFFF':'#0A0A0A'}
                        onChange={v=>setConfig(c=>({...c,nameColor:v}))}
                      />
                    </MoreOptions>
                  </div>
                </div>
              </div>
            )}

            {/* ══ ANALYTICS ══ */}
            {sidebarTab==='analytics'&&(
              <div className="px-4 md:px-8 py-6 md:py-8 max-w-[760px] space-y-7">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">Analytics</h2>
                    <p className="text-[#777777] text-[13px] mt-1">What people actually do when they land on your page.</p>
                  </div>
                  <div className="flex gap-1 p-1 rounded-full bg-[#F7F7F6]">
                    {[7,30,90].map(d=>(
                      <button key={d} onClick={()=>setAnalyticsDays(d)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${analyticsDays===d?'bg-white text-[#6D28D9] shadow-sm':'text-[#9A9A97] hover:text-[#0A0A0A]'}`}>
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                {analyticsLoading&&(
                  <div className="rounded-2xl border border-[#E9E9E7] bg-white p-10 text-center">
                    <p className="text-[13px] text-[#9A9A97]">Loading…</p>
                  </div>
                )}

                {!analyticsLoading&&!analyticsData&&(
                  <div className="rounded-2xl border border-[#E9E9E7] bg-white p-10 text-center">
                    <p className="text-[13px] text-[#9A9A97]">No data yet. Share your link and check back.</p>
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
                          <div key={label} className="rounded-2xl border border-[#E9E9E7] bg-white p-3.5">
                            <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center mb-2"
                              style={{background:`${color}14`,color}}>{METRIC_ICONS[label]}</span>
                            <p className="text-[24px] font-semibold text-[#0A0A0A] leading-none">{value.toLocaleString()}</p>
                            <p className="text-[11px] text-[#9A9A97] mt-1.5">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* views over time */}
                      <div className="rounded-2xl border border-[#E9E9E7] bg-white p-5">
                        <div className="flex items-baseline justify-between mb-4">
                          <p className="text-[13px] font-semibold text-[#0A0A0A]">Page views over time</p>
                          <p className="text-[11px] text-[#9A9A97]">Peak {maxV.toLocaleString()}</p>
                        </div>
                        {trend.length>0
                          ?(
                            <div className="flex items-end gap-[3px]" style={{height:150}}>
                              {trend.map(t=>(
                                <div key={t.date} className="group relative flex-1 min-w-[3px] h-full flex items-end">
                                  <div className="w-full rounded-t-[3px] bg-[#7C3AED]/80 group-hover:bg-[#6D28D9] transition-colors"
                                    style={{height:`${Math.max(2,(t.views/maxV)*100)}%`}}/>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-lg bg-[#0A0A0A] px-2 py-1 text-[10px] text-white">
                                    {t.date}: {t.views}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                          :<p className="text-[12px] text-[#9A9A97] py-10 text-center">No visits recorded yet.</p>
                        }
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* what people tap */}
                        <div className="rounded-2xl border border-[#E9E9E7] bg-white p-5">
                          <p className="text-[13px] font-semibold text-[#0A0A0A] mb-3.5">What people tap</p>
                          {analyticsData.topActions.length>0
                            ?(
                              <div className="space-y-2.5">
                                {analyticsData.topActions.slice(0,6).map(({id,count})=>(
                                  <div key={id} className="flex items-center gap-2.5">
                                    <span className="text-[12px] text-[#0A0A0A] w-24 truncate capitalize">{id}</span>
                                    <div className="flex-1 h-2 bg-[#F7F7F6] rounded-full overflow-hidden">
                                      <div className="h-full bg-[#7C3AED] rounded-full" style={{width:`${Math.round((count/topMax)*100)}%`}}/>
                                    </div>
                                    <span className="text-[11px] text-[#777777] w-8 text-right tabular-nums">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )
                            :<p className="text-[12px] text-[#9A9A97]">Nothing tapped yet.</p>
                          }
                        </div>

                        {/* where they came from */}
                        <div className="rounded-2xl border border-[#E9E9E7] bg-white p-5">
                          <p className="text-[13px] font-semibold text-[#0A0A0A] mb-3.5">Where they came from</p>
                          {analyticsData.trafficSources.length>0
                            ?(
                              <div className="space-y-2.5">
                                {analyticsData.trafficSources.slice(0,6).map(({source,count})=>(
                                  <div key={source} className="flex items-center justify-between gap-2">
                                    <span className="text-[12px] text-[#0A0A0A] truncate">{source||'Direct'}</span>
                                    <span className="text-[11px] text-[#777777] tabular-nums">{count}</span>
                                  </div>
                                ))}
                              </div>
                            )
                            :<p className="text-[12px] text-[#9A9A97]">No referrers yet — most link-in-bio traffic shows as Direct.</p>
                          }
                        </div>
                      </div>

                      {/* one honest summary line */}
                      <div className="rounded-2xl border border-[#E9E9E7] bg-[#F7F7F6] p-5">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">
                          {actionRate}% of visitors did something
                        </p>
                        <p className="text-[12px] text-[#777777] mt-1 leading-relaxed">
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
                  <h2 className="text-[22px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">Settings</h2>
                  <p className="text-[#777777] text-[13px] mt-1">Your business, your link, your account.</p>
                </div>

                {/* ── Business info ──
                     Everything a customer reads about the business, in one
                     card, edited once. Website and Address are the two
                     permanent buttons under the business name in the page
                     header — leave one blank and that button does not show. */}
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Business info</p>
                  <div className="rounded-2xl border border-[#E9E9E7] p-4 bg-white space-y-3">
                    <div>
                      <FieldLabel>Name</FieldLabel>
                      <Input value={bizEdit.name} onChange={v=>setBizEdit(b=>({...b,name:v}))} placeholder="Your business name"/>
                      <p className="mt-1 text-[10px] text-black/35">Shown at the top of your page.</p>
                    </div>
                    <div>
                      <FieldLabel>Category</FieldLabel>
                      <select value={bizEdit.category} onChange={e=>setBizEdit(b=>({...b,category:e.target.value}))}
                        className="w-full bg-white border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#0A0A0A] transition-colors cursor-pointer">
                        <option value="">— Select —</option>
                        {CATEGORIES.map(c=>(<option key={c.id} value={c.id}>{c.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Website</FieldLabel>
                      <Input value={bizEdit.website} onChange={v=>setBizEdit(b=>({...b,website:v}))} placeholder="https://yoursite.com"/>
                    </div>
                    <div>
                      <FieldLabel>Address</FieldLabel>
                      <Input value={bizEdit.address} onChange={v=>setBizEdit(b=>({...b,address:v}))} placeholder="123 Main St, City, State"/>
                      <p className="mt-1 text-[10px] text-black/35">
                        Shown under your name, shortened to street and town.
                      </p>
                    </div>
                    <div>
                      <FieldLabel>Directions link (optional)</FieldLabel>
                      <Input
                        value={config.directionsUrl ?? ''}
                        onChange={v=>setConfig(c=>({...c,directionsUrl:v}))}
                        placeholder="Paste your Google or Apple Maps link…"
                      />
                      <p className="mt-1 text-[10px] text-black/35">
                        Leave blank and the button searches Maps for your address, which opens
                        whichever maps app your customer already uses.
                      </p>
                    </div>
                    <div>
                      <FieldLabel>Phone</FieldLabel>
                      <Input value={bizEdit.phone} onChange={v=>setBizEdit(b=>({...b,phone:v}))} placeholder="+1 (555) 000-0000"/>
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <button onClick={saveBizInfo} disabled={bizSaving||!bizEdit.name.trim()}
                        className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                        {bizSaving?'Saving…':bizSaved?'✓ Saved':'Save'}
                      </button>
                      {bizSaveError&&<p className="text-[11px] text-red-500">{bizSaveError}</p>}
                    </div>
                  </div>
                </div>

                {/* ── Social links ──
                     These used to live inside a "Follow us" block, which also
                     rendered its own list of links on the page — so the same
                     links showed up twice. The block is gone and they live
                     here, beside the rest of the details an owner fills in once.

                     Note the builder's config keeps socials as a record keyed
                     by platform; lib/openstatus-page-config.ts keeps its own
                     type where socials is an array. The normalizer converts
                     between them on load. */}
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Social links</p>
                  <div className="rounded-2xl border border-[#E9E9E7] p-4 bg-white">
                    <p className="text-[12px] text-[#777777] mb-3.5">Shown as icons near the bottom of your page. Clear a field to remove it.</p>
                    <div className="space-y-2.5">
                      {SOCIAL_PLATFORMS.map(({key,label})=>(
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                          <Input
                            value={config.socials?.[key] ?? ''}
                            onChange={v=>setConfig(c=>({...c,socials:{...(c.socials??{}),[key]:v}}))}
                            placeholder={`${label} URL…`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Link name (slug) ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Your link</p>
                  <div className="rounded-2xl border border-[#E9E9E7] p-4 bg-white space-y-3">
                    <div className="flex items-stretch gap-0">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#E9E9E7] bg-[#F7F7F6] text-[12px] text-[#9A9A97] whitespace-nowrap">{SITE_DOMAIN}/</span>
                      <input value={slugEdit} onChange={e=>{setSlugEdit(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,48));setSlugMsg('');}}
                        placeholder="your-business"
                        className="flex-1 min-w-0 bg-white border border-[#E9E9E7] rounded-r-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#0A0A0A] transition-colors"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={saveSlug} disabled={slugSaving||!slugEdit||slugEdit===localBusiness?.slug}
                        className="px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-40">
                        {slugSaving?'Saving…':'Update link'}
                      </button>
                      {localBusiness?.slug&&(
                        <a href={`/${localBusiness.slug}`} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] transition-colors">
                          Open ↗
                        </a>
                      )}
                    </div>
                    {slugMsg&&<p className={`text-[11px] ${slugMsg.startsWith('✓')?'text-[#166534]':'text-red-500'}`}>{slugMsg}</p>}
                    <p className="text-[11px] text-[#9A9A97]">Changing this breaks any link you&apos;ve already shared. Letters, numbers and dashes only.</p>
                  </div>
                </div>

                {/* ── Plan ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Plan</p>
                  <div className="rounded-2xl border border-[#E9E9E7] bg-white overflow-hidden">
                    <div className="p-4 flex items-center gap-3 border-b border-[#F7F7F6]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">Free</p>
                        <p className="text-[11px] text-[#9A9A97] mt-0.5">Your current plan.</p>
                      </div>
                      <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#F7F7F6] text-[#777777] text-[10px] font-semibold">Active</span>
                    </div>
                    <div className="p-4">
                      <p className="text-[13px] font-semibold text-[#0A0A0A] mb-2">Pro</p>
                      <div className="space-y-1.5 mb-3">
                        {['Remove OpenStatus branding from your page','Full visitor analytics'].map(f=>(
                          <div key={f} className="flex items-center gap-2">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <span className="text-[12px] text-[#777777]">{f}</span>
                          </div>
                        ))}
                      </div>
                      <button disabled
                        className="w-full py-2.5 rounded-xl bg-[#F7F7F6] text-[#9A9A97] text-[12px] font-semibold cursor-not-allowed">
                        Coming soon
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Account ── */}
                <div>
                  <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-3">Account</p>
                  <div className="rounded-2xl border border-[#E9E9E7] p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">Password</p>
                        <p className="text-[11px] text-[#9A9A97] mt-0.5">We&apos;ll email you a reset link.</p>
                      </div>
                      <button onClick={sendPasswordReset} disabled={pwSending}
                        className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] transition-colors disabled:opacity-40">
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
                    <p className="text-[13px] font-semibold text-[#0A0A0A]">Delete account</p>
                    <p className="text-[11px] text-[#777777] mt-1 leading-relaxed">
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
                          <p className="text-[11px] text-[#777777]">Type <strong className="text-[#B42318]">DELETE</strong> to confirm.</p>
                          <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                            className="w-full bg-white border border-[#FDA29B] rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-[#B42318] transition-colors"/>
                          <div className="flex items-center gap-2">
                            <button onClick={deleteAccount} disabled={deleteConfirm!=='DELETE'||deleting}
                              className="px-4 py-2 rounded-xl bg-[#B42318] text-white text-[12px] font-semibold hover:bg-[#912018] transition-colors disabled:opacity-40">
                              {deleting?'Deleting…':'Permanently delete'}
                            </button>
                            <button onClick={()=>{setDeleteArmed(false);setDeleteConfirm('');setDeleteMsg('');}}
                              className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-medium hover:border-[#0A0A0A] transition-colors">
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
                <div className={`rounded-2xl border p-4 ${googleConnected?'border-[#BBF7D0] bg-[#F0FDF4]':'border-[#E9E9E7] bg-white'}`}>
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
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D0D5DD] text-[#0A0A0A] text-[12px] font-semibold hover:border-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors">
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
                className="w-2 flex-shrink-0 cursor-col-resize group flex items-center justify-center transition-colors hover:bg-[#0A0A0A]/5 active:bg-[#0A0A0A]/10"
                style={{background:'transparent'}}
                title="Drag to resize"
              >
                <div className="w-0.5 h-10 rounded-full bg-[#C0C0C0] group-hover:bg-[#777777] transition-colors"/>
              </div>
              {/* Preview panel */}
              <div
                className="flex-1 flex flex-col items-center justify-center relative"
                style={{
                  minWidth: 280,
                  overflow: 'hidden',
                  backgroundImage:'linear-gradient(rgba(10,10,10,0.030) 1px,transparent 1px),linear-gradient(90deg,rgba(10,10,10,0.030) 1px,transparent 1px)',
                  backgroundSize:'24px 24px',
                  backgroundColor:'#F1F2F3',
                }}
              >
                {/* Centered preview */}
                <div className="flex flex-col items-center gap-3 w-full" style={{padding:'0 24px',maxWidth:previewMode==='desktop'?'100%':undefined}}>
                  {previewMode==='mobile'
                    ?(
                      <div className="rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{width:340,maxWidth:'100%'}}>
                        <LivePhonePreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride} selectedId={openId}
                          blockProps={previewBlockProps}
                          onSelectBlock={id=>{
                            // A drag ends with a pointerup on some block; without
                            // this the drop would also open that block's editor.
                            if(dragging.current||suppressTap.current) return;
                            setOpenId(id);setSidebarTab('design');
                          }}/>
                      </div>
                    )
                    :(
                      <div className="rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[#E9E9E7] bg-white"
                        style={{width:'100%'}}>
                        {/* browser chrome, so "Web" reads as a real page */}
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F7F7F6] border-b border-[#E9E9E7]">
                          <span className="w-2 h-2 rounded-full bg-[#FF5F57]"/>
                          <span className="w-2 h-2 rounded-full bg-[#FEBC2E]"/>
                          <span className="w-2 h-2 rounded-full bg-[#28C840]"/>
                          <span className="ml-2 flex-1 truncate text-[9px] text-[#9A9A97] bg-white rounded px-2 py-0.5 border border-[#E9E9E7]">
                            {SITE_DOMAIN}/{localBusiness?.slug??'your-page'}
                          </span>
                        </div>
                        <div className="overflow-y-auto" style={{maxHeight:560}}>
                          <LiveDesktopPreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride}
                            selectedId={openId}
                            blockProps={previewBlockProps}
                            onSelectBlock={id=>{
                              if(dragging.current||suppressTap.current) return;
                              setOpenId(id);setSidebarTab('design');
                            }}/>
                        </div>
                      </div>
                    )
                  }
                  <p className="text-center text-[11px] font-medium" style={{color:mDragId?'#8B5CF6':'#9A9A97'}}>
                    {mDragId?'Drag to rearrange, let go to drop':'Click a widget to edit \u00b7 drag it to move'}
                  </p>
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b border-[#E9E9E7] flex items-center justify-between px-4 gap-3"
        style={{display:isMobile?"flex":"none",height:'calc(52px + env(safe-area-inset-top))',paddingTop:'env(safe-area-inset-top)',fontFamily:'var(--font-poppins), system-ui, sans-serif'}}>
        <span className="text-[#0A0A0A] font-semibold text-[17px] tracking-[-0.03em] truncate">
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
              className="text-[12px] font-medium text-[#777777] px-2 py-1">View ↗</a>
          )}
          {showSaveButton?(
            <button onClick={save} disabled={saving}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${saved?'bg-[#F0FDF4] text-[#15803D]':saving?'bg-[#F7F7F6] text-[#9A9A97]':'bg-[#0A0A0A] text-white'}`}>
              {saving?'Saving…':saved?'✓ Saved':hasPublished?'Save':'Publish'}
            </button>
          ):sidebarTab==='hours'?(
            <span className="text-[11px] text-[#9A9A97]">Goes live right away</span>
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
            {/* A dashboard should greet you and then tell you something.
                "Business" told her nothing she did not already know. */}
            <div className="pt-2 pb-4">
              <h2 className="text-[24px] font-semibold text-[#0A0A0A] leading-tight tracking-[-0.03em]">
                Hello, {localBusiness?.name?.trim()||'there'}
              </h2>
              <p className="text-[13px] text-[#777777] mt-1">
                {analyticsData
                  ? 'Here\u2019s how your page has been doing.'
                  : 'Here\u2019s your page at a glance.'}
              </p>
            </div>
            {/* Analytics snapshot - mobile */}
            {analyticsData&&(
              <div className="mb-4">
                <p className="text-[10px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-2">Check out these numbers — last 30 days</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {label:'Page views',value:analyticsData.metrics.views,color:'#12B76A',data:(analyticsData.trend??[]).map(t=>t.views)},
                    {label:'Directions',value:analyticsData.metrics.directions,color:'#2563EB',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                    {label:'Menu taps',value:analyticsData.metrics.menu,color:'#7C3AED',data:(analyticsData.trend??[]).map((_,i)=>i%3===0?analyticsData.metrics.menu:0)},
                    {label:'Link clicks',value:analyticsData.metrics.clicks,color:'#D97706',data:(analyticsData.trend??[]).map(t=>t.clicks)},
                  ].map(({label,value,color,data})=>(
                    <div key={label} className="rounded-2xl border border-[#E9E9E7] bg-white p-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="flex-shrink-0 w-5 h-5 rounded-lg flex items-center justify-center"
                            style={{background:`${color}14`,color}}>
                            {METRIC_ICONS[label]}
                          </span>
                          <p className="text-[10px] font-normal text-[#9A9A97] truncate">{label}</p>
                        </div>
                        <BuilderSparkline data={data} color={color}/>
                      </div>
                      <p className="text-[20px] font-semibold text-[#0A0A0A] leading-none">{value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hours & Status */}
            <div className="mb-3 p-3 bg-[#F7F7F6] rounded-2xl border border-[#E9E9E7]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Hours & Status</p>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${liveStatus==='open'?'bg-emerald-100 text-emerald-700':'bg-[#F7F7F6] text-[#777777]'}`}>
                  {liveStatus==='open'?'● Open now':'● Closed'}
                </span>
              </div>
              <p className="text-[12px] text-[#777777] mb-2">{todayLabel}</p>
              <button onClick={()=>setSidebarTab('hours' as SidebarTab)}
                className="text-[12px] font-semibold text-[#777777] hover:text-[#0A0A0A] underline underline-offset-2">
                Edit hours →
              </button>
            </div>

            {/* Reviews & rating */}
            <ReviewsCard block={allBlocks.find(b=>b.id==='location')} placeId={config.placeId} onUpdateBlock={u=>updateBlock('location',u)}/>

            <button onClick={()=>setSidebarTab('settings' as SidebarTab)}
              className="mt-3 w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#E9E9E7] bg-[#F7F7F6] text-left active:scale-[0.99] transition-transform">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E9E9E7] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Put your controls on your home screen</p>
                <p className="text-[11.5px] text-[#777777] mt-0.5">One tap to close early. No password.</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9A97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

          </div>
        )}
        {/* ── STATUS page ── one decision: closed, or open. Everything else folds away. ── */}
        {sidebarTab==='hours'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>

            {googleConnected&&gStatus?.isClosed&&(
              <div className="rounded-2xl border border-[#FEC84B] bg-[#FFFCF5] p-4 mt-3">
                <p className="text-[13px] font-semibold text-[#0A0A0A] mb-1">
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
                <div className={`rounded-[20px] border p-6 mt-4 ${isOverridden?'border-[#FDE68A] bg-[#FFFCF5]':'border-[#E9E9E7] bg-[#F7F7F6]'}`}>
                  <p className="mb-4 text-[12px] font-medium text-[#777777]">What customers see today</p>
                  <div className="flex items-start gap-3 mb-1">
                    <span className={`mt-2.5 w-2.5 h-2.5 shrink-0 rounded-full ${isOverridden?'bg-amber-500':liveStatus==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                    <p className="text-[29px] font-semibold leading-tight text-[#0A0A0A] tracking-[-0.045em]">
                      {isOverridden ? active[0].headline : liveStatus==='open' ? 'You’re open' : 'Closed right now'}
                    </p>
                  </div>
                  <p className="pl-[22px] text-[12.5px] text-[#777777] mb-6 leading-relaxed">
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
                      className="w-full py-3.5 rounded-2xl bg-[#0A0A0A] text-white text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                      {statusPosting?'Working…':'Close for today'}
                    </button>
                  )}

                  {gMsg&&<p className={`text-[12px] mt-3 ${gMsg.startsWith('✓')?'text-[#166534]':'text-[#EF4444]'}`}>{gMsg}</p>}
                  {reopenMsg&&<p className={`text-[12px] mt-2 ${reopenMsg.startsWith('✓')?'text-emerald-600':'text-[#EF4444]'}`}>{reopenMsg}</p>}
                  {googleConnected&&(
                    <p className="text-[11.5px] text-[#9A9A97] mt-3 leading-relaxed">
                      Your page updates instantly. Google usually takes about 10 minutes.
                    </p>
                  )}
                </div>
              );
            })()}

            <button onClick={()=>setStatusMore(v=>!v)}
              className="flex items-center gap-1.5 mt-4 text-[13px] font-medium text-[#777777] active:opacity-60">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                style={{transform:statusMore?'rotate(90deg)':'none',transition:'transform .18s'}}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              Something else
            </button>

            {statusMore&&(
              <div className="mt-3 space-y-2.5">
                <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Different hours today</p>
                  <p className="text-[11px] text-[#777777] mt-0.5 mb-2.5">{googleConnected?'Page + Google, today only.':'Today only.'}</p>
                  <div className="flex items-center gap-2">
                    <select value={todayOpen} onChange={e=>setTodayOpen(e.target.value)}
                      className="flex-1 bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                    <span className="text-[11px] text-[#9A9A97]">to</span>
                    <select value={todayClose} onChange={e=>setTodayClose(e.target.value)}
                      className="flex-1 bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>postStatus('custom_hours')} disabled={statusPosting||todayClose<=todayOpen}
                    className="mt-2.5 w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40">
                    {statusPosting?'…':'Set today\u2019s hours'}
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Closing early today</p>
                  <p className="text-[11px] text-[#777777] mt-0.5 mb-2.5">{googleConnected?'Page + Google, today only.':'Today only.'}</p>
                  <div className="flex items-center gap-2">
                    <select value={statusCloseTime} onChange={e=>setStatusCloseTime(e.target.value)}
                      className="flex-1 bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0A0A0A] focus:outline-none appearance-none">
                      {closeEarlyTimes.map(t=><option key={t} value={t}>{fmt12(t)}</option>)}
                    </select>
                    <button onClick={()=>postStatus('early_close')} disabled={statusPosting}
                      className="px-4 py-2.5 rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-95 transition-transform disabled:opacity-40">
                      {statusPosting?'…':'Set'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Add a note for today</p>
                  <p className="text-[11px] text-[#777777] mt-0.5 mb-2.5">Shows beside your hours. Your page only.</p>
                  <textarea value={statusNote} onChange={e=>setStatusNote(e.target.value.slice(0,100))}
                    placeholder="Running about 20 minutes behind today…" rows={2}
                    className="w-full bg-[#F7F7F6] border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none resize-none"/>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-[#C0C0C0]">{statusNote.length}/100</span>
                    <button onClick={()=>postStatus('note_today')} disabled={statusPosting||!statusNote.trim()}
                      className="px-4 py-2 rounded-full bg-[#7C3AED] text-white text-[12px] font-semibold active:scale-95 transition-transform disabled:opacity-40">
                      {statusPosting?'…':'Add note'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#E9E9E7] bg-white">
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">Closing on another day</p>
                  <p className="text-[11px] text-[#777777] mt-0.5 mb-2.5">
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
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E9E9E7] bg-[#F7F7F6] active:scale-95 transition-transform disabled:opacity-40">
                        <LucideCalendar size={13} color="#7C3AED"/>
                        <span className="text-[12px] font-semibold text-[#0A0A0A]">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mt-7 mb-2">Your normal week</p>
            <div className="rounded-2xl border border-[#E9E9E7] overflow-hidden bg-white">
              {DAYS.map(({key,label},i)=><HoursRow key={key} dayKey={key} label={label} idx={i}/>)}
            </div>
          </div>
        )}

{/* ── ANALYTICS mobile tab ── */}
        {sidebarTab==='analytics'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>
            <div className="flex items-center justify-between pt-1 pb-3">
              <h2 className="text-[20px] font-semibold text-[#0A0A0A]">Analytics</h2>
              <div className="flex gap-1.5">
                {[7,30,90].map(d=>(
                  <button key={d} onClick={()=>setAnalyticsDays(d)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${analyticsDays===d?'bg-[#7C3AED] text-white':'bg-[#F7F7F6] text-[#777777]'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {analyticsLoading&&<div className="text-center py-10 text-[13px] text-[#9A9A97]">Loading…</div>}
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
                    <div key={label} className="bg-[#F7F7F6] border border-[#E9E9E7] rounded-2xl p-3">
                      <span className="inline-flex w-6 h-6 rounded-lg items-center justify-center mb-2"
                        style={{background:'#FFFFFF',color:'#0A0A0A'}}>
                        {METRIC_ICONS[label]}
                      </span>
                      <p className="text-[22px] font-semibold text-[#0A0A0A] leading-none">{value.toLocaleString()}</p>
                      <p className="text-[10px] text-[#9A9A97] font-medium mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {/* Top blocks */}
                {analyticsData.topActions.length>0&&(
                  <div className="bg-[#F7F7F6] border border-[#E9E9E7] rounded-2xl p-3">
                    <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-2.5">Top blocks</p>
                    <div className="space-y-2">
                      {analyticsData.topActions.slice(0,6).map(({id,count})=>{
                        const max=analyticsData.topActions[0]?.count||1;
                        return (
                          <div key={id} className="flex items-center gap-2">
                            <span className="text-[12px] text-[#0A0A0A] font-medium w-20 truncate capitalize">{id}</span>
                            <div className="flex-1 h-2 bg-[#E9E9E7] rounded-full overflow-hidden">
                              <div className="h-full bg-[#0A0A0A] rounded-full" style={{width:`${Math.round(count/max*100)}%`}}/>
                            </div>
                            <span className="text-[11px] text-[#777777] w-6 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Traffic sources */}
                {analyticsData.trafficSources.length>0&&(
                  <div className="bg-[#F7F7F6] border border-[#E9E9E7] rounded-2xl p-3">
                    <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-2.5">Traffic sources</p>
                    <div className="space-y-1.5">
                      {analyticsData.trafficSources.slice(0,5).map(({source,count})=>(
                        <div key={source} className="flex items-center justify-between">
                          <span className="text-[12px] text-[#0A0A0A] font-medium">{source}</span>
                          <span className="text-[11px] text-[#777777]">{count} visits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!analyticsLoading&&!analyticsData&&(
              <div className="text-center py-10">
                <p className="text-[13px] text-[#9A9A97]">No data yet — share your link to start tracking.</p>
              </div>
            )}
          </div>
        )}
{/* ── SETTINGS tab ── */}
        {sidebarTab==='settings'&&(
          <div className="flex-1 overflow-y-auto px-4 pb-10" style={{scrollbarWidth:'none'}}>
            <h2 className="text-[20px] font-semibold text-[#0A0A0A] pt-1 pb-3">Settings</h2>
            {/* Your link */}
            {business?.slug&&(
              <div className="mb-4 p-4 bg-[#F7F7F6] rounded-2xl border border-[#E9E9E7]">
                <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-1">Your Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-[#0A0A0A] flex-1 truncate">{SITE_DOMAIN}/{business.slug}</p>
                  <a href={`/${business.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-normal text-[#777777] hover:text-[#0A0A0A] flex items-center gap-1">
                    Open ↗
                  </a>
                </div>
              </div>
            )}

            {/* Getting the controls onto a home screen had no mobile route at
                all: this card lived only in the desktop Business tab, which is
                display:none on a phone. So an owner setting up on the device
                she wanted the icon on was shown nothing. The card already knows
                it is on a phone and offers the link rather than a QR code. */}
            <OwnerLinkCard/>

            {/* Settings menu */}
            <div className="space-y-2">
              {/* This used to be a chevron that dropped you on the Business
                  dashboard and left you hunting for the fields. The fields are
                  here now, which is what the row always said it would do. */}
              <button onClick={()=>setBizInfoOpen(v=>!v)} className="flex items-center gap-3 p-3.5 bg-[#F7F7F6] rounded-2xl border border-[#E9E9E7] w-full text-left">
                <div className="w-9 h-9 rounded-xl bg-[#E9E9E7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777777" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#0A0A0A] flex-1">Edit business info</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9A97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{transform:bizInfoOpen?'rotate(90deg)':'none',transition:'transform .18s'}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              {bizInfoOpen&&(
                <div className="rounded-2xl border border-[#E9E9E7] bg-white overflow-hidden divide-y divide-[#E9E9E7]">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Name</span>
                    <input value={bizEdit.name} onChange={e=>setBizEdit(b=>({...b,name:e.target.value}))}
                      placeholder="Business name"
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Category</span>
                    <select value={bizEdit.category} onChange={e=>setBizEdit(b=>({...b,category:e.target.value}))}
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none appearance-none cursor-pointer">
                      <option value="">— Select —</option>
                      {CATEGORIES.map(c=>(<option key={c.id} value={c.id}>{c.label}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Phone</span>
                    <input value={bizEdit.phone} onChange={e=>setBizEdit(b=>({...b,phone:e.target.value}))}
                      placeholder="+1 (555) 000-0000" type="tel"
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Website</span>
                    <input value={bizEdit.website} onChange={e=>setBizEdit(b=>({...b,website:e.target.value}))}
                      placeholder="https://yoursite.com" type="url"
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Address</span>
                    <input value={bizEdit.address} onChange={e=>setBizEdit(b=>({...b,address:e.target.value}))}
                      placeholder="123 Main St, City, State"
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-[11px] font-normal text-[#777777] w-20 flex-shrink-0">Directions</span>
                    <input value={config.directionsUrl ?? ''} onChange={e=>setConfig(c=>({...c,directionsUrl:e.target.value}))}
                      placeholder="Maps link (optional)" type="url"
                      className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                  </div>
                  {SOCIAL_PLATFORMS.map(({key,label})=>(
                    <div key={key} className="flex items-center gap-2 px-3 py-2.5">
                      <span className="flex-shrink-0 w-5"><SocialIcon platform={key} size={17}/></span>
                      <input value={config.socials?.[key] ?? ''}
                        onChange={e=>setConfig(c=>({...c,socials:{...(c.socials??{}),[key]:e.target.value}}))}
                        placeholder={`${label} link…`}
                        className="flex-1 text-[12.5px] text-[#0A0A0A] bg-transparent outline-none placeholder:text-[#D0D5DD]"/>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 px-3 py-3">
                    {bizSaveError&&<p className="text-[11px] text-red-500">{bizSaveError}</p>}
                    {bizSaved&&<p className="text-[11px] text-emerald-600 font-semibold">✓ Saved</p>}
                    <button onClick={saveBizInfo} disabled={bizSaving}
                      className="ml-auto rounded-xl bg-[#7C3AED] text-white text-[12px] font-semibold px-4 py-2 active:scale-95 transition-transform disabled:opacity-40">
                      {bizSaving?'Saving…':'Save'}
                    </button>
                  </div>
                </div>
              )}
              <a href="mailto:info@openstatus.co?subject=Help" className="flex items-center gap-3 p-3.5 bg-[#F7F7F6] rounded-2xl border border-[#E9E9E7]">
                <div className="w-9 h-9 rounded-xl bg-[#E9E9E7] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777777" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                </div>
                <span className="text-[13px] font-semibold text-[#0A0A0A] flex-1">Help & Support</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9A97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
              <button onClick={async()=>{await supabase.auth.signOut();window.location.href='/login';}}
                className="flex items-center gap-3 p-3.5 bg-[#F7F7F6] rounded-2xl border border-[#E9E9E7] w-full text-left">
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
          // No grid, no grey, no 340px card floating in the middle of a
          // 390px screen. On a phone the page IS the canvas: it runs edge to
          // edge at its real width, so what she is editing is the size and
          // shape customers actually get, and opening a sheet reveals more
          // page rather than a slab of backdrop.
          backgroundColor:'#FFFFFF',
          touchAction: mDragId ? 'none' : undefined,
        }}>
        <div className="min-h-full" style={{position:'relative'}}>
          <div style={{position:'absolute',top:10,right:10,zIndex:10}}>
            <button onClick={e=>{e.stopPropagation();setPreviewKey(k=>k+1);}} title="Refresh preview"
              style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.85)',backdropFilter:'blur(8px)',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 8px rgba(0,0,0,0.12)',cursor:'pointer'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#292929" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>

          <div className="w-full">
            <LivePhonePreview key={previewKey} business={localBusiness} config={config} timeZone={bizTimeZone} override={todayOverride}
              selectedId={mSheet==='block'?openId:null}
              onSelectBlock={id=>{ if(dragging.current||suppressTap.current) return; setOpenId(id); setSidebarTab('design'); setMSheet('block'); }}
              blockProps={previewBlockProps}/>
          </div>
          {/* The toolbar floats over the canvas, so the last row needs room to
              scroll clear of it or it reads as a page that has been cut off. */}
          <div style={{height:24}}/>
        </div>
      </div>

      {/* Coach line — a pill over the page, not a white strip under it */}
      <div className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none"
        style={{
          display: isMobile && isEditSubTab && !mSheet ? 'flex' : 'none',
          bottom:'calc(126px + env(safe-area-inset-bottom))',
        }}>
        <span className="px-3 py-1.5 rounded-full text-[11px] font-medium text-white"
          style={{background:mDragId?'rgba(124,58,237,0.92)':'rgba(10,10,10,0.68)',backdropFilter:'blur(6px)'}}>
          {mDragId?'Drag to rearrange, let go to drop':'Tap a widget to edit · hold to move it'}
        </span>
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
        <div className="flex w-full max-w-[420px] bg-white/92 backdrop-blur border border-[#E9E9E7] rounded-2xl p-1 gap-1 shadow-[0_6px_24px_rgba(124,58,237,0.16)]">
          {([
            {key:'add'        as const, label:'Block',      svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>},
            {key:'vibe'       as const, label:'Vibe',       svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z"/><path d="M18 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"/></svg>},
            {key:'font'       as const, label:'Font',       svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>},
            {key:'color'      as const, label:'Color',      svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>},
            {key:'background' as const, label:'Photos',     svg:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>},
          ]).map(({key,label,svg})=>(
            <button key={key}
              onClick={()=>{ setSidebarTab('design'); setOpenId(null); setMSheet(m=>m===key?null:key); }}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10.5px] font-semibold transition-all active:scale-95 ${mSheet===key?'bg-[#ECECEA] text-[#0A0A0A]':'text-[#777777]'}`}>
              {svg}{label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ SMALL SHEETS ══ one per toolbar button, plus the per-widget editor */}

      <MobileSheet open={isMobile&&mSheet==='block'} title={openBlock?.title||'Edit widget'} onClose={()=>{setMSheet(null);setOpenId(null);}} maxVh={52} dim={false}>
        {openBlock&&canDrag(openBlock.id)&&(()=>{
          const rows=orderedBlocks.filter(b=>b.id!=='hours');
          const i=rows.findIndex(b=>b.id===openBlock.id);
          const arrow=(dir:-1|1,disabled:boolean,label:string,path:string)=>(
            <button type="button" aria-label={label} disabled={disabled}
              onClick={()=>moveBlock(openBlock.id,dir)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-[#E9E9E7] text-[12px] font-semibold text-[#0A0A0A] active:scale-95 transition-transform disabled:opacity-35">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={path}/></svg>
              {label}
            </button>
          );
          return (
            <div className="flex items-center gap-2 mb-3 p-1.5 rounded-2xl bg-[#F7F7F6] border border-[#E9E9E7]">
              {arrow(-1,i<=0,'Move up','M12 19V5M5 12l7-7 7 7')}
              {arrow(1,i<0||i>=rows.length-1,'Move down','M12 5v14M19 12l-7 7-7-7')}
            </div>
          );
        })()}
        {openBlock&&(
          <BlockEditPanel
            businessId={localBusiness?.id}
            today={localDay(new Date(), bizTimeZone || 'America/Chicago')}
            block={openBlock} config={config} timeZone={bizTimeZone} override={todayOverride}
            onUpdateBlock={u=>updateBlock(openBlock.id,u)}
            onUpdateConfig={u=>setConfig(c=>({...c,...u}))}
            onClose={()=>{setMSheet(null);setOpenId(null);}}
          />
        )}
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='add'} title="Add a block" onClose={()=>setMSheet(null)} maxVh={46}>
        {/*
          There are seven blocks. Filtering seven things into six categories was
          never going to help, and two of those tabs ("Social", "More") mapped to
          nothing at all — they looked like buttons and did nothing. Just show
          them all, plus the one thing people actually want that isn't in the list.
        */}
        {/* Compact rows. The circle is a real toggle — the previous version made
            tapping an already-on block open its editor, so there was no way to
            turn a block OFF from here at all. */}
        <div className="space-y-1.5">
          {DEFAULT_BLOCKS.filter(def=>!HEADER_ACTION_IDS.has(def.id)).map(def=>{
            const isOn = allBlocks.find(b=>b.id===def.id)?.on;
            return (
              <div key={def.id}
                className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl border border-[#E9E9E7] bg-white">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{backgroundColor:`${def.color}18`}}>
                  <BlockIcon id={def.id} size={14} color={def.color}/>
                </div>
                <button
                  onClick={()=>{ if(!isOn){ enableBlock(def.id); } setOpenId(def.id); setMSheet('block'); }}
                  className="flex-1 min-w-0 text-left active:opacity-60">
                  <p className="text-[13px] font-medium text-[#0A0A0A] leading-tight truncate">{def.title}</p>
                </button>
                <button
                  onClick={()=>{ if(isOn){ removeBlock(def.id); } else { enableBlock(def.id); } }}
                  aria-label={isOn?`Turn off ${def.title}`:`Turn on ${def.title}`}
                  aria-pressed={!!isOn}
                  className={`w-9 h-9 -mr-1 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${isOn?'bg-[#7C3AED] border-[#7C3AED]':'border-[#D0D5DD] bg-white'}`}>
                    {isOn
                      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      : <span className="text-[13px] leading-none text-[#9A9A97]">+</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={()=>{ addCustomLink(); setMSheet('block'); }}
          className="mt-2.5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-[#D0D5DD] text-[12.5px] font-semibold text-[#777777] active:scale-[0.98] transition-transform"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add any other link
        </button>
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='vibe'} title="Vibe" onClose={()=>setMSheet(null)} maxVh={56} dim={false}>
        <p className="text-[11.5px] text-[#777777] mb-3">
          Sets your background, font, name colour and photo treatment together. Font and Colour
          are still there if you want to change one part afterwards.
        </p>
        <VibePicker config={config} onPick={v=>setConfig(c=>applyVibe(c,v))}/>
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='font'} title="Font" onClose={()=>setMSheet(null)} maxVh={46} dim={false}>
        <p className="text-[11.5px] text-[#777777] mb-3">Changes every bit of text on your page.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {FONT_OPTIONS.map(opt=>{
            const isActive=(config.font??FONT_OPTIONS[0].family)===opt.family;
            return (
              <button key={opt.family} onClick={()=>setConfig(c=>({...c,font:opt.family}))}
                className={`flex flex-col items-start px-3 py-3 rounded-2xl border transition-all active:scale-95 ${isActive?'border-[#7C3AED] bg-[rgba(124,58,237,0.07)]':'border-[#E9E9E7] bg-white'}`}>
                <span className={`text-[19px] leading-tight ${isActive?'text-[#6D28D9]':'text-[#0A0A0A]'}`} style={{fontFamily:opt.family}}>Aa</span>
                <span className={`text-[10px] font-semibold mt-1 ${isActive?'text-[#7C3AED]':'text-[#9A9A97]'}`}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </MobileSheet>

      <MobileSheet open={isMobile&&mSheet==='color'} title="Business name colour" onClose={()=>setMSheet(null)} maxVh={44} dim={false}>
        <p className="text-[11.5px] text-[#777777] mb-3">Pick a colour that reads clearly on your background.</p>
        <NameColorPicker
          value={config.nameColor}
          autoColor={isDarkBg(config.bg)?'#FFFFFF':'#0A0A0A'}
          onChange={v=>setConfig(c=>({...c,nameColor:v}))}
        />
      </MobileSheet>

      {/*
        Logo and cover photo had no mobile home at all: both lived only in the
        desktop Style tab, so an owner setting up on a phone — which is most of
        them — could not put their own face on their own page. They belong
        beside the page background, because all three are the same decision:
        what this page looks like before anyone reads a word of it.
      */}
      <MobileSheet open={isMobile&&mSheet==='background'} title="Photos & background" onClose={()=>setMSheet(null)} maxVh={64} dim={false}>

        <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mb-2">Logo</p>
        <div className="flex items-center gap-3 mb-1">
          {localBusiness?.avatar_url
            ?// eslint-disable-next-line @next/next/no-img-element
             <img src={localBusiness.avatar_url.startsWith('storage:')&&localBusiness.id?`/api/assets?businessId=${localBusiness.id}&kind=avatar`:localBusiness.avatar_url}
                className="w-14 h-14 rounded-full object-cover border border-[#E9E9E7] flex-shrink-0" alt="Logo"/>
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
            <span className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] text-[12.5px] font-semibold text-[#0A0A0A] active:scale-95 transition-transform">
              <LucideImage size={13} color="#777777"/>
              {logoUploading?'Uploading…':localBusiness?.avatar_url?'Change logo':'Upload logo'}
            </span>
          </label>
        </div>
        {logoUploadError&&<p className="text-[11px] text-red-500 mb-1">{logoUploadError}</p>}

        <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mt-5 mb-2">Cover photo</p>
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
            <span className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F7F7F6] border border-[#E9E9E7] text-[12.5px] font-semibold text-[#0A0A0A] active:scale-95 transition-transform">
              <LucideImage size={13} color="#777777"/>
              {bgUploading?'Uploading…':config.bgImage?'Replace photo':'Upload photo'}
            </span>
          </label>
          {googlePhotos.map((url,i)=>(
            <button key={i} onClick={()=>setConfig(c=>({...c,bgImage:url}))}
              className={`relative w-11 h-11 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${config.bgImage===url?'border-[#0A0A0A]':'border-[#E9E9E7]'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} className="w-full h-full object-cover" alt=""/>
            </button>
          ))}
        </div>
        {bgUploadError&&<p className="text-[11px] text-red-500 mt-1.5">{bgUploadError}</p>}
        {googlePhotos.length>0&&<p className="text-[10.5px] text-[#9A9A97] mt-2">Tap one of your Google photos, or upload your own.</p>}

        <p className="text-[11px] font-semibold text-[#9A9A97] uppercase tracking-[0.12em] mt-5 mb-2">Page background</p>
        <p className="text-[11.5px] text-[#777777] mb-3">Your widgets lighten or darken automatically to stay readable.</p>
        <PageBackgroundPicker value={config.bg} onChange={(v,a,sp)=>setConfig(p=>({...p,bg:v,bgAnim:a,bgAnimSpeed:sp}))}/>
      </MobileSheet>


      {/* ── BOTTOM NAV ── always visible, on every page */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#E9E9E7] flex items-stretch"
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
            {active&&<div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-11 h-7 rounded-xl bg-[#ECECEA]"/>}
            <span className="relative z-10" style={{color:active?'#6D28D9':'#9A9A97'}}>{svg}</span>
            <span className={`text-[9px] font-medium leading-none relative z-10 ${active?'text-[#6D28D9]':'text-[#9A9A97]'}`}>{label}</span>
          </button>
        ))}
      </nav>


      {/* ── QUICK ACTION FLYOUT ── */}
      {quickAction&&(
        <div className="fixed inset-0 z-50 flex" onClick={()=>setQuickAction(null)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"/>
          <div className="relative ml-auto w-[320px] h-full bg-white shadow-2xl flex flex-col border-l border-[#E9E9E7]" onClick={e=>e.stopPropagation()}>
            {/* Flyout header */}
            <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center justify-between flex-shrink-0">
              <p className="text-[15px] font-semibold text-[#0A0A0A]">
                {quickAction==='close-early'?'Close Early'
                :quickAction==='close-today'?'Close Today'
                :quickAction==='open-today'?'Open Today'
                :quickAction==='special-hours'?'Special Hours'
                :'Out of Office'}
              </p>
              <button onClick={()=>setQuickAction(null)} className="w-7 h-7 rounded-full bg-[#EEEEEC] flex items-center justify-center hover:bg-[#E9E9E7] transition-colors">
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
                        className="w-full bg-[#EEEEEC] border border-[#E9E9E7] rounded-xl px-4 py-3 text-[14px] font-semibold text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] appearance-none cursor-pointer">
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
                      className="w-full bg-white border border-[#E9E9E7] rounded-xl px-3 py-2.5 text-[13px] text-[#0A0A0A] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] resize-none transition-colors"/>
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
                className="flex-1 py-2.5 rounded-full border border-[#E9E9E7] text-[13px] font-semibold text-[#6B6B6B] hover:border-[#0A0A0A] transition-colors">
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
          category={normalizeCategory(localBusiness?.category)}
          blocks={allBlocks}
          onAdd={id=>enableBlock(id)}
          onClose={()=>setShowPicker(false)}
        />
      )}

    </div>
  );
}
