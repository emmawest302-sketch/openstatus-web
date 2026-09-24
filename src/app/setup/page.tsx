'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { OpenStatusBlock, OpenStatusPageConfig, OpenStatusSocial, WeeklyHours } from '@/lib/openstatus-page-config';
import { savePageConfig } from '@/lib/page-config-store';
import { detectTimeZone, isValidTimeZone } from '@/lib/timezone';
import { DEFAULT_WEEK_HOURS } from '@/components/builder/constants';
import { normaliseHandle, HANDLE_MAX } from '@/lib/handles';

// ─── SLUG UTILS ───────────────────────────────────────────────────────────────

/**
 * Turn what the owner typed into the handle we will actually store.
 *
 * This used to be its own function and it disagreed with the validator in two
 * ways. It sliced at 48 while validateHandle rejects anything over 32, so a
 * long business name produced a slug that read "taken" with no reason given;
 * and it kept trailing hyphens while normaliseHandle strips them, so
 * "my-shop-" was CHECKED as "my-shop" and WRITTEN as "my-shop-" — availability
 * confirmed for a different string than the one saved.
 *
 * Both now come from lib/handles, which is what /api/handle validates with.
 */
function toSlug(str: string) {
  return normaliseHandle(str.replace(/\s+/g, '-')).slice(0, HANDLE_MAX);
}

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  tags: string[];
  blockIds: string[];
};

const ALL_BLOCKS: Record<string, { title: string; sub: string; size: 'half' | 'full' | 'third' }> = {
  order:       { title: 'Order ahead',          sub: 'Order for pickup or delivery', size: 'half' },
  shop:        { title: 'Shop now',             sub: 'Browse our store',             size: 'full' },
  arrivals:    { title: 'New arrivals',         sub: "See what's just landed",       size: 'half' },
  bestsellers: { title: 'Best sellers',         sub: 'Our most popular items',       size: 'half' },
  promo:       { title: 'Current promotion',    sub: "See today's deals",            size: 'full' },
  track:       { title: 'Track my order',       sub: 'Check your order status',      size: 'full' },
  book:        { title: 'Book an appointment',  sub: 'Schedule online',              size: 'half' },
  call:        { title: 'Call us',              sub: 'Tap to call',                  size: 'half' },
  email:       { title: 'Email us',             sub: 'Send us a message',            size: 'half' },
  menu:        { title: 'Menu',                 sub: 'View our full menu',           size: 'half' },
  services:    { title: 'Our services',         sub: 'See what we offer',            size: 'half' },
  classes:     { title: 'Class schedule',       sub: 'Browse and book classes',      size: 'full' },
  membership:  { title: 'Join / Memberships',   sub: 'Plans and pricing',            size: 'half' },
  team:        { title: 'Meet the team',        sub: 'The people behind the work',   size: 'half' },
  special:     { title: "Today's special",      sub: "See what's on today",          size: 'full' },
  stops:       { title: 'Upcoming stops',       sub: "See where we'll be next",      size: 'half' },
  website:     { title: 'Website',              sub: 'Visit our site',               size: 'full' },
  gallery:     { title: 'Photos',               sub: 'See our work',                 size: 'third' },
  reviews:     { title: 'Reviews',              sub: 'Read what customers say',      size: 'third' },
  location:    { title: 'Find us',              sub: 'Get directions',               size: 'full' },
};

