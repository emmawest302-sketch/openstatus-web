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
const ORDER_PROVIDERS = ['DoorDash','Uber Eats','Grubhub','Square','Toast','Other'];
const BOOK_PROVIDERS  = ['Resy','OpenTable','Calendly','Square Appts','Acuity','Mindbody','Other'];
const SOCIAL_PLATFORMS = [
  { key:'instagram', label:'Instagram' },
  { key:'tiktok',    label:'TikTok'    },
  { key:'facebook',  label:'Facebook'  },
  { key:'twitter',   label:'Twitter / X'},
  { key:'youtube',   label:'YouTube'   },
];
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
  const { status } = getLiveStatus(config.weeklyHours);
  const locBlock = config.blocks.find(b=>b.id==='location');
  const reviewPct = locBlock?.reviewStars&&locBlock.reviewStars>0 ? starsToPercent(locBlock.reviewStars) : null;

  return (
    <div className="mx-auto" style={{ width:290 }}>
      <div
        className="rounded-[28px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-black/8"
        style={{ background:config.bg, minHeight:560 }}
      >
        {/* Background image hero */}
        {config.bgImage && (
          <div className="relative h-36 overflow-hidden">
            <img src={config.bgImage} className="w-full h-full object-cover" alt=""/>
            <div className="absolute inset-0 bg-black/20"/>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
              {business?.avatar_url
                ?<img src={business.avatar_url} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow" alt=""/>
                :<div className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${isDark?'bg-[#1A1A1A] text-white':'bg-white text-[#0A0A0A]'}`}>
                  {(business?.name??'B').slice(0,1).toUpperCase()}
                </div>
              }
            </div>
          </div>
        )}

        {/* Business header */}
        <div className={`px-4 pb-3 text-center ${config.bgImage?'pt-9':'pt-8'}`}>
          {!config.bgImage && (
            business?.avatar_url
              ?<img src={business.avatar_url} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" alt=""/>
              :<div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-[10px] font-black tracking-tight ${isDark?'bg-white/10 text-white':'bg-black/8 text-black'}`}>
                {(business?.name??'B').slice(0,1).toUpperCase()}
              </div>
          )}
          <p className={`font-bold text-[13px] ${tx}`}>{business?.name??'Your Business'}</p>
          {config.location && <p className={`text-[9px] ${sx} truncate px-2 mt-0.5`}>{config.location}</p>}

          {/* Review score + like/dislike row */}
          <div className="flex items-center justify-center gap-3 mt-2">
            {reviewPct && (
              <div className="flex items-center gap-1">
                <LucideStar size={9} color="#f59e0b" filled/>
                <span className="text-[9px] font-semibold" style={{ color:'#f59e0b' }}>{reviewPct}%</span>
                {locBlock?.reviewCount&&<span className={`text-[8px] ${sx}`}> · {locBlock.reviewCount.toLocaleString()}</span>}
              </div>
            )}
            {reviewPct && <span className={`text-[8px] ${sx}`}>·</span>}
            {/* Like/Dislike */}
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

        {/* Blocks — support half/full layout */}
        <div className="px-3 pb-5">
          {sortedBlocks.length===0
            ?<p className={`text-center text-[10px] py-8 ${sx}`}>Toggle blocks to see them here</p>
            :<div className="grid grid-cols-2 gap-1.5">
              {sortedBlocks.map(b=>{
                const isHalf = b.size==='half' && b.id!=='hours';
                const cardBg = b.color?`${b.color}15`:(isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.04)');
                const bdr    = b.color?`${b.color}35`:(isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)');

                const inner = (() => {
                  if(b.id==='location') return (
                    <div className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                      {b.coverPhoto
                        ?<img src={b.coverPhoto} className="w-full h-[52px] object-cover" alt=""/>
                        :<div className="h-[52px] flex items-center justify-center" style={{ background:'linear-gradient(135deg,#1e3a5f,#111827)' }}>
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
                  if(b.id==='hours') return (
                    <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border" style={{ background:cardBg, borderColor:bdr }}>
                      <BlockIcon id={b.id} size={12} color={b.color}/>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-bold ${tx}`}>{status==='open'?'Open now':'Closed'}</p>
                        <p className={`text-[8px] ${sx}`}>Tap for hours</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status==='open'?'bg-emerald-400':'bg-red-400'}`}/>
                    </div>
                  );
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Star rating (0–5)</FieldLabel>
                  <Input type="number" value={block.reviewStars?.toString()??''} onChange={v=>onUpdateBlock({reviewStars:parseFloat(v)||undefined})} placeholder="e.g. 4.7"/>
                  {block.reviewStars&&block.reviewStars>0&&(
                    <p className="text-[11px] text-[#6B6B6B] mt-1.5 flex items-center gap-1">
                      <LucideStar size={10} color="#f59e0b" filled/>
                      {block.reviewStars} → <strong>{starsToPercent(block.reviewStars)}% positive</strong>
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel>Review count</FieldLabel>
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
              <div><FieldLabel>Platform</FieldLabel><PillSelect options={ORDER_PROVIDERS} selected={block.sub} onSelect={v=>onUpdateBlock({sub:v})}/></div>
              <div><FieldLabel>Ordering URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>
            </div>
          )}

          {/* ── BOOK ── */}
          {block.id==='book' && (
            <div className="space-y-5">
              <PhotoField label="Cover photo" value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})}/>
              <div><FieldLabel>Platform</FieldLabel><PillSelect options={BOOK_PROVIDERS} selected={block.sub} onSelect={v=>onUpdateBlock({sub:v})}/></div>
              <div><FieldLabel>Booking URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>
            </div>
          )}

          {/* ── SOCIALS ── */}
          {block.id==='socials' && (
            <div className="space-y-3">
              <FieldLabel>Your social links</FieldLabel>
              {SOCIAL_PLATFORMS.map(({key,label})=>(
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7"><SocialIcon platform={key} size={22}/></div>
                  <Input value={config.socials[key]??''} onChange={v=>onUpdateConfig({socials:{...config.socials,[key]:v}})} placeholder={`${label} URL…`}/>
                </div>
              ))}
            </div>
          )}

          {/* ── WEBSITE / generic ── */}
          {(block.id==='website'||!['location','hours','menu','order','book','socials'].includes(block.id)) && (
            <div className="space-y-5">
              {block.id==='website'&&(
                <>
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
                      className={`flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-[#FAFAFA] ${i<blocks.length-1?'border-b border-[#F5F5F5]':''} ${block.id==='hours'?'bg-[#FAFFFE]':''}`}
                      style={{ height:64 }}
                      onClick={()=>setOpenId(block.id)}
                    >
                      {block.id!=='hours'
                        ?<div className="flex-shrink-0 cursor-grab opacity-25 hover:opacity-50"><LucideGrip size={14} color="#6B6B6B"/></div>
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
