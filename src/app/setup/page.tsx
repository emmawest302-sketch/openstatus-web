'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { OpenStatusBlock, OpenStatusPageConfig, OpenStatusSocial } from '@/lib/openstatus-page-config';

// ─── SLUG UTILS ───────────────────────────────────────────────────────────────

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  icon: string;
  tags: string[];
  blockIds: string[];
};

// All available block types — id → default title, subtitle, size
const ALL_BLOCKS: Record<string, { title: string; sub: string; size: 'half' | 'full' | 'third' }> = {
  // Shopping & ordering
  order:       { title: 'Order ahead',          sub: 'Order for pickup or delivery', size: 'half' },
  shop:        { title: 'Shop now',             sub: 'Browse our store',             size: 'full' },
  arrivals:    { title: 'New arrivals',         sub: "See what's just landed",       size: 'half' },
  bestsellers: { title: 'Best sellers',         sub: 'Our most popular items',       size: 'half' },
  promo:       { title: 'Current promotion',    sub: "See today's deals",            size: 'full' },
  track:       { title: 'Track my order',       sub: 'Check your order status',      size: 'full' },
  // Booking & contact
  book:        { title: 'Book an appointment',  sub: 'Schedule online',              size: 'half' },
  call:        { title: 'Call us',              sub: 'Tap to call',                  size: 'half' },
  email:       { title: 'Email us',             sub: 'Send us a message',            size: 'half' },
  // Discovery
  menu:        { title: 'Menu',                 sub: 'View our full menu',           size: 'half' },
  services:    { title: 'Our services',         sub: 'See what we offer',            size: 'half' },
  classes:     { title: 'Class schedule',       sub: 'Browse and book classes',      size: 'full' },
  membership:  { title: 'Join / Memberships',   sub: 'Plans and pricing',            size: 'half' },
  team:        { title: 'Meet the team',        sub: 'The people behind the work',   size: 'half' },
  special:     { title: "Today's special",      sub: "See what's on today",          size: 'full' },
  stops:       { title: 'Upcoming stops',       sub: "See where we'll be next",      size: 'half' },
  // Links & presence
  website:     { title: 'Website',              sub: 'Visit our site',               size: 'full' },
  gallery:     { title: 'Photos',               sub: 'See our work',                 size: 'third' },
  reviews:     { title: 'Reviews',              sub: 'Read what customers say',      size: 'third' },
  location:    { title: 'Find us',              sub: 'Get directions',               size: 'full' },
};

