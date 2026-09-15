'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── types ──────────────────────────────────────────────────────────────────

type Tone = 'default' | 'muted' | 'accent';
type BlockSize = 'half' | 'full';
type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type WeeklyHours = Record<WeekDay, DayHours>;

interface OpenStatusBlock {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: Tone;
  url?: string;
  size?: BlockSize;
  color?: string;
  coverPhoto?: string;
  menuType?: 'url' | 'pdf' | 'photos';
  menuFile?: string;
}

interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[];
  bg: string;
  socials: Record<string, string>;
  location?: string;
  tags?: string[];
  weeklyHours?: WeeklyHours;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  description?: string;
  category?: string;
}

// ── constants ──────────────────────────────────────────────────────────────

const BG_PRESETS = [
  '#0a0a0a','#111827','#1a0a2e','#0a1628','#1a0a0a',
  '#ffffff','#f8f5f0','#fef9ef','#f0f4ff','#fff0f5',
];

const ORDER_PROVIDERS = ['DoorDash','Uber Eats','Grubhub','Square','Toast','Other'];
const BOOK_PROVIDERS  = ['Resy','OpenTable','Calendly','Square Appts','Acuity','Mindbody','Other'];
const SOCIAL_PLATFORMS = [
  { key: 'instagram', icon: '📸', label: 'Instagram' },
  { key: 'tiktok',    icon: '🎵', label: 'TikTok' },
  { key: 'facebook',  icon: '👥', label: 'Facebook' },
  { key: 'twitter',   icon: '🐦', label: 'Twitter / X' },
  { key: 'youtube',   icon: '▶️', label: 'YouTube' },
];

const FEATURE_TAGS = [
  // Service
  'Delivery','Takeout','Dine-in','Curbside pickup','Catering',
  // Amenities
  'Dog friendly','Kid friendly','Wheelchair accessible','Free WiFi',
  'Outdoor seating','Patio','Rooftop',
  // Food & drink
  'Vegan options','Vegetarian','Gluten-free','Halal','Kosher','Organic',
  // Vibe
  'LGBTQ+ friendly','Happy hour','Live music','Sports bar','Late night',
  // Payment
  'Cash only','Contactless pay',
  // Type
  'Restaurant','Café','Bar','Bakery','Coffee shop','Brewery',
  'Food truck','Non-profit','Retail','Salon','Spa','Gym','Pop-up','Market',
];

const DAYS: { key: WeekDay; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

const DEFAULT_WEEK_HOURS: WeeklyHours = {
  mon: { open: '09:00', close: '17:00', closed: false },
  tue: { open: '09:00', close: '17:00', closed: false },
  wed: { open: '09:00', close: '17:00', closed: false },
  thu: { open: '09:00', close: '17:00', closed: false },
  fri: { open: '09:00', close: '21:00', closed: false },
  sat: { open: '10:00', close: '21:00', closed: false },
  sun: { open: '10:00', close: '16:00', closed: false },
};

const BLOCK_ICONS: Record<string, string[]> = {
  location: ['📍','🗺️','🧭','🏠','📌'],
  hours:    ['🕐','⏰','🕰️','📅','⌚'],
  menu:     ['🍽️','🍴','📋','🥗','🍕'],
  order:    ['📦','🛵','🥡','🚚','🛍️'],
  book:     ['📅','🗓️','📖','✉️','🎫'],
  socials:  ['✨','💫','🌟','📱','🔗'],
  website:  ['🌐','💻','🔗','🖥️','📡'],
};

const BLOCK_COLORS = [
  '',         // default (no color)
  '#7c3aed',  // purple
  '#2563eb',  // blue
  '#059669',  // green
  '#d97706',  // amber
  '#dc2626',  // red
  '#db2777',  // pink
  '#0891b2',  // cyan
];

const DEFAULT_BLOCKS: OpenStatusBlock[] = [
  { id:'location', title:'Location & directions', sub:'Map + one-tap directions',     icon:'📍', on:true,  tone:'default' },
  { id:'hours',    title:'Hours & status',        sub:'Live open / closed status',     icon:'🕐', on:true,  tone:'default' },
  { id:'menu',     title:'Menu',                  sub:'Link, PDF, or photos',          icon:'🍽️', on:false, tone:'default', menuType:'url' },
  { id:'order',    title:'Online ordering',        sub:'DoorDash, Uber Eats & more',    icon:'📦', on:false, tone:'default' },
  { id:'book',     title:'Reservations & booking', sub:'OpenTable, Resy & more',       icon:'📅', on:false, tone:'default' },
  { id:'socials',  title:'Follow us',              sub:'Social media links',            icon:'✨', on:false, tone:'default' },
  { id:'website',  title:'Website',               sub:'Link to your site',             icon:'🌐', on:false, tone:'default' },
];

// ── hours helpers ──────────────────────────────────────────────────────────

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hr = h % 12 || 12;
  return m === 0 ? `${hr}${ampm}` : `${hr}:${m.toString().padStart(2, '0')}${ampm}`;
}

