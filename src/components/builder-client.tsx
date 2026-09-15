'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── types (unchanged) ──────────────────────────────────────────────────────
type Tone = 'default' | 'muted' | 'accent';
type BlockSize = 'half' | 'full';
type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
interface DayHours { open: string; close: string; closed: boolean; }
type WeeklyHours = Record<WeekDay, DayHours>;
interface OpenStatusBlock {
  id: string; title: string; sub: string; icon: string; on: boolean; tone: Tone;
  url?: string; size?: BlockSize; color?: string; coverPhoto?: string;
  menuType?: 'url' | 'pdf' | 'photos'; menuFile?: string;
}
interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[]; bg: string; socials: Record<string, string>;
  location?: string; tags?: string[]; weeklyHours?: WeeklyHours;
}
interface Business {
  id: string; name: string; slug: string;
  avatar_url?: string; description?: string; category?: string;
}

// ── design tokens ──────────────────────────────────────────────────────────
// White + cool gray system (matches homepage)
// #FFFFFF  background / surfaces
// #0A0A0A  primary text, CTAs
// #6B6B6B  secondary text
// #9B9B9B  muted / placeholder
// #EBEBEB  borders
// #F5F5F5  subtle hover
// #DCFCE7 / #166534  open status
// #FEE2E2 / #991B1B  closed status

// ── constants ──────────────────────────────────────────────────────────────
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
  { id:'location',title:'Location & directions',sub:'Map + one-tap directions',icon:'pin',on:true, tone:'default',color:'#2563eb' },
  { id:'hours',   title:'Hours & status',       sub:'Live open / closed status', icon:'clock', on:true, tone:'default',color:'#059669' },
  { id:'menu',    title:'Menu',                 sub:'Link, PDF, or photos',      icon:'menu',  on:false,tone:'default',color:'#d97706',menuType:'url' },
  { id:'order',   title:'Online ordering',      sub:'DoorDash, Uber Eats & more',icon:'bag',   on:false,tone:'default',color:'#dc2626' },
  { id:'book',    title:'Reservations & booking',sub:'OpenTable, Resy & more',  icon:'cal',   on:false,tone:'default',color:'#7c3aed' },
  { id:'socials', title:'Follow us',            sub:'Social media links',        icon:'share', on:false,tone:'default',color:'#db2777' },
  { id:'website', title:'Website',              sub:'Link to your site',         icon:'globe', on:false,tone:'default',color:'#0891b2' },
];

// ── helpers ────────────────────────────────────────────────────────────────
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

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string,unknown>;
  const saved = Array.isArray(r.blocks) ? r.blocks as OpenStatusBlock[] : [];
  return {
    blocks: DEFAULT_BLOCKS.map(def => { const f=saved.find(b=>b.id===def.id); return f?{...def,...f}:{...def}; }),
    bg:          typeof r.bg==='string'?r.bg:'#f8f5f0',
    socials:     (r.socials&&typeof r.socials==='object')?r.socials as Record<string,string>:{},
    location:    typeof r.location==='string'?r.location:undefined,
    tags:        Array.isArray(r.tags)?r.tags as string[]:[],
    weeklyHours: (r.weeklyHours&&typeof r.weeklyHours==='object')?r.weeklyHours as WeeklyHours:{...DEFAULT_WEEK_HOURS},
  };
}

// ── Lucide-style SVG icons ─────────────────────────────────────────────────
const I = ({ d, size=16, color='currentColor', fill='none', ...rest }: { d: string|React.ReactNode; size?: number; color?: string; fill?: string; [k: string]: unknown }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...rest}>{d}</svg>
);

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

// Brand platform icons
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