const CATEGORIES: Category[] = [
  {
    id: 'cafe',
    label: 'Coffee Shop / Café',
    icon: '☕',
    tags: ['Coffee', 'Tea', 'Pastries', 'WiFi', 'Outdoor seating', 'Study-friendly', 'Vegan options', 'Breakfast'],
    blockIds: ['order', 'menu', 'location', 'special', 'reviews', 'gallery', 'website'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: '🍽️',
    tags: ['Dine-in', 'Takeout', 'Delivery', 'Reservations', 'Happy hour', 'Brunch', 'Outdoor seating', 'Pet-friendly'],
    blockIds: ['book', 'order', 'menu', 'location', 'reviews', 'gallery', 'website'],
  },
  {
    id: 'salon',
    label: 'Salon / Beauty',
    icon: '✂️',
    tags: ['Walk-ins welcome', 'By appointment', 'Color', 'Extensions', "Men's cuts", 'Braids', 'Nails', 'Lashes', 'Brows', 'Gift cards'],
    blockIds: ['book', 'services', 'team', 'gallery', 'location', 'call', 'reviews'],
  },
  {
    id: 'retail',
    label: 'Retail / Boutique',
    icon: '🛍️',
    tags: ['In-store pickup', 'Local brand', 'Gift wrapping', 'Custom orders', 'Curbside'],
    blockIds: ['shop', 'location', 'arrivals', 'gallery', 'reviews', 'website'],
  },
  {
    id: 'online',
    label: 'Online Store',
    icon: '🛒',
    tags: ['Free shipping', 'Easy returns', 'Handmade', 'Small batch', 'Ships worldwide'],
    blockIds: ['shop', 'arrivals', 'bestsellers', 'promo', 'track', 'reviews'],
  },
  {
    id: 'foodtruck',
    label: 'Food Truck / Mobile',
    icon: '🚚',
    tags: ['Street food', 'Events', 'Catering', 'Vegan', 'Cash & card', 'Family-owned'],
    blockIds: ['location', 'menu', 'stops', 'order', 'gallery', 'reviews'],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    icon: '💪',
    tags: ['Classes', 'Personal training', '24/7 access', 'Drop-ins welcome', 'Memberships', 'Yoga', 'Pilates', 'CrossFit'],
    blockIds: ['classes', 'book', 'membership', 'website', 'reviews', 'call'],
  },
  {
    id: 'service',
    label: 'Services',
    icon: '🔧',
    tags: ['Free estimates', 'Licensed & insured', 'Same-day service', 'Emergency calls', 'Local & trusted'],
    blockIds: ['book', 'call', 'services', 'reviews', 'website', 'email'],
  },
  {
    id: 'events',
    label: 'Events / Entertainment',
    icon: '🎉',
    tags: ['Private events', 'Weddings', 'Corporate', 'Catering', 'Outdoor', 'Live music'],
    blockIds: ['book', 'gallery', 'website', 'email', 'call', 'reviews'],
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📌',
    tags: [],
    blockIds: ['website', 'call', 'email', 'location'],
  },
];

function buildBlocks(blockIds: string[]): OpenStatusBlock[] {
  return blockIds
    .filter(id => ALL_BLOCKS[id])
    .map(id => ({
      id,
      title: ALL_BLOCKS[id].title,
      sub: ALL_BLOCKS[id].sub,
      icon: '',
      on: true,
      tone: 'glass',
      url: '',
      size: ALL_BLOCKS[id].size,
    }));
}

// ─── STEP INDICATOR ──────────────────────────────────────────────────────────

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3,
          flex: 1,
          borderRadius: 99,
          background: i < step ? '#0A0A0A' : '#DEDEDC',
          transition: 'background 0.3s ease',
        }}/>
      ))}
    </div>
  );
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PlaceSuggestion = { id: string; name: string; address: string };

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  // Step 1: Business name + slug
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');
  const [initialSlug, setInitialSlug] = useState('');

  // Step 2: Category
  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Step 3: Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Step 4: Location
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing business on mount ──
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }
    setUserId(user.id);

    const { data: existing } = await supabase
      .from('businesses')
      .select('id, name, slug')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      setBusinessId(existing.id);
      setName(existing.name ?? '');
      setSlug(existing.slug ?? '');
      setInitialSlug(existing.slug ?? '');
      if (existing.slug) setSlugState('free');
    } else {
      // Create a placeholder business row immediately
      const newId = crypto.randomUUID();
      const { data: created, error: insertErr } = await supabase
        .from('businesses')
        .insert({ id: newId, user_id: user.id, name: 'My Business' })
        .select('id')
        .single();
      if (created) {
        setBusinessId(created.id);
      } else if (insertErr) {
        setError('Could not create your business profile: ' + insertErr.message);
      }
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  // ── Slug auto-generation from name ──
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugEdited]);

  // ── Slug availability check ──
  useEffect(() => {
    const normalized = toSlug(slug);
    if (normalized.length < 3) { setSlugState('idle'); return; }
    if (normalized === initialSlug) { setSlugState('free'); return; }
    setSlugState('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle?handle=${encodeURIComponent(normalized)}`);
        const body = await res.json() as { available: boolean; reason?: string };
        setSlugState(body.available ? 'free' : 'taken');
      } catch {
        setSlugState('idle');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug, initialSlug]);

  // ── Location autocomplete ──
  const onLocationInput = (val: string) => {
    setLocationQuery(val);
    setSelectedPlace(null);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    if (!val.trim() || val.length < 3) { setLocationSuggestions([]); return; }
    locationDebounce.current = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(val)}`);
        const data = await res.json() as { places?: PlaceSuggestion[] };
        setLocationSuggestions(data.places ?? []);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationLoading(false);
      }
    }, 400);
  };

  const selectPlace = (place: PlaceSuggestion) => {
    setSelectedPlace(place);
    setLocationQuery(place.address);
    setLocationSuggestions([]);
  };

  // ── Step 1 save ──
  const saveStep1 = async () => {
    if (!businessId || slugState !== 'free' || !name.trim()) return;
    setSaving(true);
    const { error: e } = await supabase
      .from('businesses')
      .update({ name: name.trim(), slug: toSlug(slug) })
      .eq('id', businessId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setInitialSlug(toSlug(slug));
    setError('');
    setStep(2);
  };

  // ── Step 2: select category ──
  const saveStep2 = () => {
    if (!categoryId) return;
    setSelectedTags([]);
    setStep(3);
  };

  // ── Step 3: select tags ──
  const saveStep3 = () => {
    setStep(4);
  };

  // ── Step 4: save everything and go to builder ──
  const finish = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');

    const category = CATEGORIES.find(c => c.id === categoryId);
    const blocks = buildBlocks(category?.blockIds ?? ['website', 'call', 'email']);

    const pageConfig: OpenStatusPageConfig = {
      blocks,
      bg: '#F7F7F5',
      socials: [] as OpenStatusSocial[],
      location: selectedPlace?.address ?? locationQuery.trim(),
      tags: selectedTags,
    };

    // Save page config to user metadata (where the builder reads/writes it)
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { openstatus_page: pageConfig },
    });
    if (metaErr) { setError(metaErr.message); setSaving(false); return; }

    // Save place_id to businesses table if we have one
    if (selectedPlace?.id) {
      await supabase
        .from('businesses')
        .update({ place_id: selectedPlace.id })
        .eq('id', businessId);
    }

    setSaving(false);
    router.push('/builder?new=1');
  };

  // ── Computed ──
  const selectedCategory = CATEGORIES.find(c => c.id === categoryId);
  const filteredCategories = categorySearch
    ? CATEGORIES.filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
    : CATEGORIES;
  const canGoStep1 = name.trim().length > 0 && slugState === 'free';
  const slugColor = slugState === 'free' ? '#22C55E' : slugState === 'taken' ? '#EF4444' : '#858585';

  // ── STYLES ────────────────────────────────────────────────────────────────
  const base: React.CSSProperties = {
    fontFamily: "'Inter', system-ui, sans-serif",
    background: '#F7F7F5',
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px 60px',
  };

  const card: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid #DEDEDC',
    borderRadius: 16,
    padding: '14px 16px',
    fontSize: 15,
    color: '#0A0A0A',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: '#0A0A0A',
    color: '#F7F7F5',
    border: 'none',
    borderRadius: 99,
    padding: '15px 24px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'opacity 0.15s',
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  if (loading) {
    return (
      <main style={{ ...base, justifyContent: 'center', gap: 12 }}>
        <svg viewBox="0 0 100 100" width="28" height="28">
          <circle cx="50" cy="50" r="48" fill="#0A0A0A"/>
          <circle cx="50" cy="50" r="21" fill="#F7F7F5"/>
          <circle cx="50" cy="44" r="7.4" fill="#0A0A0A"/>
          <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#0A0A0A"/>
        </svg>
        <p style={{ fontSize: 13, color: '#858585', fontFamily: "'Inter', system-ui, sans-serif" }}>
          Setting up your account…
        </p>
      </main>
    );
  }

  return (
    <main style={base}>
      <div style={card}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true">
            <circle cx="50" cy="50" r="48" fill="#0A0A0A"/>
            <circle cx="50" cy="50" r="21" fill="#F7F7F5"/>
            <circle cx="50" cy="44" r="7.4" fill="#0A0A0A"/>
            <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#0A0A0A"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em' }}>OpenStatus</span>
        </div>

        {/* Progress */}
        <StepBar step={step} total={TOTAL_STEPS} />

        {/* ── STEP 1: Business Name ─────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 1 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontSize: 38,
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 8,
            }}>
              What&apos;s your<br />business called?
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 32, lineHeight: 1.5 }}>
              This is your public name. You can change it later.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Business name */}
              <input
                autoFocus
                type="text"
                placeholder="Sunrise Coffee Co."
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ ...inputStyle, fontSize: 18, fontWeight: 600 }}
                onKeyDown={e => e.key === 'Enter' && canGoStep1 && void saveStep1()}
              />

              {/* URL preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid #DEDEDC',
                borderRadius: 16,
                background: '#fff',
                overflow: 'hidden',
              }}>
                <span style={{ padding: '14px 4px 14px 16px', fontSize: 14, color: '#858585', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  openstatus.co/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)); }}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#0A0A0A',
                    padding: '14px 8px',
                    background: 'transparent',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    minWidth: 0,
                  }}
                />
                <span style={{ padding: '0 14px', fontSize: 10, fontWeight: 700, color: slugColor, flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {slugState === 'checking' ? '...' : slugState === 'free' ? '✓' : slugState === 'taken' ? 'taken' : ''}
                </span>
              </div>
            </div>

            {error && <p style={{ marginTop: 12, fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <button
              onClick={() => void saveStep1()}
              disabled={saving || !canGoStep1}
              style={{ ...primaryBtn, marginTop: 32, opacity: (!canGoStep1 || saving) ? 0.35 : 1 }}
            >
              <span>Continue</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ── STEP 2: Category ──────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 2 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontSize: 38,
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 8,
            }}>
              What type of<br />business is it?
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 24, lineHeight: 1.5 }}>
              This helps us set up the right links for you.
            </p>

            {/* Search */}
            <input
              type="text"
              placeholder="Search…"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 32 }}>
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 16,
                    border: `1.5px solid ${categoryId === cat.id ? '#0A0A0A' : '#DEDEDC'}`,
                    background: categoryId === cat.id ? '#0A0A0A' : '#fff',
                    color: categoryId === cat.id ? '#F7F7F5' : '#0A0A0A',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left',
                    transition: 'all 0.12s ease',
                    fontFamily: "'Inter', system-ui, sans-serif",
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={saveStep2}
              disabled={!categoryId}
              style={{ ...primaryBtn, opacity: !categoryId ? 0.35 : 1 }}
            >
              <span>Continue</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ── STEP 3: Tags ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 3 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontSize: 38,
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 8,
            }}>
              Describe what<br />you offer
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 24, lineHeight: 1.5 }}>
              Optional — customers see these as quick-scan tags.
            </p>

            {selectedCategory && selectedCategory.tags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                {selectedCategory.tags.map(tag => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev =>
                        active ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      style={{
                        padding: '9px 16px',
                        borderRadius: 99,
                        border: `1.5px solid ${active ? '#0A0A0A' : '#DEDEDC'}`,
                        background: active ? '#0A0A0A' : '#fff',
                        color: active ? '#F7F7F5' : '#292929',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#858585', marginBottom: 32, padding: '20px 0' }}>
                No tags needed for this category — just continue.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={saveStep3} style={primaryBtn}>
                <span>{selectedTags.length > 0 ? 'Continue' : 'Skip for now'}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Location ──────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 4 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
              fontSize: 38,
              fontWeight: 800,
              color: '#0A0A0A',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              marginBottom: 8,
            }}>
              Where are<br />you located?
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 24, lineHeight: 1.5 }}>
              Optional — helps customers find you and powers your map block.
            </p>

            <div style={{ position: 'relative', marginBottom: 32 }}>
              <input
                autoFocus
                type="text"
                placeholder="123 Main St, Nashville, TN"
                value={locationQuery}
                onChange={e => onLocationInput(e.target.value)}
                style={inputStyle}
              />

              {/* Suggestions dropdown */}
              {locationSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#fff',
                  border: '1.5px solid #DEDEDC',
                  borderRadius: 16,
                  marginTop: 6,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  zIndex: 10,
                }}>
                  {locationSuggestions.map(place => (
                    <button
                      key={place.id}
                      onClick={() => selectPlace(place)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        borderBottom: '1px solid #EEEEEC',
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{place.name}</span>
                      <span style={{ fontSize: 12, color: '#858585' }}>{place.address}</span>
                    </button>
                  ))}
                </div>
              )}

              {locationLoading && (
                <p style={{ fontSize: 12, color: '#858585', marginTop: 8 }}>Searching…</p>
              )}

              {selectedPlace && (
                <div style={{
                  marginTop: 10,
                  padding: '10px 14px',
                  background: '#EEEEEC',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{selectedPlace.name}</div>
                    <div style={{ fontSize: 12, color: '#858585' }}>{selectedPlace.address}</div>
                  </div>
                </div>
              )}
            </div>

            {error && <p style={{ marginBottom: 16, fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => void finish()}
                disabled={saving}
                style={{ ...primaryBtn, opacity: saving ? 0.5 : 1 }}
              >
                <span>{saving ? 'Setting up your page…' : 'Open my builder'}</span>
                {!saving && <span>→</span>}
              </button>
              <button
                onClick={() => void finish()}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 13,
                  color: '#858585',
                  cursor: 'pointer',
                  padding: '8px 0',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              marginTop: 24,
              background: 'none',
              border: 'none',
              fontSize: 13,
              color: '#858585',
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              alignSelf: 'center',
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}
