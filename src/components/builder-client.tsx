'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BusinessBrandAssets from '@/components/business-brand-assets';
import SocialLinksEditor from '@/components/social-links-editor';
import {
  defaultOpenStatusBlocks,
  normalizeOpenStatusPageConfig,
  type OpenStatusBlock,
  type OpenStatusPageConfig,
  type OpenStatusSocial,
} from '@/lib/openstatus-page-config';

// ─── Types ────────────────────────────────────────────────────────────────────

type Business = {
  id: string;
  name: string;
  tagline: string | null;
  slug: string | null;
  avatar_url: string | null;
  header_url: string | null;
};

type PlacePrediction = { description: string; place_id: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOK_PROVIDERS = [
  { id: 'resy',         label: 'Resy',               icon: '🍽️',  color: '#e23b3b' },
  { id: 'opentable',   label: 'OpenTable',            icon: '🍴',  color: '#da3743' },
  { id: 'calendly',    label: 'Calendly',             icon: '📅',  color: '#006bff' },
  { id: 'square-appt', label: 'Square Appts',         icon: '⬛',  color: '#000000' },
  { id: 'acuity',      label: 'Acuity Scheduling',    icon: '🗓️', color: '#415fff' },
  { id: 'mindbody',    label: 'Mindbody',             icon: '🧘',  color: '#00b5d4' },
  { id: 'other',       label: 'Other',                icon: '🔗',  color: '#6b7280' },
];

const ORDER_PROVIDERS = [
  { id: 'doordash',  label: 'DoorDash',  icon: '🚗', color: '#ff3008' },
  { id: 'ubereats',  label: 'Uber Eats', icon: '🛵', color: '#06c167' },
  { id: 'grubhub',   label: 'Grubhub',  icon: '🛺', color: '#f63440' },
  { id: 'square',    label: 'Square',   icon: '⬛', color: '#000000' },
  { id: 'toast',     label: 'Toast',    icon: '🍞', color: '#ff4c00' },
  { id: 'other',     label: 'Other',    icon: '🔗', color: '#6b7280' },
];

const BUSINESS_TAGS = [
  'Restaurant', 'Cafe', 'Bar', 'Bakery', 'Food Truck', 'Brewery',
  'Coffee Shop', 'Non-Profit', 'Retail', 'Salon', 'Spa', 'Gym',
  'Gallery', 'Boutique', 'Market', 'Pop-Up', 'Other',
];

const BLOCK_META: Record<string, { label: string; icon: string; description: string }> = {
  order:   { label: 'Order',      icon: '🛒', description: 'Online ordering link' },
  menu:    { label: 'Menu',       icon: '📋', description: 'Menu link, photo, or PDF' },
  map:     { label: 'Map',        icon: '📍', description: 'Directions & map widget' },
  book:    { label: 'Book',       icon: '📅', description: 'Reservations & bookings' },
  website: { label: 'Website',    icon: '🌐', description: 'External website link' },
};

// ─── Google Places autocomplete ───────────────────────────────────────────────

function usePlaces(query: string) {
  const [preds, setPreds] = useState<PlacePrediction[]>([]);
  useEffect(() => {
    if (!query || query.length < 3) { setPreds([]); return; }
    const ctrl = new AbortController();
    fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.predictions)) setPreds(d.predictions.slice(0, 5)); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [query]);
  return preds;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hex, setHex] = useState(value || '#1a1a2e');
  useEffect(() => { setHex(value || '#1a1a2e'); }, [value]);
  const handleHex = (v: string) => {
    setHex(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={e => { setHex(e.target.value); onChange(e.target.value); }}
        className="w-9 h-9 rounded-lg cursor-pointer border-0 bg-transparent p-0"
        style={{ appearance: 'none' }}
      />
      <input
        type="text"
        value={hex}
        onChange={e => handleHex(e.target.value)}
        placeholder="#1a1a2e"
        maxLength={7}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30"
      />
    </div>
  );
}