// ── UI primitives ──────────────────────────────────────────────────────────
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
function Input({ value,onChange,placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
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

// ── places autocomplete ────────────────────────────────────────────────────
function usePlaces(q:string): [{ description:string; place_id:string }[], ()=>void] {
  const [r,setR]=useState<{description:string;place_id:string}[]>([]);
  useEffect(()=>{
    if(q.length<2){setR([]);return;}
    const t=setTimeout(async()=>{
      try{ const res=await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`);
           const d=await res.json() as {predictions?:{description:string;place_id:string}[]};
           setR(d.predictions??[]); }catch{ setR([]); }
    },350);
    return ()=>clearTimeout(t);
  },[q]);
  return [r,()=>setR([])];
}

// ── Time select (custom styled) ────────────────────────────────────────────
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

// ── Phone preview (right column + preview tab) ─────────────────────────────
function LivePhonePreview({ business,config }: { business:Business|null; config:OpenStatusPageConfig }) {
  const activeBlocks = config.blocks.filter(b=>b.on);
  const isDark = ['#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c'].includes(config.bg);
  const tx = isDark?'text-white':'text-[#0A0A0A]';
  const sx = isDark?'text-white/50':'text-[#6B6B6B]';
  const { status } = getLiveStatus(config.weeklyHours);

  return (
    // Outer phone frame
    <div className="relative mx-auto" style={{ width:260 }}>
      {/* ambient glow */}
      <div className="absolute inset-0 bg-black/5 blur-[40px] scale-110 pointer-events-none rounded-full"/>
      {/* phone bezel */}
      <div className="relative rounded-[44px] bg-[#1A1A1A] p-[10px] shadow-[0_32px_80px_rgba(0,0,0,0.25)]">
        {/* dynamic island */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-[#1A1A1A] rounded-full z-10"/>
        {/* screen */}
        <div className="rounded-[36px] overflow-hidden" style={{ background: config.bg, minHeight:520 }}>
          {/* status bar */}
          <div className={`flex justify-between items-center px-5 pt-8 pb-0 text-[9px] ${isDark?'text-white/40':'text-black/30'}`}>
            <span>9:41</span><span>●●●</span>
          </div>
          {/* business header */}
          <div className="px-4 pt-3 pb-3 text-center">
            {business?.avatar_url
              ?<img src={business.avatar_url} className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" alt=""/>
              :<div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-[10px] font-black tracking-tight ${isDark?'bg-white/10 text-white':'bg-black/8 text-black'}`}>
                {(business?.name??'B').slice(0,1).toUpperCase()}
              </div>
            }
            <p className={`font-bold text-[13px] ${tx}`}>{business?.name??'Your Business'}</p>
            {config.location && <p className={`text-[9px] ${sx} truncate px-2 mt-0.5`}>{config.location}</p>}
            {(config.tags??[]).length>0 && (
              <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                {(config.tags??[]).slice(0,3).map(t=>(
                  <span key={t} className={`text-[8px] px-2 py-0.5 rounded-full ${isDark?'bg-white/10 text-white/60':'bg-black/6 text-black/50'}`}>{t}</span>
                ))}
              </div>
            )}
          </div>
          {/* blocks */}
          <div className="px-3 pb-5 space-y-1.5">
            {activeBlocks.length===0
              ?<p className={`text-center text-[10px] py-8 ${sx}`}>Toggle blocks to see them here</p>
              :activeBlocks.map(b=>{
                const cardBg = b.color?`${b.color}15`:(isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.04)');
                const bdr    = b.color?`${b.color}35`:(isDark?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.08)');
                if(b.id==='location') return (
                  <div key={b.id} className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                    <div className="h-[52px] relative flex items-center justify-center overflow-hidden" style={{ background:'linear-gradient(135deg,#1e3a5f,#111827)' }}>
                      <div className="absolute inset-0 opacity-15" style={{ backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 9px,rgba(255,255,255,.2) 9px,rgba(255,255,255,.2) 10px),repeating-linear-gradient(90deg,transparent,transparent 9px,rgba(255,255,255,.2) 9px,rgba(255,255,255,.2) 10px)' }}/>
                      <LucidePin size={15} color="white"/>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background:cardBg }}>
                      <BlockIcon id={b.id} size={11} color={b.color}/>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-semibold ${tx} leading-tight truncate`}>{b.title}</p>
                        {config.location&&<p className={`text-[8px] ${sx} truncate`}>{config.location}</p>}
                      </div>
                    </div>
                  </div>
                );
                if(b.id==='hours') return (
                  <div key={b.id} className="flex items-center gap-2 rounded-2xl px-3 py-2 border" style={{ background:cardBg, borderColor:bdr }}>
                    <BlockIcon id={b.id} size={11} color={b.color}/>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-semibold ${tx}`}>{status==='open'?'Open now':'Closed'}</p>
                      <p className={`text-[8px] ${sx}`}>Tap for hours</p>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full ${status==='open'?'bg-emerald-400':'bg-red-400'}`}/>
                  </div>
                );
                if(b.coverPhoto) return (
                  <div key={b.id} className="rounded-2xl overflow-hidden border" style={{ borderColor:bdr }}>
                    <img src={b.coverPhoto} className="w-full h-12 object-cover" alt=""/>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background:cardBg }}>
                      <BlockIcon id={b.id} size={11} color={b.color}/>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                        <p className={`text-[8px] ${sx} truncate`}>{b.sub}</p>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <div key={b.id} className="flex items-center gap-2 rounded-2xl px-3 py-2 border" style={{ background:cardBg, borderColor:bdr }}>
                    <BlockIcon id={b.id} size={11} color={b.color}/>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-semibold ${tx} truncate`}>{b.title}</p>
                      <p className={`text-[8px] ${sx} truncate`}>{b.sub}</p>
                    </div>
                    <span className={`text-xs ${isDark?'text-white/20':'text-black/20'}`}>›</span>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
      {/* link below phone */}
      <p className="text-center text-[11px] text-[#9B9B9B] mt-4 font-medium">openstatus.co/…</p>
    </div>
  );
}

// ── Block modal (replaces bottom sheet) ───────────────────────────────────
function BlockModal({ block,config,onUpdateBlock,onUpdateConfig,onClose }: {
  block:OpenStatusBlock; config:OpenStatusPageConfig;
  onUpdateBlock:(u:Partial<OpenStatusBlock>)=>void;
  onUpdateConfig:(u:Partial<OpenStatusPageConfig>)=>void;
  onClose:()=>void;
}) {
  const [locQuery,setLocQuery]=useState(config.location??'');
  const [places,clearPlaces]=usePlaces(locQuery);

  // hours-specific state
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
        {/* modal header */}
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

        {/* scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── LOCATION ── */}
          {block.id==='location' && (
            <div className="space-y-5">
              <div>
                <FieldLabel>Business address</FieldLabel>
                <Input value={locQuery} onChange={setLocQuery} placeholder="Search your address…"/>
                {places.length>0 && (
                  <div className="mt-1.5 bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-sm">
                    {places.map(p=>(
                      <button key={p.place_id} onClick={()=>{ setLocQuery(p.description); onUpdateConfig({location:p.description}); clearPlaces(); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#0A0A0A] hover:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-0 flex items-center gap-2">
                        <LucidePin size={12} color="#9B9B9B"/>
                        <span className="truncate">{p.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {config.location
                ?<div>
                  <FieldLabel>Map preview</FieldLabel>
                  <div className="rounded-xl overflow-hidden border border-[#EBEBEB]" style={{ height:180 }}>
                    <iframe src={`https://maps.google.com/maps?q=${encodeURIComponent(config.location)}&t=&z=15&output=embed&iwloc=`} className="w-full h-full" style={{ border:0 }} loading="lazy" title="Location map"/>
                  </div>
                </div>
                :<div className="rounded-xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] h-28 flex items-center justify-center">
                  <p className="text-[12px] text-[#9B9B9B]">Map preview will appear here</p>
                </div>
              }
              <div><FieldLabel>Button label</FieldLabel><Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/></div>
            </div>
          )}

          {/* ── HOURS ── */}
          {block.id==='hours' && (
            <div className="space-y-6">
              {/* status card */}
              <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border ${status==='open'?'bg-[#F0FDF4] border-[#BBF7D0]':'bg-[#FAFAFA] border-[#EBEBEB]'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status==='open'?'bg-emerald-500':'bg-[#C0C0C0]'}`}/>
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">{status==='open'?'Open now':'Closed right now'}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">{todayLabel}</p>
                </div>
              </div>

              {/* days */}
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

              {/* status color */}
              <div>
                <FieldLabel>Status color</FieldLabel>
                <p className="text-xs text-[#9B9B9B] mb-3">Used for your live open/closed indicator</p>
                <div className="flex gap-2 flex-wrap">
                  {BLOCK_COLORS.map((c,i)=>(
                    <button key={i} onClick={()=>onUpdateBlock({color:c})}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{ background:c, outline: (block.color??'')=== c?`2px solid ${c}`:'none', outlineOffset:2 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MENU ── */}
          {block.id==='menu' && (
            <div className="space-y-5">
              <div>
                <FieldLabel>Cover photo</FieldLabel>
                <Input value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} placeholder="Paste image URL…"/>
                {block.coverPhoto&&<img src={block.coverPhoto} className="mt-2 w-full h-28 object-cover rounded-xl" alt=""/>}
              </div>
              <div>
                <FieldLabel>Menu type</FieldLabel>
                <PillSelect options={['Link','PDF','Photos']} selected={block.menuType==='url'?'Link':block.menuType==='pdf'?'PDF':'Photos'} onSelect={v=>onUpdateBlock({menuType:v==='Link'?'url':v==='PDF'?'pdf':'photos'})}/>
              </div>
              {block.menuType==='url'&&<div><FieldLabel>Menu URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>}
              <div><FieldLabel>Button label</FieldLabel><Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/></div>
              <div><FieldLabel>Subtitle</FieldLabel><Input value={block.sub} onChange={v=>onUpdateBlock({sub:v})}/></div>
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
              <div>
                <FieldLabel>Cover photo</FieldLabel>
                <Input value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} placeholder="Paste image URL…"/>
                {block.coverPhoto&&<img src={block.coverPhoto} className="mt-2 w-full h-28 object-cover rounded-xl" alt=""/>}
              </div>
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

          {/* ── WEBSITE (+ generic fallback) ── */}
          {(block.id==='website'||!['location','hours','menu','order','book','socials'].includes(block.id)) && (
            <div className="space-y-5">
              {block.id==='website'&&(
                <div>
                  <FieldLabel>Cover photo</FieldLabel>
                  <Input value={block.coverPhoto??''} onChange={v=>onUpdateBlock({coverPhoto:v})} placeholder="Paste image URL…"/>
                  {block.coverPhoto&&<img src={block.coverPhoto} className="mt-2 w-full h-28 object-cover rounded-xl" alt=""/>}
                </div>
              )}
              <div><FieldLabel>Button label</FieldLabel><Input value={block.title} onChange={v=>onUpdateBlock({title:v})}/></div>
              <div><FieldLabel>Subtitle</FieldLabel><Input value={block.sub} onChange={v=>onUpdateBlock({sub:v})}/></div>
              {block.id==='website'&&<div><FieldLabel>Website URL</FieldLabel><Input value={block.url??''} onChange={v=>onUpdateBlock({url:v})} placeholder="https://…"/></div>}
            </div>
          )}

          {/* accent color (all except hours which has its own) */}
          {block.id!=='hours' && (
            <div className="mt-6 pt-6 border-t border-[#F5F5F5]">
              <FieldLabel>Accent color</FieldLabel>
              <div className="flex gap-2 flex-wrap">
                {BLOCK_COLORS.map((c,i)=>(
                  <button key={i} onClick={()=>onUpdateBlock({color:c})}
                    className="w-7 h-7 rounded-full transition-all"
                    style={{ background:c, outline:(block.color??'')=== c?`2px solid ${c}`:'none', outlineOffset:2 }}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* sticky footer */}
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

// ── main export ────────────────────────────────────────────────────────────
export default function BuilderClient({ business,initialConfig }: {
  business:Business|null; initialConfig:OpenStatusPageConfig;
}) {
  const [config,setConfig]=useState<OpenStatusPageConfig>(initialConfig??normalizeOpenStatusPageConfig(undefined));
  const [tab,setTab]=useState<'blocks'|'style'|'preview'>('blocks');
  const [openId,setOpenId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);

  const blocks=config.blocks;
  const openBlock=blocks.find(b=>b.id===openId)??null;
  const {status:liveStatus,todayLabel}=getLiveStatus(config.weeklyHours);

  function updateBlock(id:string, u:Partial<OpenStatusBlock>) {
    setConfig(c=>({...c,blocks:c.blocks.map(b=>b.id===id?{...b,...u}:b)}));
  }
  function toggleBlock(id:string) {
    updateBlock(id,{on:!blocks.find(b=>b.id===id)?.on});
  }
  async function save() {
    setSaving(true);
    try { await supabase.auth.updateUser({data:{openstatus_page:config}}); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A]" style={{ fontFamily:"'Poppins', system-ui, sans-serif" }}>

      {/* ── header ── */}
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

      {/* ── tab bar ── */}
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

      {/* ── two-column workspace ── */}
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-20">

          {/* ── LEFT: editing controls ── */}
          <div className="min-w-0">

            {/* BLOCKS TAB */}
            {tab==='blocks' && (
              <div>
                <div className="mb-8">
                  <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-1">YOUR PAGE</p>
                  <h2 className="text-2xl font-bold text-[#0A0A0A] leading-tight">Build your page</h2>
                  <p className="text-[#6B6B6B] text-sm mt-1">Choose what customers see when they open your link.</p>
                </div>

                {/* block rows */}
                <div className="rounded-2xl border border-[#EBEBEB] overflow-hidden">
                  {blocks.map((block,i)=>(
                    <div key={block.id}
                      className={`flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-[#FAFAFA] ${i<blocks.length-1?'border-b border-[#F5F5F5]':''} ${block.on?'bg-white':'bg-white'}`}
                      style={{ height:64 }}
                      onClick={()=>setOpenId(block.id)}
                    >
                      {/* drag handle */}
                      <div className="flex-shrink-0 cursor-grab opacity-25 hover:opacity-50">
                        <LucideGrip size={14} color="#6B6B6B"/>
                      </div>
                      {/* icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${block.on?'bg-[#F5F5F5] border-[#EBEBEB]':'bg-[#FAFAFA] border-[#F0F0F0]'}`}>
                        <BlockIcon id={block.id} size={15} color={block.on?'#0A0A0A':'#C0C0C0'}/>
                      </div>
                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-semibold leading-tight ${block.on?'text-[#0A0A0A]':'text-[#9B9B9B]'}`}>{block.title}</p>
                          {block.id==='hours' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${liveStatus==='open'?'bg-[#DCFCE7] text-[#166534]':'bg-[#F5F5F5] text-[#9B9B9B]'}`}>
                              {liveStatus==='open'?'● Open':'● Closed'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#9B9B9B] leading-tight mt-0.5 truncate">
                          {block.id==='hours'?todayLabel:block.sub}
                        </p>
                      </div>
                      {/* edit arrow */}
                      <LucideChevronRight size={14} color="#C0C0C0"/>
                      {/* toggle */}
                      <Toggle on={block.on} onChange={()=>toggleBlock(block.id)}/>
                    </div>
                  ))}
                </div>

                {/* features & vibe */}
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

            {/* STYLE TAB */}
            {tab==='style' && (
              <div className="space-y-10">
                <div>
                  <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-1">PAGE STYLE</p>
                  <h2 className="text-2xl font-bold text-[#0A0A0A] leading-tight">Customize the look</h2>
                  <p className="text-[#6B6B6B] text-sm mt-1">Set the background and connect your social profiles.</p>
                </div>

                <div>
                  <FieldLabel>Page background</FieldLabel>
                  <p className="text-xs text-[#9B9B9B] mb-4">Background color of your public page</p>
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
                    <span className="text-xs text-[#9B9B9B]">{config.bg} · click to customize</span>
                    <input type="color" value={config.bg} onChange={e=>setConfig(c=>({...c,bg:e.target.value}))} className="opacity-0 absolute w-0 h-0"/>
                  </label>
                </div>

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

            {/* PREVIEW TAB (mobile only — desktop always shows right column) */}
            {tab==='preview' && (
              <div className="lg:hidden flex flex-col items-center py-8">
                <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-8">What customers see</p>
                <LivePhonePreview business={business} config={config}/>
              </div>
            )}
          </div>

          {/* ── RIGHT: sticky phone preview (desktop only) ── */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-widest mb-6 text-center">Live preview</p>
              <LivePhonePreview business={business} config={config}/>
            </div>
          </div>

        </div>
      </div>

      {/* ── block modal ── */}
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