function getLiveStatus(hours?: WeeklyHours): { status: 'open' | 'closed'; todayLabel: string } {
  if (!hours) return { status: 'closed', todayLabel: 'Set your hours' };
  const dayKeys: WeekDay[] = ['sun','mon','tue','wed','thu','fri','sat'];
  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const today = hours[dayKey];
  if (today.closed) return { status: 'closed', todayLabel: 'Closed today' };
  const [oh, om] = today.open.split(':').map(Number);
  const [ch, cm] = today.close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  const todayLabel = `${fmt12(today.open)} – ${fmt12(today.close)}`;
  const status = nowMins >= openMins && nowMins < closeMins ? 'open' : 'closed';
  return { status, todayLabel };
}

// ── normalize config ───────────────────────────────────────────────────────

export function normalizeOpenStatusPageConfig(raw: unknown): OpenStatusPageConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const saved = Array.isArray(r.blocks) ? (r.blocks as OpenStatusBlock[]) : [];
  const blocks = DEFAULT_BLOCKS.map(def => {
    const found = saved.find(b => b.id === def.id);
    return found ? { ...def, ...found } : { ...def };
  });
  return {
    blocks,
    bg:           typeof r.bg === 'string' ? r.bg : '#0a0a0a',
    socials:      (r.socials && typeof r.socials === 'object') ? r.socials as Record<string,string> : {},
    location:     typeof r.location === 'string' ? r.location : undefined,
    tags:         Array.isArray(r.tags) ? r.tags as string[] : [],
    weeklyHours:  (r.weeklyHours && typeof r.weeklyHours === 'object')
                    ? r.weeklyHours as WeeklyHours
                    : { ...DEFAULT_WEEK_HOURS },
  };
}

// ── small components ───────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!on); }}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-white' : 'bg-white/15'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform shadow-sm ${on ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/50'}`} />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-white/35 uppercase tracking-widest mb-2">{children}</p>;
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/6 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
    />
  );
}

