'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── types ──────────────────────────────────────────────────────────────────

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

// ── constants ──────────────────────────────────────────────────────────────

const BG_PRESETS = [
  '#f8f5f0','#fef9ef','#f0f4ff','#fff0f5','#f0fdf4',
  '#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c',
];

const BLOCK_COLORS = ['#2563eb','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#0a0a0a'];

const ORDER_PROVIDERS = ['DoorDash','Uber Eats','Grubhub','Square','Toast','Other'];
const BOOK_PROVIDERS  = ['Resy','OpenTable','Calendly','Square Appts','Acuity','Mindbody','Other'];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok',    label: 'TikTok'    },
  { key: 'facebook',  label: 'Facebook'  },
  { key: 'twitter',   label: 'Twitter / X'},
  { key: 'youtube',   label: 'YouTube'   },
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
  { key:'mon', label:'Mon' },{ key:'tue', label:'Tue' },{ key:'wed', label:'Wed' },
  { key:'thu', label:'Thu' },{ key:'fri', label:'Fri' },{ key:'sat', label:'Sat' },{ key:'sun', label:'Sun' },
];

const DEFAULT_WEEK_HOURS: WeeklyHours = {
  mon:{ open:'09:00', close:'17:00', closed:false },
  tue:{ open:'09:00', close:'17:00', closed:false },
  wed:{ open:'09:00', close:'17:00', closed:false },
  thu:{ open:'09:00', close:'17:00', closed:false },
  fri:{ open:'09:00', close:'21:00', closed:false },
  sat:{ open:'10:00', close:'21:00', closed:false },
  sun:{ open:'10:00', close:'16:00', closed:false },
};

const DEFAULT_BLOCKS: OpenStatusBlock[] = [
  { id:'location', title:'Location & directions', sub:'Map + one-tap directions',   icon:'pin',      on:true,  tone:'default', color:'#2563eb' },
  { id:'hours',    title:'Hours & status',        sub:'Live open / closed status',   icon:'clock',    on:true,  tone:'default', color:'#059669' },
  { id:'menu',     title:'Menu',                  sub:'Link, PDF, or photos',        icon:'menu',     on:false, tone:'default', color:'#d97706', menuType:'url' },
  { id:'order',    title:'Online ordering',        sub:'DoorDash, Uber Eats & more', icon:'bag',      on:false, tone:'default', color:'#dc2626' },
  { id:'book',     title:'Reservations & booking', sub:'OpenTable, Resy & more',     icon:'calendar', on:false, tone:'default', color:'#7c3aed' },
  { id:'socials',  title:'Follow us',             sub:'Social media links',          icon:'share',    on:false, tone:'default', color:'#db2777' },
  { id:'website',  title:'Website',               sub:'Link to your site',           icon:'globe',    on:false, tone:'default', color:'#0891b2' },
];

// ── helpers ────────────────────────────────────────────────────────────────

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr} ${ampm}` : `${hr}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function getLiveStatus(hours?: WeeklyHours): { status: 'open'|'closed'; todayLabel: string } {
  if (!hours) return { status:'closed', todayLabel:'Set your hours' };
  const dayKeys: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const now = new Date();
  const today = hours[dayKeys[now.getDay()]];
  if (today.closed) return { status:'closed', todayLabel:'Closed today' };
  const [oh,om] = today.open.split(':').map(Number);
  const [ch,cm] = today.close.split(':').map(Number);
  const nowMins = now.getHours()*60+now.getMinutes();
  const label = `Today ${fmt12(today.open)} – ${fmt12(today.close)}`;
  return { status: nowMins >= oh*60+om && nowMins < ch*60+cm ? 'open' : 'closed', todayLabel: label };
}

// ── normalize ──────────────────────────────────────────────────────────────

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const saved = Array.isArray(r.blocks) ? (r.blocks as OpenStatusBlock[]) : [];
  const blocks = DEFAULT_BLOCKS.map(def => {
    const found = saved.find(b => b.id === def.id);
    return found ? { ...def, ...found } : { ...def };
  });
  return {
    blocks,
    bg:          typeof r.bg === 'string' ? r.bg : '#f8f5f0',
    socials:     (r.socials && typeof r.socials === 'object') ? r.socials as Record<string,string> : {},
    location:    typeof r.location === 'string' ? r.location : undefined,
    tags:        Array.isArray(r.tags) ? r.tags as string[] : [],
    weeklyHours: (r.weeklyHours && typeof r.weeklyHours === 'object')
                   ? r.weeklyHours as WeeklyHours : { ...DEFAULT_WEEK_HOURS },
  };
}