const CATEGORIES: Category[] = [
  {
    id: 'cafe',
    label: 'Coffee Shop / Café',
    tags: ['Coffee', 'Tea', 'Pastries', 'WiFi', 'Outdoor seating', 'Study-friendly', 'Vegan options', 'Breakfast'],
    blockIds: ['order', 'menu', 'location', 'special', 'reviews', 'gallery', 'website'],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    tags: ['Dine-in', 'Takeout', 'Delivery', 'Reservations', 'Happy hour', 'Brunch', 'Outdoor seating', 'Pet-friendly'],
    blockIds: ['book', 'order', 'menu', 'location', 'reviews', 'gallery', 'website'],
  },
  {
    id: 'salon',
    label: 'Salon / Beauty',
    tags: ['Walk-ins welcome', 'By appointment', 'Color', 'Extensions', "Men's cuts", 'Braids', 'Nails', 'Lashes', 'Brows', 'Gift cards'],
    blockIds: ['book', 'services', 'team', 'gallery', 'location', 'call', 'reviews'],
  },
  {
    id: 'retail',
    label: 'Retail / Boutique',
    tags: ['In-store pickup', 'Local brand', 'Gift wrapping', 'Custom orders', 'Curbside'],
    blockIds: ['shop', 'location', 'arrivals', 'gallery', 'reviews', 'website'],
  },
  {
    id: 'online',
    label: 'Online Store',
    tags: ['Free shipping', 'Easy returns', 'Handmade', 'Small batch', 'Ships worldwide'],
    blockIds: ['shop', 'arrivals', 'bestsellers', 'promo', 'track', 'reviews'],
  },
  {
    id: 'food_truck',
    label: 'Food Truck / Mobile',
    tags: ['Street food', 'Events', 'Catering', 'Vegan', 'Cash & card', 'Family-owned'],
    blockIds: ['location', 'menu', 'stops', 'order', 'gallery', 'reviews'],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    tags: ['Classes', 'Personal training', '24/7 access', 'Drop-ins welcome', 'Memberships', 'Yoga', 'Pilates', 'CrossFit'],
    blockIds: ['classes', 'book', 'membership', 'website', 'reviews', 'call'],
  },
  {
    id: 'services',
    label: 'Services',
    tags: ['Free estimates', 'Licensed & insured', 'Same-day service', 'Emergency calls', 'Local & trusted'],
    blockIds: ['book', 'call', 'services', 'reviews', 'website', 'email'],
  },
  {
    id: 'events',
    label: 'Events / Entertainment',
    tags: ['Private events', 'Weddings', 'Corporate', 'Catering', 'Outdoor', 'Live music'],
    blockIds: ['book', 'gallery', 'website', 'email', 'call', 'reviews'],
  },
  {
    id: 'other',
    label: 'Other',
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

// ─── CATEGORY ICONS ────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  cafe:      'M17 8h1a4 4 0 0 1 0 8h-1 M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3',
  restaurant:'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  salon:     'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M8 6l8 12 M16 6l-8 12',
  retail:    'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
  online:    'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  food_truck: 'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  fitness:   'M6 5v14 M2 8h4 M2 16h4 M18 5v14 M20 8h-4 M20 16h-4 M6 12h12',
  service:   'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  events:    'M3 4h18v18H3V4z M16 2v4 M8 2v4 M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01',
  other:     'M5 12h.01 M12 12h.01 M19 12h.01',
};

function CategoryIcon({ id, active }: { id: string; active: boolean }) {
  const d = CATEGORY_ICONS[id] ?? CATEGORY_ICONS.other;
  const paths = d.split(' M ').map((p: string, i: number) => i === 0 ? p : 'M ' + p);
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {paths.map((p: string, i: number) => (
        <path key={i} d={p} stroke={active ? 'rgba(247,247,245,0.9)' : '#444'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      ))}
    </svg>
  );
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
          background: i < step ? '#0A0A0A' : '#EBEBEA',
          transition: 'background 0.3s ease',
        }}/>
      ))}
    </div>
  );
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

type PlaceSuggestion = { id: string; name: string; address: string };