function PillGrid({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onSelect(opt)}
          className={`py-2.5 rounded-xl text-xs font-medium border transition-colors ${selected === opt ? 'bg-white text-black border-white' : 'border-white/12 text-white/50 hover:border-white/25 hover:text-white/75'}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white/6 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
    >
      {times.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
    </select>
  );
}

// ── places hook ────────────────────────────────────────────────────────────

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

// ── icon + color picker (shared across blocks) ─────────────────────────────

function IconColorPicker({
  block, onUpdate,
}: {
  block: OpenStatusBlock;
  onUpdate: (u: Partial<OpenStatusBlock>) => void;
}) {
  const icons = BLOCK_ICONS[block.id] ?? [];
  return (
    <div className="space-y-4 pt-5 border-t border-white/8 mt-5">
      {icons.length > 0 && (
        <div>
          <FieldLabel>Icon</FieldLabel>
          <div className="flex gap-2">
            {icons.map(em => (
              <button key={em} onClick={() => onUpdate({ icon: em })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ${block.icon === em ? 'border-white bg-white/15 scale-110' : 'border-white/10 hover:border-white/25'}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <FieldLabel>Block accent color</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {BLOCK_COLORS.map((c, i) => (
            <button key={i} onClick={() => onUpdate({ color: c })}
              className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center ${(block.color ?? '') === c ? 'border-white scale-110' : 'border-transparent hover:border-white/30'}`}
              style={{ background: c || 'rgba(255,255,255,0.08)' }}
            >
              {!c && <span className="text-[10px] text-white/30 font-bold">✕</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── block settings ─────────────────────────────────────────────────────────

function BlockSettings({
  block, config, onUpdateBlock, onUpdateConfig,
}: {
  block: OpenStatusBlock;
  config: OpenStatusPageConfig;
  onUpdateBlock: (u: Partial<OpenStatusBlock>) => void;
  onUpdateConfig: (u: Partial<OpenStatusPageConfig>) => void;
}) {
  const [locQuery, setLocQuery] = useState(config.location ?? '');
  const [places, clearPlaces] = usePlaces(locQuery);

  // ── LOCATION ──
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
            <div className="mt-2 bg-[#1c1c1c] border border-white/10 rounded-2xl overflow-hidden">
              {places.map(p => (
                <button key={p.place_id}
                  onClick={() => { setLocQuery(p.description); onUpdateConfig({ location: p.description }); clearPlaces(); }}
                  className="w-full text-left px-4 py-3 text-sm text-white/75 hover:bg-white/6 border-b border-white/5 last:border-0 flex items-center gap-2"
                >
                  <span className="text-base flex-shrink-0">📍</span>
                  <span className="truncate">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {mapSrc ? (
          <div>
            <FieldLabel>Map preview</FieldLabel>
            <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 180 }}>
              <iframe
                src={mapSrc}
                className="w-full h-full"
                style={{ border: 0, filter: 'saturate(0.8) brightness(0.9)' }}
                loading="lazy"
                title="Location map"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] h-28 flex items-center justify-center">
            <p className="text-[11px] text-white/25">Map preview will appear here</p>
          </div>
        )}
        <div>
          <FieldLabel>Button label</FieldLabel>
          <TextInput value={block.title} onChange={v => onUpdateBlock({ title: v })} />
        </div>
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── HOURS ──
  if (block.id === 'hours') {
    const hours = config.weeklyHours ?? DEFAULT_WEEK_HOURS;
    const { status, todayLabel } = getLiveStatus(hours);
    return (
      <div className="space-y-5">
        {/* live status pill */}
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${status === 'open' ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-white/10 bg-white/[0.03]'}`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${status === 'open' ? 'bg-emerald-400' : 'bg-white/30'}`} />
          <div>
            <p className="text-sm font-semibold text-white">{status === 'open' ? 'Open now' : 'Closed right now'}</p>
            <p className="text-xs text-white/45 mt-0.5">{todayLabel}</p>
          </div>
        </div>

        {/* weekly schedule */}
        <div>
          <FieldLabel>Weekly hours</FieldLabel>
          <div className="space-y-1">
            {DAYS.map(({ key, label }) => {
              const day = hours[key];
              return (
                <div key={key} className="flex items-center gap-2.5 py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-medium text-white/50 w-8 flex-shrink-0">{label}</span>
                  <button
                    onClick={() => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, closed: !day.closed } } })}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0 font-medium ${
                      day.closed
                        ? 'border-white/20 text-white/35 bg-white/4'
                        : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/8'
                    }`}
                  >
                    {day.closed ? 'Closed' : 'Open'}
                  </button>
                  {!day.closed && (
                    <div className="flex items-center gap-1.5">
                      <TimeSelect value={day.open}  onChange={v => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, open:  v } } })} />
                      <span className="text-white/25 text-xs">–</span>
                      <TimeSelect value={day.close} onChange={v => onUpdateConfig({ weeklyHours: { ...hours, [key]: { ...day, close: v } } })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── MENU ──
  if (block.id === 'menu') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto: v })} placeholder="Paste image URL…" />
          {block.coverPhoto && (
            <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover preview" />
          )}
        </div>
        <div>
          <FieldLabel>Menu type</FieldLabel>
          <div className="flex gap-2">
            {(['url','pdf','photos'] as const).map(t => (
              <button key={t} onClick={() => onUpdateBlock({ menuType: t })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${block.menuType === t ? 'bg-white text-black border-white' : 'border-white/12 text-white/50 hover:border-white/25'}`}
              >
                {t === 'url' ? '🔗 Link' : t === 'pdf' ? '📄 PDF' : '📷 Photos'}
              </button>
            ))}
          </div>
        </div>
        {block.menuType === 'url' && (
          <div>
            <FieldLabel>Menu URL</FieldLabel>
            <TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url: v })} placeholder="https://…" />
          </div>
        )}
        <div>
          <FieldLabel>Button label</FieldLabel>
          <TextInput value={block.title} onChange={v => onUpdateBlock({ title: v })} />
        </div>
        <div>
          <FieldLabel>Subtitle</FieldLabel>
          <TextInput value={block.sub} onChange={v => onUpdateBlock({ sub: v })} />
        </div>
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── ORDER ──
  if (block.id === 'order') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Platform</FieldLabel>
          <PillGrid options={ORDER_PROVIDERS} selected={block.sub} onSelect={v => onUpdateBlock({ sub: v })} />
        </div>
        <div>
          <FieldLabel>Ordering URL</FieldLabel>
          <TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url: v })} placeholder="https://…" />
        </div>
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── BOOK ──
  if (block.id === 'book') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto: v })} placeholder="Paste image URL…" />
          {block.coverPhoto && (
            <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover preview" />
          )}
        </div>
        <div>
          <FieldLabel>Platform</FieldLabel>
          <PillGrid options={BOOK_PROVIDERS} selected={block.sub} onSelect={v => onUpdateBlock({ sub: v })} />
        </div>
        <div>
          <FieldLabel>Booking URL</FieldLabel>
          <TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url: v })} placeholder="https://…" />
        </div>
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── SOCIALS ──
  if (block.id === 'socials') {
    return (
      <div className="space-y-4">
        <FieldLabel>Your social links</FieldLabel>
        {SOCIAL_PLATFORMS.map(({ key, icon, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
            <TextInput
              value={config.socials[key] ?? ''}
              onChange={v => onUpdateConfig({ socials: { ...config.socials, [key]: v } })}
              placeholder={`${label} URL…`}
            />
          </div>
        ))}
        <IconColorPicker block={block} onUpdate={onUpdateBlock} />
      </div>
    );
  }

  // ── GENERIC (website + fallback) ──
  return (
    <div className="space-y-5">
      {block.id === 'website' && (
        <div>
          <FieldLabel>Cover photo</FieldLabel>
          <TextInput value={block.coverPhoto ?? ''} onChange={v => onUpdateBlock({ coverPhoto: v })} placeholder="Paste image URL…" />
          {block.coverPhoto && (
            <img src={block.coverPhoto} className="mt-2 w-full h-24 object-cover rounded-xl" alt="cover preview" />
          )}
        </div>
      )}
      <div>
        <FieldLabel>Button label</FieldLabel>
        <TextInput value={block.title} onChange={v => onUpdateBlock({ title: v })} />
      </div>
      <div>
        <FieldLabel>Subtitle</FieldLabel>
        <TextInput value={block.sub} onChange={v => onUpdateBlock({ sub: v })} />
      </div>
      {block.id === 'website' && (
        <div>
          <FieldLabel>Website URL</FieldLabel>
          <TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url: v })} placeholder="https://…" />
        </div>
      )}
      <IconColorPicker block={block} onUpdate={onUpdateBlock} />
    </div>
  );
}