function SizeToggle({ value, onChange }: { value?: 'half' | 'full'; onChange: (v: 'half' | 'full') => void }) {
  const v = value || 'full';
  return (
    <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
      {(['full', 'half'] as const).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
            v === s ? 'bg-white text-black' : 'text-white/50 hover:text-white'
          }`}
        >
          {s === 'half' ? '½ Width' : 'Full Width'}
        </button>
      ))}
    </div>
  );
}

// ─── Block Settings Panels ────────────────────────────────────────────────────

function OrderSettings({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (b: Partial<OpenStatusBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Quick Pick</label>
        <div className="grid grid-cols-2 gap-2">
          {ORDER_PROVIDERS.map(p => (
            <button
              key={p.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white text-left transition-all"
            >
              <span>{p.icon}</span>
              <span className="truncate text-xs">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Order URL</label>
        <input
          type="url"
          value={block.url || ''}
          onChange={e => onUpdate({ url: e.target.value })}
          placeholder="https://order.toasttab.com/…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Size</label>
        <SizeToggle value={block.size} onChange={s => onUpdate({ size: s })} />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Color</label>
        <ColorPicker value={block.color || '#1a1a2e'} onChange={c => onUpdate({ color: c })} />
      </div>
    </div>
  );
}

function MenuSettings({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (b: Partial<OpenStatusBlock>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const menuType = block.mentType || 'url';

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `menus/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('assets').upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from('assets').getPublicUrl(path);
      onUpdate({ menuFile: data.publicUrl, url: data.publicUrl });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Menu Type</label>
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
          {(['url', 'photo', 'pdf'] as const).map(t => (
            <button
              key={t}
              onClick={() => onUpdate({ menuType: t, url: '', menuFile: '' })}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                menuType === t ? 'bg-white text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {t === 'url' ? '🔗 Link' : t === 'photo' ? '📷 Photo' : '📄 PDF'}
            </button>
          ))}
        </div>
      </div>

      {menuType === 'url' && (
        <div>
          <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Menu URL</label>
          <input
            type="url"
            value={block.url || ''}
            onChange={e => onUpdate({ url: e.target.value })}
            placeholder="https://yourmenu.com"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      )}

      {(menuType === 'photo' || menuType === 'pdf') && (
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-white/20 rounded-xl text-white/40 hover:text-white/60 hover:border-white/30 transition-all flex flex-col items-center gap-2 text-sm"
          >
            <span className="text-2xl">{menuType === 'photo' ? '📷' : '📄'}</span>
            <span>Click to upload {menuType === 'photo' ? 'image' : 'PDF'}</span>
            {block.menuFile && <span className="text-xs text-green-400 mt-1">✓ File uploaded</span>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={menuType === 'photo' ? 'image/*' : 'application/pdf'}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
          />
        </div>
      )}

      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Size</label>
        <SizeToggle value={block.size} onChange={s => onUpdate({ size: s })} />
      </div>
    </div>
  );
}

function MapSettings({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (b: Partial<OpenStatusBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Address</label>
        <input
          type="text"
          value={block.url || ''}
          onChange={e => onUpdate({ url: e.target.value })}
          placeholder="123 Main St, City, State"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
        <p className="text-xs text-white/30 mt-1">Paste an address or Google Maps link — the widget shows a live map</p>
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Size</label>
        <SizeToggle value={block.size} onChange={s => onUpdate({ size: s })} />
      </div>
    </div>
  );
}

function BookSettings({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (b: Partial<OpenStatusBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Booking Platform</label>
        <div className="grid grid-cols-2 gap-2">
          {BOOK_PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => onUpdate({ sub: `Book via ${p.label}` })}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
            >
              <span className="text-lg leading-none">{p.icon}</span>
              <span className="text-xs font-medium text-white truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Booking URL</label>
        <input
          type="url"
          value={block.url || ''}
          onChange={e => onUpdate({ url: e.target.value })}
          placeholder="https://resy.com/cities/ny/your-restaurant"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Size</label>
        <SizeToggle value={block.size} onChange={s => onUpdate({ size: s })} />
      </div>
    </div>
  );
}

function WebsiteSettings({ block, onUpdate }: { block: OpenStatusBlock; onUpdate: (b: Partial<OpenStatusBlock>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Website URL</label>
        <input
          type="url"
          value={block.url || ''}
          onChange={e => onUpdate({ url: e.target.value })}
          placeholder="https://yourwebsite.com"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Size</label>
        <SizeToggle value={block.size} onChange={s => onUpdate({ size: s })} />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Widget Color</label>
        <ColorPicker value={block.color || '#1a1a2e'} onChange={c => onUpdate({ color: c })} />
      </div>
    </div>
  );
}

function BlockSettingsPanel({
  block,
  onUpdate,
}: {
  block: OpenStatusBlock;
  onUpdate: (b: Partial<OpenStatusBlock>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <span className="text-3xl">{BLOCK_META[block.id]?.icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-white">{BLOCK_META[block.id]?.label}</div>
          <div className="text-xs text-white/40">{BLOCK_META[block.id]?.description}</div>
        </div>
        {/* Visible toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">{block.on ? 'On' : 'Off'}</span>
          <button
            onClick={() => onUpdate({ on: !block.on })}
            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${block.on ? 'bg-green-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${block.on ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>

      {/* Common fields */}
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Title</label>
        <input
          type="text"
          value={block.title}
          onChange={e => onUpdate({ title: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label className="text-xs text-white/50 uppercase tracking-wider mb-1.5 block">Subtitle</label>
        <input
          type="text"
          value={block.sub}
          onChange={e => onUpdate({ sub: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
      </div>

      {/* Block-specific settings */}
      {block.id === 'order'   && <OrderSettings   block={block} onUpdate={onUpdate} />}
      {block.id === 'menu'    && <MenuSettings    block={block} onUpdate={onUpdate} />}
      {block.id === 'map'     && <MapSettings     block={block} onUpdate={onUpdate} />}
      {block.id === 'book'    && <BookSettings    block={block} onUpdate={onUpdate} />}
      {block.id === 'website' && <WebsiteSettings block={block} onUpdate={onUpdate} />}
    </div>
  );
}

// ─── Preview block rendering ──────────────────────────────────────────────────

function PreviewBlock({ block }: { block: OpenStatusBlock }) {
  const isHalf = block.size === 'half';
  const colSpan = isHalf ? '' : 'col-span-2';

  if (block.id === 'map') {
    return (
      <div className={`relative rounded-2xl overflow-hidden ${colSpan}`} style={{ height: isHalf ? '90px' : '120px' }}>
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=-74.01,40.70,-73.96,40.75&layer=mapnik"
          className="w-full h-full border-0 pointer-events-none"
          style={{ transform: 'scale(1.1)', transformOrigin: 'center' }}
          title="Map"
        />
        <div className="absolute inset-0 bg-black/30 flex items-end p-3">
          <div className="flex items-center gap-2">
            <span>📍</span>
            <div>
              <div className="text-white font-semibold text-xs">{block.title}</div>
              <div className="text-white/70 text-[10px]">{block.sub}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-3 flex items-center gap-3 ${colSpan}`}
      style={{ background: block.color || 'rgba(255,255,255,0.08)' }}
    >
      <span className="text-xl">{BLOCK_META[block.id]?.icon || '🔗'}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white text-xs truncate">{block.title}</div>
        <div className="text-white/50 text-[10px] truncate">{block.sub}</div>
      </div>
      <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

function MobilePreview({
  business,
  config,
  logoScale,
  logoPos,
}: {
  business: Business | null;
  config: OpenStatusPageConfig;
  logoScale: number;
  logoPos: { x: number; y: number };
}) {
  const name = business?.name || 'Your Business';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
  const activeBlocks = config.blocks.filter(b => b.on);
  const logo = business?.avatar_url?.startsWith('storage:')
    ? `/api/assets?businessId=${business.id}&kind=avatar`
    : business?.avatar_url || '';

  // Build row groups for half/full layout
  const rows: Array<OpenStatusBlock | [OpenStatusBlock, OpenStatusBlock]> = [];
  let i = 0;
  while (i < activeBlocks.length) {
    if (activeBlocks[i].size === 'half' && activeBlocks[i + 1]?.size === 'half') {
      rows.push([activeBlocks[i], activeBlocks[i + 1]]);
      i += 2;
    } else {
      rows.push(activeBlocks[i]);
      i++;
    }
  }

  return (
    <div className="w-[272px] mx-auto select-none">
      <div className="bg-[#111] rounded-[40px] p-2 shadow-2xl ring-1 ring-white/10">
        <div className="bg-black rounded-[32px] overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-3 pb-1">
            <span className="text-white/80 text-[10px] font-semibold">9:41</span>
            <div className="w-16 h-3.5 bg-black rounded-full border border-white/20" />
            <div className="w-8 h-3 bg-white/20 rounded-sm" />
          </div>

          <div className="px-3 pb-6 space-y-3">
            {/* Logo + name + tags */}
            <div className="flex flex-col items-center pt-2 gap-2">
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-white/10 flex items-center justify-center relative">
                {logo ? (
                  <img
                    src={logo}
                    alt="logo"
                    style={{
                      transform: `translate(${logoPos.x}px, ${logoPos.y}px) scale(${logoScale})`,
                      width: '100%', height: '100%', objectFit: 'cover',
                      transformOrigin: 'center',
                    }}
                  />
                ) : (
                  <span className="text-xl font-bold text-white">{initials}</span>
                )}
              </div>
              <div className="text-center">
                <h1 className="text-white font-bold text-base">{name}</h1>
                {config.tags && config.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {config.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {config.location && (
                  <p className="text-white/40 text-[10px] mt-1">📍 {config.location}</p>
                )}
              </div>
            </div>

            {/* Status pill */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-green-400 text-[10px] font-medium">Open Now · Closes at 10 PM</span>
            </div>

            {/* Widgets */}
            <div className="grid grid-cols-2 gap-1.5">
              {rows.map((row, ri) => {
                if (Array.isArray(row)) {
                  return (
                    <>
                      <PreviewBlock key={row[0].id} block={row[0]} />
                      <PreviewBlock key={row[1].id} block={row[1]} />
                    </>
                  );
                }
                return <PreviewBlock key={row.id} block={row} />;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main BuilderClient ───────────────────────────────────────────────────────

export default function BuilderClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const [blocks, setBlocks] = useState<OpenStatusBlock[]>(defaultOpenStatusBlocks);
  const [socials, setSocials] = useState<OpenStatusSocial[]>([]);
  const [bg, setBg] = useState('warm');
  const [location, setLocation] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [showPlaces, setShowPlaces] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'blocks' | 'profile' | 'style'>('blocks');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  // Logo crop/scale state
  const [logoScale, setLogoScale] = useState(1);
  const [logoPos, setLogoPos] = useState({ x: 0, y: 0 });
  const logoDragging = useRef(false);
  const logoDragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const predictions = usePlaces(locationInput);
  const activeBlock = blocks.find(b => b.id === activeBlockId) ?? null;

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const cfg = normalizeOpenStatusPageConfig(user.user_metadata?.openstatus_page);
      setBlocks(cfg.blocks);
      setSocials(cfg.socials);
      setBg(cfg.bg);
      setLocation(cfg.location || '');
      setLocationInput(cfg.location || '');
      setTags(cfg.tags || []);

      const { data: biz } = await supabase
        .from('businesses')
        .select('id,name,tagline,slug,avatar_url,header_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (biz) setBusiness(biz);
      setLoading(false);
    }
    init();
  }, [router]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateBlock = useCallback((id: string, updates: Partial<OpenStatusBlock>) => {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const config: OpenStatusPageConfig = { blocks, bg, socials, location: locationInput.trim(), tags };

  const save = async () => {
    setSaving(true);
    setError('');
    const { error: e } = await supabase.auth.updateUser({ data: { openstatus_page: config } });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Logo drag ─────────────────────────────────────────────────────────────
  const onLogoMouseDown = (e: React.MouseEvent) => {
    logoDragging.current = true;
    logoDragStart.current = { x: e.clientX, y: e.clientY, px: logoPos.x, py: logoPos.y };
  };
  const onLogoMouseMove = (e: React.MouseEvent) => {
    if (!logoDragging.current) return;
    setLogoPos({
      x: logoDragStart.current.px + (e.clientX - logoDragStart.current.x),
      y: logoDragStart.current.py + (e.clientY - logoDragStart.current.y),
    });
  };
  const onLogoMouseUp = () => { logoDragging.current = false; };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-60 flex flex-col border-r border-white/8 bg-[#111] flex-shrink-0">

        {/* Logo */}
        <div className="p-4 border-b border-white/8 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">OS</div>
          <span className="font-semibold text-sm text-white">OpenStatus</span>
          {business?.slug && (
            <a
              href={`/${business.slug}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              ↗
            </a>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-white/8">
          {(['blocks', 'profile', 'style'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); setActiveBlockId(null); }}
              className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-semibold transition-all ${
                activeTab === t ? 'text-white border-b-2 border-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Blocks tab ── */}
        {activeTab === 'blocks' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            <p className="text-[9px] text-white/25 uppercase tracking-widest px-1 py-1">Widgets</p>
            {blocks.map(block => {
              const meta = BLOCK_META[block.id];
              return (
                <button
                  key={block.id}
                  onClick={() => setActiveBlockId(block.id === activeBlockId ? null : block.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    activeBlockId === block.id
                      ? 'bg-white/15 ring-1 ring-white/20'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-base leading-none">{meta?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{meta?.label}</div>
                    <div className="text-[9px] text-white/35">{block.on ? 'Visible' : 'Hidden'}</div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${block.on ? 'bg-green-400' : 'bg-white/15'}`} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Profile tab ── */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Business Name</label>
              <input
                type="text"
                value={business?.name || ''}
                onChange={e => setBusiness(b => b ? { ...b, name: e.target.value } : b)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Location with Places autocomplete */}
            <div className="relative">
              <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Location</label>
              <input
                type="text"
                value={locationInput}
                onChange={e => { setLocationInput(e.target.value); setShowPlaces(true); }}
                onFocus={() => setShowPlaces(true)}
                onBlur={() => setTimeout(() => setShowPlaces(false), 200)}
                placeholder="Search address…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30"
              />
              {showPlaces && predictions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[#1c1c1c] border border-white/15 rounded-xl overflow-hidden shadow-2xl">
                  {predictions.map(p => (
                    <button
                      key={p.place_id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setLocationInput(p.description);
                        setShowPlaces(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0"
                    >
                      📍 {p.description}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Business type tags */}
            <div>
              <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Business Type</label>
              <div className="flex flex-wrap gap-1.5">
                {BUSINESS_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                      tags.includes(tag)
                        ? 'bg-white text-black border-white'
                        : 'border-white/15 text-white/40 hover:border-white/30 hover:text-white/70'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Style tab ── */}
        {activeTab === 'style' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Background</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'warm', label: 'Warm', color: '#EDE9E2' },
                  { id: 'blue', label: 'Blue', color: '#E9EEF5' },
                  { id: 'lime', label: 'Lime', color: '#E7F7C8' },
                  { id: 'dark', label: 'Dark', color: '#181817' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setBg(opt.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      bg === opt.id ? 'border-white text-white' : 'border-white/10 text-white/40 hover:border-white/30'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: opt.color }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo crop/scale */}
            {business?.avatar_url && (
              <div>
                <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Logo Crop &amp; Scale</label>
                <div className="text-xs text-white/30 mb-2">Drag logo in preview to reposition</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/35">Scale</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={logoScale}
                    onChange={e => setLogoScale(parseFloat(e.target.value))}
                    className="flex-1 accent-white h-1"
                  />
                  <span className="text-[10px] text-white/35 w-8">{logoScale.toFixed(1)}x</span>
                </div>
                <button
                  onClick={() => { setLogoScale(1); setLogoPos({ x: 0, y: 0 }); }}
                  className="mt-2 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                >
                  Reset
                </button>
              </div>
            )}

            <div>
              <label className="text-[9px] text-white/35 uppercase tracking-widest mb-2 block">Public URL</label>
              <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/40 font-mono">
                openstatus.co/{business?.slug || 'your-business'}
              </div>
            </div>
          </div>
        )}

        {/* Save */}
        <div className="p-3 border-t border-white/8 space-y-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={save}
            disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-white/90 active:scale-[.98]'
            }`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div className="flex-1 overflow-y-auto">
        {activeBlock ? (
          <div className="max-w-md mx-auto p-6">
            <button
              onClick={() => setActiveBlockId(null)}
              className="flex items-center gap-1.5 text-white/35 hover:text-white text-xs mb-6 transition-colors"
            >
              ← All widgets
            </button>
            <div className="bg-white/[.06] rounded-2xl p-5 border border-white/10">
              <BlockSettingsPanel
                block={activeBlock}
                onUpdate={updates => updateBlock(activeBlockId!, updates)}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <div className="text-4xl opacity-20">←</div>
              <p className="text-sm text-white/20">Select a widget to configure it</p>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PREVIEW ── */}
      <div className="w-[340px] border-l border-white/8 bg-[#0d0d0d] flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <span className="text-xs font-medium text-white/50">Live Preview</span>
          <span className="text-[10px] text-white/20">Updates as you edit</span>
        </div>

        {/* Logo drag target overlay in preview */}
        <div
          className="flex-1 overflow-y-auto flex items-start justify-center pt-6 pb-8 px-4"
          onMouseMove={onLogoMouseMove}
          onMouseUp={onLogoMouseUp}
          onMouseLeave={onLogoMouseUp}
        >
          <div
            className={business?.avatar_url ? 'cursor-move' : ''}
            onMouseDown={onLogoMouseDown}
          >
            <MobilePreview
              business={business}
              config={config}
              logoScale={logoScale}
              logoPos={logoPos}
            />
          </div>
        </div>

        {/* Logo scale hint */}
        {business?.avatar_url && activeTab === 'style' && (
          <div className="px-4 pb-3">
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={logoScale}
              onChange={e => setLogoScale(parseFloat(e.target.value))}
              className="w-full accent-white h-1"
            />
            <div className="flex justify-between text-[9px] text-white/20 mt-1">
              <span>0.5×</span>
              <span>Logo Scale</span>
              <span>3×</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