// ── SVG block icons ────────────────────────────────────────────────────────

function IconPin({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconClock({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconMenuLines({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function IconBag({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}

function IconCalendar({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function IconShare({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function IconGlobe({ size=20, color='currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function BlockIcon({ id, color, size=20 }: { id: string; color?: string; size?: number }) {
  const c = color || '#0a0a0a';
  switch(id) {
    case 'location': return <IconPin size={size} color={c}/>;
    case 'hours':    return <IconClock size={size} color={c}/>;
    case 'menu':     return <IconMenuLines size={size} color={c}/>;
    case 'order':    return <IconBag size={size} color={c}/>;
    case 'book':     return <IconCalendar size={size} color={c}/>;
    case 'socials':  return <IconShare size={size} color={c}/>;
    default:         return <IconGlobe size={size} color={c}/>;
  }
}

// ── brand platform icons ───────────────────────────────────────────────────

function IconInstagram({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.7" fill="none"/>
      <circle cx="17.2" cy="6.8" r="1.1" fill="white"/>
    </svg>
  );
}

function IconTikTok({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#010101"/>
      <path d="M17.5 5.5a3.8 3.8 0 0 1-2.9-3.3V2H11.8v13.1a2.2 2.2 0 0 1-2.2 2 2.2 2.2 0 0 1-2.2-2.2 2.2 2.2 0 0 1 2.2-2.2c.2 0 .4 0 .6.1V9.9a5.9 5.9 0 0 0-.6 0 5.9 5.9 0 0 0-5.9 5.9 5.9 5.9 0 0 0 5.9 5.9 5.9 5.9 0 0 0 5.8-5.9V9a7.5 7.5 0 0 0 4.3 1.3V7.1a3.8 3.8 0 0 1-1.8-.4 3.8 3.8 0 0 1-1-.8l.1.6z" fill="white"/>
    </svg>
  );
}

function IconFacebook({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="white"/>
    </svg>
  );
}

function IconTwitterX({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#000"/>
      <path d="M17.5 4h2.5l-5.4 6.2 6.3 8.3h-5l-3.9-5.1-4.4 5.1H5l5.8-6.6L4.8 4h5.1l3.5 4.6L17.5 4zm-.9 12.9h1.4L7.5 5.5H6L16.6 16.9z" fill="white"/>
    </svg>
  );
}

function IconYouTube({ size=24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#FF0000"/>
      <path d="M21 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2-.9C16 4.8 12 4.8 12 4.8s-4 0-6.1.3c-.4 0-1.3.1-2 .9C3.3 6.6 3 8 3 8S2.8 9.6 2.8 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.9 2c.7.8 1.7.8 2.1.9C7.4 19 12 19 12 19s4 0 6.1-.3c.4-.1 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C21.2 9.6 21 8 21 8z" fill="white"/>
      <polygon points="10,9 10,15 15.5,12" fill="#FF0000"/>
    </svg>
  );
}

function SocialIcon({ platform, size=24 }: { platform: string; size?: number }) {
  switch(platform) {
    case 'instagram': return <IconInstagram size={size}/>;
    case 'tiktok':    return <IconTikTok size={size}/>;
    case 'facebook':  return <IconFacebook size={size}/>;
    case 'twitter':   return <IconTwitterX size={size}/>;
    case 'youtube':   return <IconYouTube size={size}/>;
    default:          return (
      <div style={{ width:size, height:size, background:'#e5e2dc', borderRadius:6 }}
        className="flex items-center justify-center">
        <IconGlobe size={size*0.6} color="#9a9690"/>
      </div>
    );
  }
}

// ── UI primitives ──────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!on); }}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#0a0a0a]' : 'bg-[#d0cbc2]'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-2 font-semibold">{children}</p>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-[#e5e2dc] rounded-xl px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-[#b0ab9f] focus:outline-none focus:border-[#0a0a0a] transition-colors"
    />
  );
}

function PillGrid({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)}
          className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${selected === opt ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e2dc] text-[#6b6b6b] bg-white hover:border-[#0a0a0a] hover:text-[#0a0a0a]'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const times: string[] = [];
  for (let h=0; h<24; h++) for (const m of [0,30])
    times.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`);
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white border border-[#e5e2dc] rounded-lg px-2 py-1.5 text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0a0a0a] cursor-pointer"
    >
      {times.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

// ── places autocomplete ────────────────────────────────────────────────────

function usePlaces(query: string): [{ description: string; place_id: string }[], () => void] {
  const [results, setResults] = useState<{ description: string; place_id: string }[]>([]);
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
        const data = await res.json() as { predictions?: { description: string; place_id: string }[] };
        setResults(data.predictions ?? []);
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);
  return [results, () => setResults([])];
}

// ── color picker ───────────────────────────────────────────────────────────

function ColorPicker({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (u: Partial<OpenStatusBlock>) => void }) {
  return (
    <div className="pt-5 border-t border-[#f0ede8] mt-5">
      <FieldLabel>Accent color</FieldLabel>
      <div className="flex gap-2 flex-wrap">
        {BLOCK_COLORS.map((c, i) => (
          <button key={i} onClick={() => onUpdate({ color: c })}
            className={`w-9 h-9 rounded-xl border-2 transition-all ${(block.color ?? '') === c ? 'border-[#0a0a0a] scale-110' : 'border-transparent hover:border-[#0a0a0a]/30'}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

// ── block settings (bottom sheet content) ─────────────────────────────────

function BlockSettings({ block, config, onUpdateBlock, onUpdateConfig }: {
  block: OpenStatusBlock; config: OpenStatusPageConfig;
  onUpdateBlock: (u: Partial<OpenStatusBlock>) => void;
  onUpdateConfig: (u: Partial<OpenStatusPageConfig>) => void;
}) {
  const [locQuery, setLocQuery] = useState(config.location ?? '');
  const [places, clearPlaces] = usePlaces(locQuery);

  if (block.id === 'location') {
    const mapSrc = config.location
      ? `https://maps.google.com/maps?q=${encodeURIComponent(config.location)}&t=&z=15&output=embed&iwloc=`
      : null;
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Business address</FieldLabel>
          <TextInput value={locQuery} onChange={setLocQuery} placeholder="Search your address…" />
          {places.length > 0 && (
            <div className="mt-2 bg-white border border-[#e5e2dc] rounded-2xl overflow-hidden shadow-sm">
              {places.map(p => (
                <button key={p.place_id}
                  onClick={() => { setLocQuery(p.description); onUpdateConfig({ location: p.description }); clearPlaces(); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#0a0a0a] hover:bg-[#f5f2ee] border-b border-[#f0ede8] last:border-0 flex items-center gap-2"
                >
                  <IconPin size={13} color="#9a9690"/>
                  <span className="truncate">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {mapSrc ? (
          <div>
            <FieldLabel>Map preview</FieldLabel>
            <div className="rounded-2xl overflow-hidden border border-[#e5e2dc]" style={{ height:180 }}>
              <iframe src={mapSrc} className="w-full h-full" style={{ border:0 }} loading="lazy" title="Location map"/>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d0cbc2] bg-[#f5f2ee] h-28 flex items-center justify-center">
            <p className="text-[11px] text-[#9a9690]">Map preview will appear here</p>
          </div>
        )}
        <div><FieldLabel>Button label</FieldLabel><TextInput value={block.title} onChange={v => onUpdateBlock({ title:v })} /></div>
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  if (block.id === 'hours') {
    const hours = config.weeklyHours ?? DEFAULT_WEEK_HOURS;
    const { status, todayLabel } = getLiveStatus(hours);
    return (
      <div className="space-y-5">
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${status === 'open' ? 'border-[#a8e063] bg-[#d4f5a0]' : 'border-[#e5e2dc] bg-[#f5f2ee]'}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'open' ? 'bg-[#2a6a00]' : 'bg-[#b0ab9f]'}`}/>
          <div>
            <p className="text-sm font-bold text-[#0a0a0a]">{status === 'open' ? 'Open now' : 'Closed right now'}</p>
            <p className="text-xs text-[#6b6b6b] mt-0.5">{todayLabel}</p>
          </div>
        </div>
        <div>
          <FieldLabel>Weekly hours</FieldLabel>
          <div className="space-y-1">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              return (
                <div key={key} className="flex items-center gap-2.5 py-2 border-b border-[#f0ede8] last:border-0">
                  <span className="text-xs font-semibold text-[#6b6b6b] w-8 flex-shrink-0">{label}</span>
                  <button
                    onClick={() => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, closed: !day.closed } } })}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0 font-semibold ${day.closed ? 'border-[#e5e2dc] text-[#9a9690] bg-white' : 'border-[#a8e063] text-[#2a6a00] bg-[#d4f5a0]'}`}
                  >
                    {day.closed ? 'Closed' : 'Open'}
                  </button>
                  {!day.closed && (
                    <div className="flex items-center gap-1.5">
                      <TimeSelect value={day.open}  onChange={v => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, open:v  } } })}/>
                      <span className="text-[#9a9690] text-xs">–</span>
                      <TimeSelect value={day.close} onChange={v => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, close:v } } })}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  if (block.id === 'menu') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto:v })} placeholder="Paste image URL…"/>
          {block.coverPhoto && <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover"/>}
        </div>
        <div>
          <FieldLabel>Menu type</FieldLabel>
          <div className="flex gap-2">
            {(['url','pdf','photos'] as const).map(t => (
              <button key={t} onClick={() => onUpdateBlock({ menuType:t })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${block.menuType === t ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e2dc] text-[#6b6b6b] bg-white hover:border-[#0a0a0a]'}`}
              >
                {t === 'url' ? 'Link' : t === 'pdf' ? 'PDF' : 'Photos'}
              </button>
            ))}
          </div>
        </div>
        {block.menuType === 'url' && <div><FieldLabel>Menu URL</FieldLabel><TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url:v })} placeholder="https://…"/></div>}
        <div><FieldLabel>Button label</FieldLabel><TextInput value={block.title} onChange={v => onUpdateBlock({ title:v })}/></div>
        <div><FieldLabel>Subtitle</FieldLabel><TextInput value={block.sub} onChange={v => onUpdateBlock({ sub:v })}/></div>
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  if (block.id === 'order') {
    return (
      <div className="space-y-5">
        <div><FieldLabel>Platform</FieldLabel><PillGrid options={ORDER_PROVIDERS} selected={block.sub} onSelect={v => onUpdateBlock({ sub:v })}/></div>
        <div><FieldLabel>Ordering URL</FieldLabel><TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url:v })} placeholder="https://…"/></div>
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  if (block.id === 'book') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto:v })} placeholder="Paste image URL…"/>
          {block.coverPhoto && <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover"/>}
        </div>
        <div><FieldLabel>Platform</FieldLabel><PillGrid options={BOOK_PROVIDERS} selected={block.sub} onSelect={v => onUpdateBlock({ sub:v })}/></div>
        <div><FieldLabel>Booking URL</FieldLabel><TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url:v })} placeholder="https://…"/></div>
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  if (block.id === 'socials') {
    return (
      <div className="space-y-4">
        <FieldLabel>Your social links</FieldLabel>
        {SOCIAL_PLATFORMS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex-shrink-0"><SocialIcon platform={key} size={28}/></div>
            <TextInput value={config.socials[key] ?? ''} onChange={v => onUpdateConfig({ socials: { ...config.socials, [key]:v } })} placeholder={`${label} URL…`}/>
          </div>
        ))}
        <ColorPicker block={block} onUpdate={onUpdateBlock}/>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {block.id === 'website' && (
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto:v })} placeholder="Paste image URL…"/>
          {block.coverPhoto && <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover"/>}
        </div>
      )}
      <div><FieldLabel>Button label</FieldLabel><TextInput value={block.title} onChange={v => onUpdateBlock({ title:v })}/></div>
      <div><FieldLabel>Subtitle</FieldLabel><TextInput value={block.sub} onChange={v => onUpdateBlock({ sub:v })}/></div>
      {block.id === 'website' && <div><FieldLabel>Website URL</FieldLabel><TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url:v })} placeholder="https://…"/></div>}
      <ColorPicker block={block} onUpdate={onUpdateBlock}/>
    </div>
  );
}

