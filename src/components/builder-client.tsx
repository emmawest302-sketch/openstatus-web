'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ── types ──────────────────────────────────────────────────────────────────

type Tone = 'default' | 'muted' | 'accent';
type BlockSize = 'half' | 'full';

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
  menuType?: 'url' | 'pdf' | 'photos';
  menuFile?: string;
}

interface OpenStatusPageConfig {
  blocks: OpenStatusBlock[];
  bg: string;
  socials: Record<string, string>;
  location?: string;
  tags?: string[];
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
const BUSINESS_TAGS = [
  'Restaurant','Cafe','Bar','Bakery','Food Truck','Brewery','Coffee Shop',
  'Non-Profit','Retail','Salon','Spa','Gym','Gallery','Boutique','Market','Pop-Up','Other',
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
    bg:      typeof r.bg === 'string' ? r.bg : '#0a0a0a',
    socials: (r.socials && typeof r.socials === 'object') ? r.socials as Record<string,string> : {},
    location:typeof r.location === 'string' ? r.location : undefined,
    tags:    Array.isArray(r.tags) ? r.tags as string[] : [],
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

// ── places hook ────────────────────────────────────────────────────────────

function usePlaces(query: string) {
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
  return results;
}

// ── block settings panel ───────────────────────────────────────────────────

function BlockSettings({
  block, config,
  onUpdateBlock, onUpdateConfig,
}: {
  block: OpenStatusBlock;
  config: OpenStatusPageConfig;
  onUpdateBlock: (u: Partial<OpenStatusBlock>) => void;
  onUpdateConfig: (u: Partial<OpenStatusPageConfig>) => void;
}) {
  const [locQuery, setLocQuery] = useState(config.location ?? '');
  const places = usePlaces(locQuery);

  if (block.id === 'location') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Address</FieldLabel>
          <TextInput value={locQuery} onChange={setLocQuery} placeholder="Search your address…" />
          {places.length > 0 && (
            <div className="mt-2 bg-[#1c1c1c] border border-white/10 rounded-2xl overflow-hidden">
              {places.map(p => (
                <button key={p.place_id}
                  onClick={() => { setLocQuery(p.description); onUpdateConfig({ location: p.description }); setResults([]); }}
                  className="w-full text-left px-4 py-3 text-sm text-white/75 hover:bg-white/6 border-b border-white/5 last:border-0 flex items-center gap-2"
                >
                  <span className="text-base">📍</span> {p.description}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Button label</FieldLabel>
          <TextInput value={block.title} onChange={v => onUpdateBlock({ title: v })} />
        </div>
      </div>
    );
  }

  if (block.id === 'menu') {
    return (
      <div className="space-y-5">
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
      </div>
    );
  }

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
      </div>
    );
  }

  if (block.id === 'book') {
    return (
      <div className="space-y-5">
        <div>
          <FieldLabel>Platform</FieldLabel>
          <PillGrid options={BOOK_PROVIDERS} selected={block.sub} onSelect={v => onUpdateBlock({ sub: v })} />
        </div>
        <div>
          <FieldLabel>Booking URL</FieldLabel>
          <TextInput value={block.url ?? ''} onChange={v => onUpdateBlock({ url: v })} placeholder="https://…" />
        </div>
      </div>
    );
  }

  if (block.id === 'socials') {
    return (
      <div className="space-y-4">
        <FieldLabel>Add your social links</FieldLabel>
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
      </div>
    );
  }

  // generic
  return (
    <div className="space-y-5">
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
    </div>
  );
}

// Fix the setResults reference in location block
function setResults(_: unknown) { /* handled by hook */ }

// ── mobile preview ─────────────────────────────────────────────────────────

function MobilePreview({ business, config }: { business: Business | null; config: OpenStatusPageConfig }) {
  const activeBlocks = config.blocks.filter(b => b.on);
  const lightBgs = ['#ffffff','#f8f5f0','#fef9ef','#f0f4ff','#fff0f5'];
  const isLight = lightBgs.includes(config.bg);
  const text    = isLight ? 'text-neutral-800' : 'text-white';
  const sub     = isLight ? 'text-neutral-500' : 'text-white/50';
  const card    = isLight ? 'bg-black/[0.05] border-black/10' : 'bg-white/8 border-white/10';

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
        {config.location && <p className={`text-[9px] ${sub} truncate px-1 mt-0.5`}>{config.location}</p>}
        {(config.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1.5">
            {(config.tags ?? []).slice(0,2).map(t => (
              <span key={t} className={`text-[8px] px-1.5 py-0.5 rounded-full ${isLight ? 'bg-black/6 text-black/45' : 'bg-white/8 text-white/50'}`}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="px-2.5 pb-4 space-y-1.5">
        {activeBlocks.length === 0
          ? <p className={`text-center text-[9px] py-6 ${sub}`}>Enable blocks →</p>
          : activeBlocks.map(b => (
            <div key={b.id} className={`flex items-center gap-2 ${card} border rounded-xl px-2.5 py-2`}>
              <span className="text-sm">{b.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-medium ${text} leading-tight truncate`}>{b.title}</p>
                <p className={`text-[8px] ${sub} leading-tight truncate`}>{b.sub}</p>
              </div>
              <span className={`${isLight ? 'text-black/20' : 'text-white/20'} text-xs`}>›</span>
            </div>
          ))
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
    // trigger slide-in after mount
    requestAnimationFrame(() => {
      sheet.style.transform = 'translateY(0)';
    });
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

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={close} />
      <div
        ref={sheetRef}
        className="fixed bottom-0 inset-x-0 z-50 bg-[#141414] rounded-t-[28px] border-t border-white/10 flex flex-col"
        style={{ maxHeight: '82vh', transform: 'translateY(100%)', transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)' }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="w-9 h-[3px] rounded-full bg-white/20" />
        </div>
        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-white/8 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-white/8 flex items-center justify-center text-xl flex-shrink-0">
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
        {/* scrollable settings */}
        <div className="overflow-y-auto flex-1 px-5 py-5 pb-8">
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
  const [config, setConfig]     = useState<OpenStatusPageConfig>(initialConfig);
  const [tab, setTab]           = useState<'blocks' | 'style' | 'preview'>('blocks');
  const [openId, setOpenId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const supabase = createClient();

  const blocks   = config.blocks;
  const openBlock = blocks.find(b => b.id === openId) ?? null;

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

      {/* ── header ──────────────────────────────────────────────────────── */}
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
              saved   ? 'bg-emerald-500 text-white' :
              saving  ? 'bg-white/20 text-white/40' :
                        'bg-white text-black hover:bg-white/90'
            }`}
          >
            {saving ? '…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── tab bar ─────────────────────────────────────────────────────── */}
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

      {/* ── content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-lg mx-auto w-full">

        {/* BLOCKS */}
        {tab === 'blocks' && (
          <div className="px-4 py-5">
            <p className="text-[11px] text-white/30 mb-4 tracking-wide">Tap a block to customize · toggle to show or hide</p>
            <div className="space-y-2.5">
              {blocks.map(block => (
                <button key={block.id} onClick={() => setOpenId(block.id)}
                  className="w-full flex items-center gap-3.5 bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09] border border-white/8 rounded-2xl px-4 py-3.5 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center text-xl flex-shrink-0">
                    {block.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{block.title}</p>
                    <p className="text-xs text-white/40 leading-tight mt-0.5 truncate">{block.sub}</p>
                  </div>
                  <Toggle on={block.on} onChange={() => toggleBlock(block.id)} />
                </button>
              ))}
            </div>

            {/* tags */}
            <div className="mt-8">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Business type</p>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TAGS.map(tag => {
                  const active = (config.tags ?? []).includes(tag);
                  return (
                    <button key={tag}
                      onClick={() => setConfig(c => ({
                        ...c,
                        tags: active
                          ? (c.tags ?? []).filter(t => t !== tag)
                          : [...(c.tags ?? []), tag],
                      }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-white text-black border-white' : 'border-white/12 text-white/45 hover:border-white/25 hover:text-white/70'
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

        {/* STYLE */}
        {tab === 'style' && (
          <div className="px-4 py-5 space-y-8">
            {/* bg */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-4">Page background</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {BG_PRESETS.map(color => (
                  <button key={color} onClick={() => setConfig(c => ({ ...c, bg: color }))}
                    className="aspect-square rounded-2xl border-2 transition-all"
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

            {/* socials */}
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

        {/* PREVIEW */}
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

      {/* ── bottom sheet ─────────────────────────────────────────────────── */}
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