// ── mobile preview ─────────────────────────────────────────────────────────

function MobilePreview({ business, config }: { business: Business | null; config: OpenStatusPageConfig }) {
  const activeBlocks = config.blocks.filter(b => b.on);
  const lightBgs = ['#ffffff','#f8f5f0','#fef9ef','#f0f4ff','#fff0f5'];
  const isLight = lightBgs.includes(config.bg);
  const text = isLight ? 'text-neutral-800' : 'text-white';
  const sub  = isLight ? 'text-neutral-500' : 'text-white/50';
  const { status } = getLiveStatus(config.weeklyHours);

  return (
    <div
      className="w-[200px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex-shrink-0"
      style={{ background: config.bg }}
    >
      <div className={`px-4 pt-3 pb-1 flex justify-between text-[8px] ${isLight ? 'text-black/25' : 'text-white/30'}`}>
        <span>9:41</span><span>●●●</span>
      </div>
      <div className="px-4 pt-2 pb-3 text-center">
        {business?.avatar_url
          ? <img src={business.avatar_url} className="w-10 h-10 rounded-full mx-auto mb-1.5 object-cover" alt="" />
          : <div className={`w-10 h-10 rounded-full mx-auto mb-1.5 ${isLight ? 'bg-black/8' : 'bg-white/10'}`} />
        }
        <p className={`font-semibold text-xs ${text}`}>{business?.name ?? 'Your Business'}</p>
        {config.location && <p className={`text-[8px] ${sub} truncate px-1 mt-0.5`}>{config.location}</p>}
        {(config.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1.5">
            {(config.tags ?? []).slice(0, 3).map(t => (
              <span key={t} className={`text-[7px] px-1.5 py-0.5 rounded-full ${isLight ? 'bg-black/6 text-black/45' : 'bg-white/8 text-white/50'}`}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="px-2.5 pb-4 space-y-1.5">
        {activeBlocks.length === 0
          ? <p className={`text-center text-[9px] py-6 ${sub}`}>Enable blocks →</p>
          : activeBlocks.map(b => {
            const cardBg  = b.color ? `${b.color}20` : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)');
            const cardBdr = b.color ? `${b.color}50` : (isLight ? 'rgba(0,0,0,0.1)'  : 'rgba(255,255,255,0.1)');

            // map card for location block
            if (b.id === 'location') {
              return (
                <div key={b.id} className="rounded-xl overflow-hidden border" style={{ borderColor: cardBdr }}>
                  <div className="h-[55px] flex items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1a2a48 50%,#111827 100%)' }}>
                    {/* stylized map grid */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,.15) 10px,rgba(255,255,255,.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,.15) 10px,rgba(255,255,255,.15) 11px)' }} />
                    <span className="text-lg relative z-10 drop-shadow">📍</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: cardBg }}>
                    <span className="text-xs">{b.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-medium ${text} leading-tight truncate`}>{b.title}</p>
                      {config.location && <p className={`text-[8px] ${sub} leading-tight truncate`}>{config.location}</p>}
                    </div>
                  </div>
                </div>
              );
            }

            // hours with live status dot
            if (b.id === 'hours') {
              return (
                <div key={b.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 border" style={{ background: cardBg, borderColor: cardBdr }}>
                  <span className="text-sm">{b.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-medium ${text} leading-tight`}>{status === 'open' ? 'Open now' : 'Closed'}</p>
                    <p className={`text-[8px] ${sub} leading-tight`}>Tap for full hours</p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'open' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </div>
              );
            }

            // cover photo blocks
            if (b.coverPhoto) {
              return (
                <div key={b.id} className="rounded-xl overflow-hidden border" style={{ borderColor: cardBdr }}>
                  <img src={b.coverPhoto} className="w-full object-cover" style={{ height: 50 }} alt="" />
                  <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: cardBg }}>
                    <span className="text-xs">{b.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-medium ${text} leading-tight truncate`}>{b.title}</p>
                      <p className={`text-[8px] ${sub} leading-tight truncate`}>{b.sub}</p>
                    </div>
                  </div>
                </div>
              );
            }

            // default block
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-xl px-2.5 py-2 border" style={{ background: cardBg, borderColor: cardBdr }}>
                <span className="text-sm">{b.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[10px] font-medium ${text} leading-tight truncate`}>{b.title}</p>
                  <p className={`text-[8px] ${sub} leading-tight truncate`}>{b.sub}</p>
                </div>
                <span className={`${isLight ? 'text-black/20' : 'text-white/20'} text-xs`}>›</span>
              </div>
            );
          })
        }
      </div>
    </div>
  );
}