// ── mobile preview ─────────────────────────────────────────────────────────

function MobilePreview({ business, config }: { business: Business | null; config: OpenStatusPageConfig }) {
  const activeBlocks = config.blocks.filter(b => b.on);
  const darkBgs = ['#0a0a0a','#111827','#1a0a2e','#0a1628','#1c1c1c'];
  const isDark = darkBgs.includes(config.bg);
  const text = isDark ? 'text-white' : 'text-[#0a0a0a]';
  const sub  = isDark ? 'text-white/50' : 'text-[#6b6b6b]';
  const { status } = getLiveStatus(config.weeklyHours);

  return (
    <div className="w-[200px] rounded-[32px] overflow-hidden shadow-2xl border border-[#e5e2dc] flex-shrink-0" style={{ background: config.bg }}>
      <div className={`px-4 pt-3 pb-1 flex justify-between text-[8px] ${isDark ? 'text-white/30' : 'text-black/25'}`}>
        <span>9:41</span><span>●●●</span>
      </div>
      <div className="px-4 pt-2 pb-3 text-center">
        {business?.avatar_url
          ? <img src={business.avatar_url} className="w-10 h-10 rounded-full mx-auto mb-1.5 object-cover" alt=""/>
          : <div className={`w-10 h-10 rounded-full mx-auto mb-1.5 ${isDark ? 'bg-white/10' : 'bg-black/8'}`}/>
        }
        <p className={`font-semibold text-xs ${text}`}>{business?.name ?? 'Your Business'}</p>
        {config.location && <p className={`text-[8px] ${sub} truncate px-1 mt-0.5`}>{config.location}</p>}
        {(config.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1.5">
            {(config.tags ?? []).slice(0,3).map(t => (
              <span key={t} className={`text-[7px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/8 text-white/50' : 'bg-black/6 text-black/45'}`}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="px-2.5 pb-4 space-y-1.5">
        {activeBlocks.length === 0
          ? <p className={`text-center text-[9px] py-6 ${sub}`}>Enable blocks →</p>
          : activeBlocks.map(b => {
            const cardBg  = b.color ? `${b.color}18` : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)');
            const cardBdr = b.color ? `${b.color}40` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');
            if (b.id === 'location') return (
              <div key={b.id} className="rounded-xl overflow-hidden border" style={{ borderColor: cardBdr }}>
                <div className="h-[52px] flex items-center justify-center relative overflow-hidden" style={{ background:'linear-gradient(135deg,#1e3a5f,#111827)' }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,.15) 10px,rgba(255,255,255,.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,.15) 10px,rgba(255,255,255,.15) 11px)' }}/>
                  <IconPin size={16} color="white"/>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: cardBg }}>
                  <BlockIcon id={b.id} color={b.color} size={11}/>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-semibold ${text} leading-tight truncate`}>{b.title}</p>
                    {config.location && <p className={`text-[8px] ${sub} leading-tight truncate`}>{config.location}</p>}
                  </div>
                </div>
              </div>
            );
            if (b.id === 'hours') return (
              <div key={b.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 border" style={{ background: cardBg, borderColor: cardBdr }}>
                <BlockIcon id={b.id} color={b.color} size={11}/>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-semibold ${text} leading-tight`}>{status === 'open' ? 'Open now' : 'Closed'}</p>
                  <p className={`text-[8px] ${sub} leading-tight`}>Tap for full hours</p>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'open' ? 'bg-emerald-400' : 'bg-red-400'}`}/>
              </div>
            );
            if (b.coverPhoto) return (
              <div key={b.id} className="rounded-xl overflow-hidden border" style={{ borderColor: cardBdr }}>
                <img src={b.coverPhoto} className="w-full object-cover" style={{ height:48 }} alt=""/>
                <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: cardBg }}>
                  <BlockIcon id={b.id} color={b.color} size={11}/>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-semibold ${text} leading-tight truncate`}>{b.title}</p>
                    <p className={`text-[8px] ${sub} leading-tight truncate`}>{b.sub}</p>
                  </div>
                </div>
              </div>
            );
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 border" style={{ background: cardBg, borderColor: cardBdr }}>
                <BlockIcon id={b.id} color={b.color} size={11}/>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-semibold ${text} leading-tight truncate`}>{b.title}</p>
                  <p className={`text-[8px] ${sub} leading-tight truncate`}>{b.sub}</p>
                </div>
                <span className={`${isDark ? 'text-white/20' : 'text-black/20'} text-xs`}>›</span>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ── bottom sheet ───────────────────────────────────────────────────────────

function BottomSheet({ block, config, onUpdateBlock, onUpdateConfig, onClose }: {
  block: OpenStatusBlock; config: OpenStatusPageConfig;
  onUpdateBlock: (u: Partial<OpenStatusBlock>) => void;
  onUpdateConfig: (u: Partial<OpenStatusPageConfig>) => void;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = sheetRef.current;
    if (!s) return;
    requestAnimationFrame(() => { s.style.transform = 'translateY(0)'; });
  }, []);

  function close() {
    const s = sheetRef.current;
    if (s) { s.style.transform = 'translateY(100%)'; setTimeout(onClose, 280); }
    else onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40" onClick={close}/>
      <div
        ref={sheetRef}
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[28px] border-t border-[#e5e2dc] flex flex-col shadow-2xl"
        style={{ maxHeight:'85vh', transform:'translateY(100%)', transition:'transform 0.28s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-[#d0cbc2]"/>
        </div>
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-[#f0ede8] flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-[#e5e2dc]"
            style={{ background: block.color ? `${block.color}12` : '#f5f2ee' }}>
            <BlockIcon id={block.id} color={block.color} size={20}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[#0a0a0a] leading-tight">{block.title}</p>
            <p className="text-xs text-[#9a9690] leading-tight mt-0.5">{block.sub}</p>
          </div>
          <button onClick={close} className="w-8 h-8 rounded-full bg-[#f5f2ee] flex items-center justify-center text-[#6b6b6b] hover:bg-[#e5e2dc] transition-colors text-sm flex-shrink-0">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5 pb-10">
          <BlockSettings block={block} config={config} onUpdateBlock={onUpdateBlock} onUpdateConfig={onUpdateConfig}/>
        </div>
      </div>
    </>
  );
}

// ── main ───────────────────────────────────────────────────────────────────

export default function BuilderClient({ business, initialConfig }: {
  business: Business | null; initialConfig: OpenStatusPageConfig;
}) {
  const [config, setConfig] = useState<OpenStatusPageConfig>(
    initialConfig ?? normalizeOpenStatusPageConfig(undefined)
  );
  const [tab, setTab]       = useState<'blocks'|'style'|'preview'>('blocks');
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const blocks    = config.blocks;
  const openBlock = blocks.find(b => b.id === openId) ?? null;
  const { status: liveStatus, todayLabel } = getLiveStatus(config.weeklyHours);

  function updateBlock(id: string, updates: Partial<OpenStatusBlock>) {
    setConfig(c => ({ ...c, blocks: c.blocks.map(b => b.id === id ? { ...b, ...updates } : b) }));
  }

  function toggleBlock(id: string) {
    updateBlock(id, { on: !blocks.find(b => b.id === id)?.on });
  }

  async function save() {
    setSaving(true);
    try {
      await supabase.auth.updateUser({ data: { openstatus_page: config } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#ece8e1] text-[#0a0a0a] flex flex-col" style={{ fontFamily:"'Poppins', system-ui, sans-serif" }}>

      {/* header */}
      <header className="sticky top-0 z-30 bg-[#ece8e1]/95 backdrop-blur-md border-b border-[#d8d3cb]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[11px] font-bold">O</span>
            </div>
            <span className="font-semibold text-sm truncate">{business?.name ?? 'Your page'}</span>
          </div>
          <button onClick={save} disabled={saving}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all flex-shrink-0 ${
              saved  ? 'bg-[#d4f5a0] text-[#2a6a00]' :
              saving ? 'bg-[#d0cbc2] text-[#9a9690]' :
                       'bg-[#0a0a0a] text-white hover:bg-[#333]'
            }`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </header>

      {/* tab bar */}
      <div className="sticky top-14 z-30 bg-[#ece8e1]/95 backdrop-blur-md border-b border-[#d8d3cb]">
        <div className="max-w-lg mx-auto px-4 flex">
          {(['blocks','style','preview'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                tab === t ? 'text-[#0a0a0a] border-[#0a0a0a]' : 'text-[#9a9690] border-transparent hover:text-[#6b6b6b]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 max-w-lg mx-auto w-full">

        {/* BLOCKS TAB */}
        {tab === 'blocks' && (
          <div className="px-4 py-5">
            <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-4 font-semibold">Your page · tap to edit</p>
            <div className="space-y-2">
              {blocks.map(block => (
                <button key={block.id} onClick={() => setOpenId(block.id)}
                  className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 bg-white border border-[#e5e2dc] transition-all text-left hover:border-[#0a0a0a]/20 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-[#f0ede8]"
                    style={{ background: block.color ? `${block.color}12` : '#f5f2ee' }}>
                    <BlockIcon id={block.id} color={block.color} size={18}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#0a0a0a] leading-tight">{block.title}</p>
                      {block.id === 'hours' && (
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${liveStatus === 'open' ? 'bg-[#d4f5a0] text-[#2a6a00]' : 'bg-[#f0ede8] text-[#9a9690]'}`}>
                          ● {liveStatus === 'open' ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9a9690] leading-tight mt-0.5 truncate">
                      {block.id === 'hours' ? todayLabel : block.sub}
                    </p>
                  </div>
                  <Toggle on={block.on} onChange={() => toggleBlock(block.id)}/>
                </button>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-1 font-semibold">Features & vibe</p>
              <p className="text-[11px] text-[#b0ab9f] mb-3">Select all that apply — shown on your page</p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_TAGS.map(tag => {
                  const active = (config.tags ?? []).includes(tag);
                  return (
                    <button key={tag}
                      onClick={() => setConfig(c => ({
                        ...c,
                        tags: active ? (c.tags ?? []).filter(t => t !== tag) : [...(c.tags ?? []), tag],
                      }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        active ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                               : 'border-[#d8d3cb] text-[#6b6b6b] bg-white hover:border-[#0a0a0a] hover:text-[#0a0a0a]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {tab === 'style' && (
          <div className="px-4 py-5 space-y-8">
            <div>
              <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-1 font-semibold">Page background</p>
              <p className="text-[11px] text-[#b0ab9f] mb-4">Background of your public page</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {BG_PRESETS.map(color => (
                  <button key={color} onClick={() => setConfig(c => ({ ...c, bg: color }))}
                    className="aspect-square rounded-2xl border-2 transition-all hover:scale-105 shadow-sm"
                    style={{ background: color, borderColor: config.bg === color ? '#0a0a0a' : '#e5e2dc' }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-xl border border-[#e5e2dc] shadow-sm" style={{ background: config.bg }}/>
                <span className="text-xs text-[#9a9690]">{config.bg} · tap swatch to customize</span>
                <input type="color" value={config.bg} onChange={e => setConfig(c => ({ ...c, bg: e.target.value }))} className="opacity-0 absolute w-0 h-0"/>
              </label>
            </div>
            <div>
              <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-1 font-semibold">Social links</p>
              <p className="text-[11px] text-[#b0ab9f] mb-4">Add your profiles — they'll appear on your page</p>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8"><SocialIcon platform={key} size={28}/></div>
                    <TextInput value={config.socials[key] ?? ''} onChange={v => setConfig(c => ({ ...c, socials: { ...c.socials, [key]:v } }))} placeholder={`${label} URL…`}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {tab === 'preview' && (
          <div className="flex flex-col items-center py-10 px-4">
            <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-8 font-semibold">What your customers see</p>
            <MobilePreview business={business} config={config}/>
            <div className="mt-10 text-center">
              <p className="text-[10px] text-[#9a9690] uppercase tracking-widest mb-1 font-semibold">Your link</p>
              <p className="text-sm font-bold text-[#0a0a0a]">openstatus.co/{business?.slug ?? '…'}</p>
            </div>
          </div>
        )}

      </div>

      {/* bottom sheet */}
      {openBlock && (
        <BottomSheet
          block={openBlock} config={config}
          onUpdateBlock={u => updateBlock(openBlock.id, u)}
          onUpdateConfig={u => setConfig(c => ({ ...c, ...u }))}
          onClose={() => setOpenId(null)}
        />
      )}

    </div>
  );
}