type PlaceDetails = {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: Record<string, { open: string; close: string; closed: boolean }> | null;
  rating?: number;
  reviewCount?: number;
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Step state — 4 steps total
  // 1: Find on Google, 2: Confirm name+slug, 3: Category, 4: Tags
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  // Step 1: Google Places search
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const placeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2: Business name + slug
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'free' | 'taken' | 'error'>('idle');
  /** Google's own words for why, e.g. "That one is reserved". */
  const [slugReason, setSlugReason] = useState<string | null>(null);
  const [initialSlug, setInitialSlug] = useState('');

  // Step 3: Category
  const [categoryId, setCategoryId] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // Step 4: Tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // ── Load existing business on mount ──
  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/'); return; }

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

      // An owner who already finished setup does not belong here. finish()
      // rebuilds business_page_config from category defaults, so walking back
      // through the wizard silently replaced their blocks, socials and
      // background with a fresh set. Slug present means they got past step 2,
      // which is the only step that writes one.
      if (existing.slug) { router.replace('/builder'); return; }
    } else {
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

  // ── Slug auto-generation ──
  useEffect(() => {
    if (!slugEdited && name) setSlug(toSlug(name));
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
        const body = await res.json() as { available?: boolean; reason?: string };
        setSlugState(body.available ? 'free' : 'taken');
        // "Already taken", "That one is reserved" and "At most 32 characters"
        // all rendered as a bare "taken" chip. Someone typing `status` had no
        // way to learn it is a reserved route.
        setSlugReason(body.available ? null : (body.reason ?? 'Already taken'));
      } catch {
        // Not the same as taken: the check itself failed, and treating it as
        // 'idle' disabled Continue forever with no message on screen.
        setSlugState('error');
        setSlugReason('Could not check that address right now. Try again in a moment.');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug, initialSlug]);

  // ── Places search ──
  const onPlaceInput = (val: string) => {
    setPlaceQuery(val);
    setSelectedPlace(null);
    setPlaceDetails(null);
    if (placeDebounce.current) clearTimeout(placeDebounce.current);
    if (!val.trim() || val.length < 3) { setPlaceSuggestions([]); return; }
    placeDebounce.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(val)}`);
        const data = await res.json() as { places?: PlaceSuggestion[] };
        setPlaceSuggestions(data.places ?? []);
      } catch {
        setPlaceSuggestions([]);
      } finally {
        setPlaceLoading(false);
      }
    }, 400);
  };

  // ── Select a place and fetch its details ──
  const selectPlace = async (place: PlaceSuggestion) => {
    setSelectedPlace(place);
    setPlaceQuery(place.name);
    setPlaceSuggestions([]);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(place.id)}`);
      if (res.ok) {
        const details = await res.json() as PlaceDetails;
        setPlaceDetails(details);
        // Pre-fill name from Google (user can edit in step 2)
        setName(details.name || place.name);
        setSlugEdited(false); // let slug re-derive from name
      } else {
        // Details failed — still use the suggestion data
        setName(place.name);
        setSlugEdited(false);
      }
    } catch {
      setName(place.name);
      setSlugEdited(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Skip Google — go straight to manual name entry ──
  const skipGoogle = () => {
    setSelectedPlace(null);
    setPlaceDetails(null);
    setStep(2);
  };

  // ── Step 1 → 2: confirm place or skip ──
  const confirmPlace = () => {
    setStep(2);
  };

  // ── Step 2 save ──
  const saveStep2 = async () => {
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
    setStep(3);
  };

  // ── Step 3: category ──
  const saveStep3 = () => {
    if (!categoryId) return;
    setSelectedTags([]);
    setStep(4);
  };

  // ── Step 4: finish ──
  const finish = async () => {
    if (!businessId) return;
    setSaving(true);
    setError('');

    const category = CATEGORIES.find(c => c.id === categoryId);
    const blocks = buildBlocks(category?.blockIds ?? ['website', 'call', 'email']);

    // ── Carry the Google rating we pulled during search onto the location block ──
    // The star rating in the page header reads from the location block's
    // reviewStars / reviewCount, so seed them here at signup instead of making
    // the user fetch it manually in the builder later.
    if (placeDetails?.rating && placeDetails.rating > 0) {
      const locIdx = blocks.findIndex(b => b.id === 'location');
      const review = {
        reviewStars: placeDetails.rating,
        ...(placeDetails.reviewCount ? { reviewCount: placeDetails.reviewCount } : {}),
      };
      if (locIdx >= 0) {
        blocks[locIdx] = { ...blocks[locIdx], ...review };
      } else {
        blocks.push({
          id: 'location',
          title: ALL_BLOCKS.location.title,
          sub: ALL_BLOCKS.location.sub,
          icon: '',
          on: true,
          tone: 'glass',
          url: '',
          size: ALL_BLOCKS.location.size,
          ...review,
        } as OpenStatusBlock);
      }
    }

    const pageConfig: OpenStatusPageConfig = {
      blocks,
      bg: '#F7F7F5',
      socials: [] as OpenStatusSocial[],
      location: placeDetails?.address ?? '',
      tags: selectedTags,
      // Store imported contact info in page config so builder can use it
      ...(placeDetails?.phone ? { phone: placeDetails.phone } : {}),
      ...(placeDetails?.website ? { website: placeDetails.website } : {}),
      ...(placeDetails?.hours ? { weeklyHours: placeDetails.hours as WeeklyHours } : {}),
    };

    // Goes to business_page_config, falling back to auth metadata if the
    // migration has not been run yet. businessId is set earlier in this flow.
    const { error: metaErr } = await savePageConfig(businessId, pageConfig);
    if (metaErr) { setError(metaErr.message); setSaving(false); return; }

    // Save business fields to DB
    const businessUpdate: Record<string, string | null> = {
      category: categoryId || null,
    };
    // Without this every business defaults to America/Chicago and its
    // open/closed state is wrong outside Central Time.
    const detected = detectTimeZone();
    if (isValidTimeZone(detected)) businessUpdate.timezone = detected;
    if (selectedPlace?.id) businessUpdate.place_id = selectedPlace.id;
    if (placeDetails?.address) businessUpdate.address = placeDetails.address;
    if (placeDetails?.phone) businessUpdate.phone = placeDetails.phone;
    if (placeDetails?.website) businessUpdate.website = placeDetails.website;

    // The result was never checked. If `timezone` or `place_id` don't exist as
    // columns, or RLS refuses, every Google-imported field was dropped in
    // silence and the owner was pushed on regardless.
    const { error: bizErr } = await supabase.from('businesses').update(businessUpdate).eq('id', businessId);
    if (bizErr) { setError(bizErr.message); setSaving(false); return; }

    // ── Hours have to reach business_hours, not just the page config ──
    //
    // The public page reads hours from the business_hours TABLE and nowhere
    // else. Writing them only into business_page_config meant a brand-new
    // owner finished setup — Google hours imported and all — and their live
    // page said "Hours not set" until they happened to open the builder and
    // press Save. For a product whose whole promise is live hours, that was
    // the first thing every new customer saw.
    //
    // Not fatal if it fails: the page config is already saved, and the builder
    // mirrors hours on every save. But the owner is told, rather than
    // discovering it from a customer.
    const weeklyHours = placeDetails?.hours ?? DEFAULT_WEEK_HOURS;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const res = await fetch('/api/business/hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ weeklyHours }),
        });
        if (!res.ok) {
          const out = await res.json().catch(() => ({}));
          setError(`Your page is set up, but the hours didn't publish: ${out?.error ?? res.status}. Open the builder and press Save.`);
          setSaving(false);
          return;
        }
      }
    } catch {
      setError('Your page is set up, but the hours didn\u2019t publish. Open the builder and press Save.');
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/builder?new=1');
  };

  // ── Computed ──
  const selectedCategory = CATEGORIES.find(c => c.id === categoryId);
  const filteredCategories = categorySearch
    ? CATEGORIES.filter(c => c.label.toLowerCase().includes(categorySearch.toLowerCase()))
    : CATEGORIES;
  const canGoStep2 = name.trim().length > 0 && slugState === 'free';
  const slugColor = slugState === 'free' ? '#22C55E'
    : slugState === 'taken' || slugState === 'error' ? '#EF4444' : '#858585';

  // ── STYLES ────────────────────────────────────────────────────────────────
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-poppins), system-ui, sans-serif',
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
    border: '1.5px solid #EBEBEA',
    borderRadius: 16,
    padding: '14px 16px',
    fontSize: 15,
    color: '#0A0A0A',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-poppins), system-ui, sans-serif',
  };
  const primaryBtn: React.CSSProperties = {
    width: '100%',
    background: '#7C3AED',
    color: '#FFFFFF',
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
    fontFamily: 'var(--font-poppins), system-ui, sans-serif',
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
        <p style={{ fontSize: 13, color: '#858585', fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
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

        <StepBar step={step} total={TOTAL_STEPS} />

        {/* ── STEP 1: Find on Google ──────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 1 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
              fontSize: 38, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 8,
            }}>
              Find your<br />business
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 28, lineHeight: 1.5 }}>
              Search Google to auto-fill your name, address, hours, and more.
            </p>

            {/* Search input */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <svg
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ABABAB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Emma's Coffee Franklin TN"
                  value={placeQuery}
                  onChange={e => onPlaceInput(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 44 }}
                />
              </div>

              {/* Suggestions */}
              {placeSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', border: '1.5px solid #EBEBEA',
                  borderRadius: 16, marginTop: 6, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 10,
                }}>
                  {placeSuggestions.map(place => (
                    <button
                      key={place.id}
                      onClick={() => void selectPlace(place)}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none',
                        background: 'none', cursor: 'pointer', textAlign: 'left',
                        display: 'flex', flexDirection: 'column', gap: 2,
                        borderBottom: '1px solid #EEEEEC',
                        fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{place.name}</span>
                      <span style={{ fontSize: 12, color: '#858585' }}>{place.address}</span>
                    </button>
                  ))}
                </div>
              )}

              {placeLoading && (
                <p style={{ fontSize: 12, color: '#858585', marginTop: 8 }}>Searching…</p>
              )}
              {detailsLoading && (
                <p style={{ fontSize: 12, color: '#858585', marginTop: 8 }}>Loading business info…</p>
              )}
            </div>

            {/* Selected place preview */}
            {selectedPlace && !detailsLoading && (
              <div style={{
                marginTop: 16,
                padding: '16px',
                background: '#fff',
                border: '1.5px solid #0A0A0A',
                borderRadius: 18,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: '#F0F0EE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#555" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{placeDetails?.name || selectedPlace.name}</p>
                    <p style={{ fontSize: 12, color: '#858585', margin: '2px 0 0' }}>{placeDetails?.address || selectedPlace.address}</p>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: '#22C55E',
                    background: 'rgba(34,197,94,0.10)', borderRadius: 99,
                    padding: '3px 8px', flexShrink: 0,
                  }}>
                    ✓ Found
                  </div>
                </div>

                {/* Info chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {placeDetails?.phone && (
                    <span style={{ fontSize: 11, color: '#555', background: '#F0F0EE', borderRadius: 99, padding: '4px 10px' }}>
                      📞 {placeDetails.phone}
                    </span>
                  )}
                  {placeDetails?.website && (
                    <span style={{ fontSize: 11, color: '#555', background: '#F0F0EE', borderRadius: 99, padding: '4px 10px' }}>
                      🌐 Website imported
                    </span>
                  )}
                  {placeDetails?.hours && (
                    <span style={{ fontSize: 11, color: '#555', background: '#F0F0EE', borderRadius: 99, padding: '4px 10px' }}>
                      🕐 Hours imported
                    </span>
                  )}
                  {placeDetails?.rating && placeDetails.rating > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 99, padding: '4px 10px' }}>
                      ⭐ {placeDetails.rating}
                      {placeDetails.reviewCount ? ` · ${placeDetails.reviewCount.toLocaleString()} reviews` : ''}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={confirmPlace}
                disabled={!selectedPlace || detailsLoading}
                style={{ ...primaryBtn, opacity: (!selectedPlace || detailsLoading) ? 0.35 : 1 }}
              >
                <span>Looks good — continue</span>
                <span>→</span>
              </button>
              <button
                onClick={skipGoogle}
                style={{
                  background: 'none', border: 'none', fontSize: 13,
                  color: '#858585', cursor: 'pointer', padding: '8px 0',
                  fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                }}
              >
                My business isn&apos;t on Google Maps →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Confirm name + URL ────────────────────────────────── */}
        {step === 2 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 2 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
              fontSize: 38, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 8,
            }}>
              {selectedPlace ? 'Confirm your\nbusiness name' : "What's your\nbusiness called?"}
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 32, lineHeight: 1.5 }}>
              {selectedPlace ? 'This is your public name — edit it if needed.' : 'This is your public name. You can change it later.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                autoFocus
                type="text"
                placeholder="Sunrise Coffee Co."
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ ...inputStyle, fontSize: 18, fontWeight: 600 }}
                onKeyDown={e => e.key === 'Enter' && canGoStep2 && void saveStep2()}
              />

              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #EBEBEA', borderRadius: 16,
                background: '#fff', overflow: 'hidden',
              }}>
                <span style={{ padding: '14px 4px 14px 16px', fontSize: 14, color: '#858585', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  openstatus.co/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => { setSlugEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, HANDLE_MAX)); }}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 14, fontWeight: 600, color: '#0A0A0A',
                    padding: '14px 8px', background: 'transparent',
                    fontFamily: 'var(--font-poppins), system-ui, sans-serif', minWidth: 0,
                  }}
                />
                <span style={{ padding: '0 14px', fontSize: 10, fontWeight: 700, color: slugColor, flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {slugState === 'checking' ? '...' : slugState === 'free' ? '✓' : slugState === 'taken' ? 'taken' : slugState === 'error' ? '!' : ''}
                </span>
              </div>
              {slugReason && slugState !== 'free' && (
                <p style={{ marginTop: 8, fontSize: 12.5, color: '#EF4444' }}>{slugReason}</p>
              )}
            </div>

            {error && <p style={{ marginTop: 12, fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <button
              onClick={() => void saveStep2()}
              disabled={saving || !canGoStep2}
              style={{ ...primaryBtn, marginTop: 32, opacity: (!canGoStep2 || saving) ? 0.35 : 1 }}
            >
              <span>Continue</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ── STEP 3: Category ──────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 3 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
              fontSize: 38, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 8,
            }}>
              What type of<br />business is it?
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 24, lineHeight: 1.5 }}>
              This sets up the right links and layout for your page.
            </p>

            <input
              type="text"
              placeholder="Search…"
              value={categorySearch}
              onChange={e => setCategorySearch(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 32 }}>
              {filteredCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 16,
                    border: `1.5px solid ${categoryId === cat.id ? '#0A0A0A' : '#EBEBEA'}`,
                    background: categoryId === cat.id ? '#0A0A0A' : '#fff',
                    color: categoryId === cat.id ? '#F7F7F5' : '#0A0A0A',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    textAlign: 'left', transition: 'all 0.12s ease',
                    fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                  }}
                >
                  <CategoryIcon id={cat.id} active={categoryId === cat.id}/>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={saveStep3}
              disabled={!categoryId}
              style={{ ...primaryBtn, opacity: !categoryId ? 0.35 : 1 }}
            >
              <span>Continue</span>
              <span>→</span>
            </button>
          </div>
        )}

        {/* ── STEP 4: Tags + Finish ──────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#858585', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              Step 4 of {TOTAL_STEPS}
            </p>
            <h1 style={{
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
              fontSize: 38, fontWeight: 800, color: '#0A0A0A',
              letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 8,
            }}>
              Describe what<br />you offer
            </h1>
            <p style={{ fontSize: 14, color: '#858585', marginBottom: 20, lineHeight: 1.5 }}>
              Add short tags customers will see on your page. Type one and press Enter.
            </p>

            {/* Tag input */}
            <div style={{
              display: 'flex', alignItems: 'center',
              border: '1.5px solid #EBEBEA', borderRadius: 16,
              background: '#fff', padding: '4px 8px 4px 16px',
              marginBottom: 12, flexWrap: 'wrap', gap: 6,
            }}>
              {selectedTags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#7C3AED', color: '#FFFFFF',
                  borderRadius: 99, padding: '5px 10px',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                }}>
                  {tag}
                  <button
                    onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                    style={{ background: 'none', border: 'none', color: 'rgba(247,247,245,0.6)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1, fontFamily: 'inherit' }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={selectedTags.length === 0 ? 'e.g. Outdoor seating' : 'Add another...'}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                    e.preventDefault();
                    const val = tagInput.trim().replace(/,$/, '');
                    if (val && !selectedTags.includes(val) && selectedTags.length < 8) {
                      setSelectedTags(prev => [...prev, val]);
                    }
                    setTagInput('');
                  }
                  if (e.key === 'Backspace' && !tagInput && selectedTags.length > 0) {
                    setSelectedTags(prev => prev.slice(0, -1));
                  }
                }}
                style={{
                  flex: 1, minWidth: 120, border: 'none', outline: 'none',
                  fontSize: 14, color: '#0A0A0A', padding: '8px 4px',
                  background: 'transparent', fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                }}
              />
            </div>

            {/* Suggestions */}
            {selectedCategory && selectedCategory.tags.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: '#ABABAB', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Examples
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 32 }}>
                  {selectedCategory.tags.filter(t => !selectedTags.includes(t)).map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!selectedTags.includes(tag) && selectedTags.length < 8) {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                      }}
                      style={{
                        padding: '7px 13px', borderRadius: 99,
                        border: '1.5px solid #EBEBEA', background: '#fff',
                        color: '#555', fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p style={{ marginBottom: 16, fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: selectedCategory && selectedCategory.tags.length > 0 ? 0 : 32 }}>
              <button
                onClick={() => void finish()}
                disabled={saving}
                style={{ ...primaryBtn, opacity: saving ? 0.5 : 1 }}
              >
                <span>{saving ? 'Setting up your page…' : 'Open my builder'}</span>
                {!saving && <span>→</span>}
              </button>
              {selectedTags.length === 0 && (
                <button
                  onClick={() => void finish()}
                  disabled={saving}
                  style={{
                    background: 'none', border: 'none', fontSize: 13,
                    color: '#858585', cursor: 'pointer', padding: '8px 0',
                    fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                  }}
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              marginTop: 32,
              background: 'none', border: 'none',
              fontSize: 13, color: '#ABABAB',
              cursor: 'pointer', padding: '8px 0',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-poppins), system-ui, sans-serif',
            }}
          >
            <span>←</span> Back
          </button>
        )}
      </div>
    </main>
  );
}