// ── bottom sheet ───────────────────────────────────────────────────────────

function BottomSheet({
  block, config, onUpdateBlock, onUpdateConfig, onClose,
}: {
  block: OpenStatusBlock;
  config: OpenStatusPageConfig;
  onUpdateBlock: (u: Partial<OpenStatusBlock>) => void;
  onUpdateConfig: (u: Partial<OpenStatusPageConfig>) => void;
  onClose: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });
  }, []);

  function close() {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(onClose, 280);
    } else {
      onClose();
    }
  }

  const accentBg  = block.color ? `${block.color}25` : 'rgba(255,255,255,0.08)';
  const accentBdr = block.color ? `${block.color}50` : 'rgba(255,255,255,0.1)';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={close} />
      <div
        ref={sheetRef}
        className="fixed bottom-0 inset-x-0 z-50 bg-[#141414] rounded-t-[28px] border-t border-white/10 flex flex-col"
        style={{ maxHeight: '82vh', transform: 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-white/20" />
        </div>
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-white/8 flex-shrink-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 border"
            style={{ background: accentBg, borderColor: accentBdr }}
          >
            {block.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{block.title}</p>
            <p className="text-xs text-white/40 leading-tight mt-0.5">{block.sub}</p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50 hover:bg-white/12 hover:text-white transition-colors text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5 pb-10">
          <BlockSettings
            block={block}
            config={config}
            onUpdateBlock={onUpdateBlock}
            onUpdateConfig={onUpdateConfig}
          />
        </div>
      </div>
    </>
  );
}

// ── main export ────────────────────────────────────────────────────────────

export default function BuilderClient({
  business,
  initialConfig,
}: {
  business: Business | null;
  initialConfig: OpenStatusPageConfig;
}) {
  const [config, setConfig] = useState<OpenStatusPageConfig>(initialConfig);
  const [tab, setTab]       = useState<'blocks' | 'style' | 'preview'>('blocks');
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const supabase = createClient();

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">

      {/* ── header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/96 backdrop-blur-md border-b border-white/8">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {business?.avatar_url
              ? <img src={business.avatar_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
              : <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0" />
            }
            <span className="font-semibold text-sm truncate">{business?.name ?? 'Your page'}</span>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
              saved  ? 'bg-emerald-500 text-white' :
              saving ? 'bg-white/20 text-white/40' :
                       'bg-white text-black hover:bg-white/90'
            }`}
          >
            {saving ? '…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── tab bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-14 z-30 bg-[#0a0a0a]/96 backdrop-blur-md border-b border-white/8">
        <div className="max-w-lg mx-auto px-4 flex">
          {(['blocks','style','preview'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'text-white border-white' : 'text-white/35 border-transparent hover:text-white/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── content ───────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-lg mx-auto w-full">

        {/* BLOCKS TAB */}
        {tab === 'blocks' && (
          <div className="px-4 py-5">
            <p className="text-[11px] text-white/30 mb-4 tracking-wide">Tap a block to edit · toggle to show or hide</p>

            <div className="space-y-2.5">
              {blocks.map(block => {
                const accentBg  = block.color ? `${block.color}12` : 'rgba(255,255,255,0.04)';
                const accentBdr = block.color ? `${block.color}35` : 'rgba(255,255,255,0.08)';
                const iconBg    = block.color ? `${block.color}30` : 'rgba(255,255,255,0.08)';
                return (
                  <button key={block.id} onClick={() => setOpenId(block.id)}
                    className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-colors text-left hover:brightness-110 active:scale-[0.99] border"
                    style={{ background: accentBg, borderColor: accentBdr }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: iconBg }}>
                      {block.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm leading-tight">{block.title}</p>
                        {/* live status badge on hours block */}
                        {block.id === 'hours' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${liveStatus === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/12 text-red-400'}`}>
                            {liveStatus === 'open' ? '● Open' : '● Closed'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 leading-tight mt-0.5 truncate">
                        {block.id === 'hours' ? todayLabel : block.sub}
                      </p>
                    </div>
                    <Toggle on={block.on} onChange={() => toggleBlock(block.id)} />
                  </button>
                );
              })}
            </div>

            {/* features & vibe tags */}
            <div className="mt-8">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Features & vibe</p>
              <p className="text-[11px] text-white/20 mb-3">Select all that apply — these show on your page</p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_TAGS.map(tag => {
                  const active = (config.tags ?? []).includes(tag);
                  return (
                    <button key={tag}
                      onClick={() => setConfig(c => ({
                        ...c,
                        tags: active
                          ? (c.tags ?? []).filter(t => t !== tag)
                          : [...(c.tags ?? []), tag],
                      }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'border-white/12 text-white/45 hover:border-white/25 hover:text-white/70'
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
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Page background</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {BG_PRESETS.map(color => (
                  <button key={color} onClick={() => setConfig(c => ({ ...c, bg: color }))}
                    className="aspect-square rounded-2xl border-2 transition-all hover:scale-105"
                    style={{ background: color, borderColor: config.bg === color ? 'white' : 'rgba(255,255,255,0.08)' }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-2xl border border-white/15" style={{ background: config.bg }} />
                <span className="text-sm text-white/40 hover:text-white/60 transition-colors">
                  {config.bg} · tap to pick custom
                </span>
                <input type="color" value={config.bg}
                  onChange={e => setConfig(c => ({ ...c, bg: e.target.value }))}
                  className="opacity-0 absolute w-0 h-0"
                />
              </label>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Social links</p>
              <div className="space-y-3">
                {SOCIAL_PLATFORMS.map(({ key, icon, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center flex-shrink-0">{icon}</span>
                    <TextInput
                      value={config.socials[key] ?? ''}
                      onChange={v => setConfig(c => ({ ...c, socials: { ...c.socials, [key]: v } }))}
                      placeholder={`${label} URL…`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PREVIEW TAB */}
        {tab === 'preview' && (
          <div className="flex flex-col items-center py-10 px-4">
            <p className="text-[11px] text-white/30 tracking-wide mb-8">What your customers see</p>
            <MobilePreview business={business} config={config} />
            <div className="mt-10 text-center space-y-1">
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Your link</p>
              <p className="text-sm font-mono text-white/55">openstatus.co/{business?.slug ?? '…'}</p>
            </div>
          </div>
        )}

      </div>

      {/* ── bottom sheet ──────────────────────────────────────────────────── */}
      {openBlock && (
        <BottomSheet
          block={openBlock}
          config={config}
          onUpdateBlock={u => updateBlock(openBlock.id, u)}
          onUpdateConfig={u => setConfig(c => ({ ...c, ...u }))}
          onClose={() => setOpenId(null)}
        />
      )}

    </div>
  );
}
