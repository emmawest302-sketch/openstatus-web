'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SocialLinksEditor from '@/components/social-links-editor';
import BusinessBrandAssets from '@/components/business-brand-assets';
import {
  defaultOpenStatusBlocks,
  normalizeOpenStatusPageConfig,
  type OpenStatusBlock,
  type OpenStatusPageConfig,
  type OpenStatusSocial,
} from '@/lib/openstatus-page-config';

type Business = {
  id: string;
  name: string;
  tagline: string | null;
  slug: string | null;
  avatar_url: string | null;
  header_url: string | null;
};

type ProviderOption = {
  id: string;
  label: string;
  ph: string;
  title: string;
  sub: string;
  blockId: string;
};

type CategoryDef = {
  id: string;
  label: string;
  desc: string;
  providers: ProviderOption[] | null;
};

const CATEGORIES: CategoryDef[] = [
  {
    id: 'order',
    label: 'Order food',
    desc: 'Delivery, pickup & online ordering',
    providers: [
      { id: 'doordash', label: 'DoorDash', ph: 'doordash.com/store/your-restaurant', title: 'Order on DoorDash', sub: 'Delivery & pickup', blockId: 'order-doordash' },
      { id: 'ubereats', label: 'Uber Eats', ph: 'ubereats.com/store/...', title: 'Order on Uber Eats', sub: 'Delivery & pickup', blockId: 'order-ubereats' },
      { id: 'grubhub', label: 'Grubhub', ph: 'grubhub.com/restaurant/...', title: 'Order on Grubhub', sub: 'Delivery & pickup', blockId: 'order-grubhub' },
      { id: 'square', label: 'Square', ph: 'squareup.com/store/your-business', title: 'Order online', sub: 'Pickup or delivery', blockId: 'order-square' },
      { id: 'toast', label: 'Toast', ph: 'order.toasttab.com/...', title: 'Order on Toast', sub: 'Online ordering', blockId: 'order-toast' },
      { id: 'other', label: 'Other', ph: 'https://...', title: 'Order online', sub: 'Order from us', blockId: 'order' },
    ],
  },
  {
    id: 'menu',
    label: 'Menu',
    desc: 'Show customers what you serve',
    providers: null,
  },
  {
    id: 'book',
    label: 'Book',
    desc: 'Appointments, reservations & scheduling',
    providers: [
      { id: 'calendly', label: 'Calendly', ph: 'calendly.com/your-business', title: 'Book a time', sub: 'Schedule online', blockId: 'book-calendly' },
      { id: 'square', label: 'Square Appointments', ph: 'squareup.com/appointments/...', title: 'Book an appointment', sub: 'Schedule with us', blockId: 'book-square' },
      { id: 'opentable', label: 'OpenTable', ph: 'opentable.com/...', title: 'Reserve a table', sub: 'Make a reservation', blockId: 'book-opentable' },
      { id: 'other', label: 'Other', ph: 'https://...', title: 'Book now', sub: 'Reserve your spot', blockId: 'book' },
    ],
  },
  {
    id: 'shop',
    label: 'Shop',
    desc: 'Link to your online store',
    providers: [
      { id: 'shopify', label: 'Shopify', ph: 'your-store.myshopify.com', title: 'Shop online', sub: 'Browse our store', blockId: 'shop-shopify' },
      { id: 'square', label: 'Square Online', ph: 'squareup.com/store/...', title: 'Shop online', sub: 'Browse our store', blockId: 'shop-square' },
      { id: 'other', label: 'Other', ph: 'https://...', title: 'Shop online', sub: 'Browse our store', blockId: 'shop' },
    ],
  },
  {
    id: 'connect',
    label: 'Connect',
    desc: 'Phone, email, website or directions',
    providers: [
      { id: 'call', label: 'Phone call', ph: 'tel:+16155551234', title: 'Call us', sub: 'Tap to call', blockId: 'call' },
      { id: 'email', label: 'Email', ph: 'mailto:hello@yourbusiness.com', title: 'Email us', sub: 'Send a message', blockId: 'email' },
      { id: 'website', label: 'Website', ph: 'yourbusiness.com', title: 'Website', sub: 'Visit our site', blockId: 'website' },
      { id: 'directions', label: 'Directions', ph: '123 Main St, Franklin, TN', title: 'Directions', sub: 'Open in maps', blockId: 'map' },
    ],
  },
  {
    id: 'more',
    label: 'More',
    desc: 'Gift cards, events, careers & custom links',
    providers: [
      { id: 'gift-cards', label: 'Gift Cards', ph: 'https://...', title: 'Gift Cards', sub: 'Give the gift of us', blockId: 'gift-cards' },
      { id: 'catering', label: 'Catering', ph: 'https://...', title: 'Catering', sub: 'Large orders & events', blockId: 'catering' },
      { id: 'events', label: 'Events', ph: 'https://...', title: 'Events', sub: "See what's coming up", blockId: 'events' },
      { id: 'careers', label: 'Careers', ph: 'https://...', title: 'Careers', sub: 'Join our team', blockId: 'careers' },
      { id: 'custom', label: 'Custom link', ph: 'https://...', title: '', sub: '', blockId: 'custom' },
    ],
  },
];

const URL_PLACEHOLDERS: Record<string, string> = {
  order: 'squareup.com/store/your-business',
  menu: 'yourbusiness.com/menu',
  map: '123 Main St, Franklin, TN',
  book: 'calendly.com/your-business',
  website: 'yourbusiness.com',
  call: 'tel:+16155551234',
  email: 'mailto:hello@yourbusiness.com',
};

function GripIcon() {
  return (
    <svg viewBox="0 0 16 24" width="12" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="5" r="1.5" />
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="4" cy="19" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon({ id }: { id: string }) {
  const paths: Record<string, string> = {
    order: 'M7 8h10l-1 11H8L7 8zm2-3h6l1 3H8l1-3z',
    menu: 'M6 7h12M6 12h12M6 17h12',
    book: 'M7 4v3M17 4v3M5 9h14M6 6h12a1 1 0 011 1v12H5V7a1 1 0 011-1z',
    shop: 'M6 2l-1 4h14l-1-4H6zM5 6v14h14V6H5z',
    connect: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  };
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path d={paths[id] ?? paths.more} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BlockIcon({ id }: { id: string }) {
  const base = id.split('-')[0];
  const paths: Record<string, string> = {
    order: 'M7 8h10l-1 11H8L7 8zm2-3h6l1 3H8l1-3z',
    menu: 'M6 7h12M6 12h12M6 17h12',
    book: 'M7 4v3M17 4v3M5 9h14M6 6h12a1 1 0 011 1v12H5V7a1 1 0 011-1z',
    website: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.2 2.5 3.3 5.5 3.3 9S14.2 18.5 12 21m0-18C9.8 5.5 8.7 8.5 8.7 12s1.1 6.5 3.3 9M3.5 12h17',
    call: 'M7 4l3 4-2 2c1.5 3 3 4.5 6 6l2-2 4 3-2 3c-1 1-3 .5-5-.5C8 17 5 14 3.5 9 3 7 3 5.5 4 5l3-1z',
    email: 'M4 6h16v12H4V6zm0 1l8 6 8-6',
    map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
    shop: 'M6 2l-1 4h14l-1-4H6zM5 6v14h14V6H5z',
    gift: 'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
    catering: 'M3 11l19-9-9 19-2-8-8-2z',
    events: 'M8 6V4M16 6V4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
    careers: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    custom: 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d={paths[base] ?? 'M5 12h14M14 7l5 5-5 5'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 100 100" width="27" height="27">
      <circle cx="50" cy="50" r="48" />
      <circle cx="50" cy="50" r="21" fill="#F7F7F3" />
      <circle cx="50" cy="44" r="7.4" />
      <path d="M45.2 50.2h9.6l2.2 16.3H43z" />
    </svg>
  );
}

const socialMark = (label: string) =>
  ({ Instagram: 'IG', Facebook: 'f', TikTok: 'TT', YouTube: 'YT', LinkedIn: 'in', Pinterest: 'P', X: 'X', Threads: '@' } as Record<string, string>)[label] || label.slice(0, 2);

export default function BuilderClient() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [blocks, setBlocks] = useState<OpenStatusBlock[]>(defaultOpenStatusBlocks);
  const [bg, setBg] = useState('warm');
  const [socials, setSocials] = useState<OpenStatusSocial[]>([]);
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Add Link multi-step flow
  const [addStep, setAddStep] = useState<'category' | 'provider' | 'url' | null>(null);
  const [addCat, setAddCat] = useState<CategoryDef | null>(null);
  const [addProv, setAddProv] = useState<ProviderOption | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addSub, setAddSub] = useState('');
  const [addUrl, setAddUrl] = useState('');

  const closeAddModal = () => {
    setAddStep(null);
    setAddCat(null);
    setAddProv(null);
    setAddTitle('');
    setAddSub('');
    setAddUrl('');
  };

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace('/login'); return; }
      const c = normalizeOpenStatusPageConfig(u.user.user_metadata?.openstatus_page);
      setBlocks(c.blocks);
      setBg(c.bg);
      setSocials(c.socials);
      setLocation(c.location ?? '');
      setTags(c.tags ?? []);
      const { data: b } = await supabase.from('businesses').select('id,name,tagline,slug,avatar_url,header_url').eq('user_id', u.user.id).maybeSingle();
      if (!b) { router.replace('/setup'); return; }
      setBusiness(b);
      setLoading(false);
    })();
  }, [router]);

  const dirty = () => setSaved(false);
  const reorder = (a: string, z: string) => {
    if (a === z) return;
    setBlocks(v => {
      const x = v.findIndex(b => b.id === a), y = v.findIndex(b => b.id === z);
      if (x < 0 || y < 0) return v;
      const n = [...v];
      const [m] = n.splice(x, 1);
      n.splice(y, 0, m);
      return n;
    });
    dirty();
  };
  const toggle = (id: string) => { setBlocks(v => v.map(b => b.id === id ? { ...b, on: !b.on } : b)); dirty(); };
  const edit = (id: string, k: 'title' | 'sub' | 'url', value: string) => { setBlocks(v => v.map(b => b.id === id ? { ...b, [k]: value } : b)); dirty(); };
  const remove = (id: string) => { setBlocks(v => v.filter(b => b.id !== id)); dirty(); };

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, '');
    if (!t || tags.length >= 5 || tags.some(x => x.toLowerCase() === t.toLowerCase())) return;
    setTags(v => [...v, t]);
    setTagDraft('');
    dirty();
  };

  const pickCategory = (cat: CategoryDef) => {
    setAddCat(cat);
    if (cat.providers === null) {
      setAddTitle(cat.id === 'menu' ? 'Menu' : cat.label);
      setAddSub(cat.id === 'menu' ? 'See our menu' : '');
      setAddStep('url');
    } else {
      setAddStep('provider');
    }
  };

  const pickProvider = (prov: ProviderOption) => {
    setAddProv(prov);
    setAddTitle(prov.title);
    setAddSub(prov.sub);
    setAddUrl('');
    setAddStep('url');
  };

  const confirmAdd = () => {
    const blockId = addProv?.blockId ?? addCat?.id ?? 'custom';
    let id = blockId, n = 2;
    while (blocks.some(b => b.id === id)) id = `${blockId}-${n++}`;
    setBlocks(v => [...v, { id, title: addTitle, sub: addSub, icon: '', on: true, tone: 'glass', url: addUrl }]);
    closeAddModal();
    dirty();
  };

  const save = async () => {
    setSaving(true);
    setError('');
    const config: OpenStatusPageConfig = { blocks, bg, socials, location: location.trim(), tags };
    const { error: e } = await supabase.auth.updateUser({ data: { openstatus_page: config } });
    setSaving(false);
    if (e) { setError(e.message); return; }
    setSaved(true);
  };

  const asset = (k: 'avatar' | 'header', v: string | null | undefined) =>
    v?.startsWith('storage:') ? `/api/assets?businessId=${business?.id}&kind=${k}&v=${encodeURIComponent(v)}` : v || '';
  const logo = asset('avatar', business?.avatar_url);
  const cover = asset('header', business?.header_url);
  const initials = business?.name?.split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'OS';

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#F5F3ED]">Loading your page builder…</main>;

  return (
    <main className="min-h-screen bg-[#F5F3ED] text-[#101010]" style={{ fontFamily: 'var(--font-poppins)' }}>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#F5F3ED]/90 backdrop-blur-2xl">
        <div className="mx-auto flex w-[min(96%,1440px)] flex-wrap items-center gap-3 py-3 sm:flex-nowrap sm:justify-between sm:py-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-bold"><Mark /><span>OpenStatus</span></Link>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            {business?.slug
              ? <Link href={`/${business.slug}`} target="_blank" className="whitespace-nowrap rounded-full border border-black/10 bg-white/70 px-3 py-2 text-[11px] font-semibold sm:px-4 sm:py-2.5 sm:text-xs">View live</Link>
              : null}
            <Link href="/dashboard" className="hidden whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold sm:inline-flex sm:px-4 sm:py-2.5 sm:text-xs">Dashboard</Link>
            <button onClick={save} disabled={saving} className="whitespace-nowrap rounded-full bg-black px-3.5 py-2.5 text-[11px] font-bold text-white disabled:opacity-40 sm:px-5 sm:py-3 sm:text-xs">
              {saving ? 'Publishing…' : saved ? 'Published' : 'Publish changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="mx-auto grid w-[min(96%,1440px)] gap-5 py-5 lg:grid-cols-[220px_minmax(420px,1fr)_420px]">

        {/* Left nav */}
        <aside className="rounded-[28px] bg-white/65 p-4">
          <span className="text-[9px] font-bold tracking-[.14em] text-black/35">PAGE BUILDER</span>
          <nav className="mt-4 space-y-1">
            <div className="rounded-[16px] bg-black px-3 py-3 text-sm font-semibold text-white">Edit profile</div>
            <Link href="/dashboard" className="block rounded-[16px] px-3 py-3 text-sm font-semibold">Status</Link>
            <Link href="/analytics" className="block rounded-[16px] px-3 py-3 text-sm font-semibold">Analytics</Link>
            <Link href="/settings" className="block rounded-[16px] px-3 py-3 text-sm font-semibold">Settings</Link>
          </nav>
        </aside>

        {/* Editor */}
        <section className="rounded-[30px] border border-black/8 bg-white/55 p-5 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[9px] font-bold tracking-[.14em] text-black/35">EDIT PROFILE</span>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-.055em]">Make it yours.</h1>
            </div>
            <button onClick={() => setAddStep('category')} className="rounded-full bg-black px-5 py-3 text-xs font-bold text-white">
              Add link
            </button>
          </div>

          {business
            ? <div className="mt-7">
              <BusinessBrandAssets
                business={business}
                onChange={next => { setBusiness(c => c ? { ...c, avatar_url: next.avatar_url, header_url: next.header_url } : c); dirty(); }}
              />
            </div>
            : null}

          {/* Profile details */}
          <div className="mt-4 rounded-[24px] bg-[#F5F3ED] p-4">
            <strong className="text-sm">Profile details</strong>
            <label className="mt-3 block text-[9px] font-bold uppercase tracking-[.1em] text-black/35">
              Location
              <input
                value={location}
                onChange={e => { setLocation(e.target.value); dirty(); }}
                placeholder="Franklin, Tennessee"
                className="mt-1 w-full rounded-[14px] border border-black/8 bg-white px-3 py-3 text-xs font-normal normal-case tracking-normal"
              />
            </label>
            <div className="mt-3">
              <span className="text-[9px] font-bold uppercase tracking-[.1em] text-black/35">Tags · up to 5</span>
              <div className="mt-2 flex gap-2">
                <input
                  value={tagDraft}
                  onChange={e => setTagDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Coffee, Breakfast, Dog Friendly…"
                  className="min-w-0 flex-1 rounded-[14px] border border-black/8 bg-white px-3 py-3 text-xs"
                />
                <button onClick={addTag} className="rounded-[14px] bg-black px-4 text-xs font-bold text-white">Add</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <button key={t} onClick={() => { setTags(v => v.filter(x => x !== t)); dirty(); }}
                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold">
                    {t}
                    <XIcon size={10} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Blocks */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              <strong className="text-sm">Links & actions</strong>
              <p className="text-xs text-black/40">Drag to reorder. Tap to edit.</p>
            </div>
            <button onClick={() => setAddStep('category')} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold">
              Add link
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {blocks.map(b => (
              <div
                key={b.id}
                data-block-id={b.id}
                onDragOver={e => e.preventDefault()}
                onDragEnter={() => { if (draggedId) reorder(draggedId, b.id); }}
                className={`rounded-[22px] border border-black/8 bg-white p-4 transition ${!b.on ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    draggable
                    onDragStart={() => setDraggedId(b.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className="cursor-grab text-black/20 hover:text-black/50 active:cursor-grabbing"
                  >
                    <GripIcon />
                  </button>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#F2EFE8] text-black/50">
                    <BlockIcon id={b.id} />
                  </div>
                  <strong className="flex-1 truncate text-sm">{b.title}</strong>
                  <button
                    onClick={() => toggle(b.id)}
                    className={`rounded-full px-3 py-2 text-[9px] font-bold transition ${b.on ? 'bg-[#C8FF62]/65' : 'bg-black/5'}`}
                  >
                    {b.on ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => remove(b.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-black/35 transition hover:bg-black/10 hover:text-black/60"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input value={b.title} onChange={e => edit(b.id, 'title', e.target.value)} placeholder="Button title" className="rounded-[14px] bg-[#F5F3ED] px-3 py-2.5 text-xs" />
                  <input value={b.sub} onChange={e => edit(b.id, 'sub', e.target.value)} placeholder="Subtitle" className="rounded-[14px] bg-[#F5F3ED] px-3 py-2.5 text-xs" />
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={b.url || ''}
                    onChange={e => edit(b.id, 'url', e.target.value)}
                    placeholder={URL_PLACEHOLDERS[b.id.split('-')[0]] || 'https://...'}
                    className="min-w-0 flex-1 rounded-[14px] border border-black/8 bg-white px-3 py-3 text-xs"
                  />
                  <span className={`grid min-w-16 place-items-center rounded-[14px] px-3 text-[9px] font-bold ${b.url?.trim() ? 'bg-[#C8FF62]/55' : 'bg-black/5 text-black/35'}`}>
                    {b.url?.trim() ? 'LINKED' : 'ADD URL'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <SocialLinksEditor socials={socials} onChange={n => { setSocials(n); dirty(); }} />
          {error ? <p className="mt-4 rounded-[14px] bg-[#F8AE9D]/55 p-3 text-xs">{error}</p> : null}
        </section>

        {/* Live preview */}
        <aside className="rounded-[30px] bg-[#E8E4DA] p-5">
          <div className="mb-3 flex justify-between text-[9px] font-bold tracking-[.13em] text-black/35">
            <span>LIVE PREVIEW</span>
            <span>Mobile</span>
          </div>
          <div className="relative mx-auto min-h-[700px] max-w-[360px] overflow-hidden rounded-[42px] border-[8px] border-black bg-[#333] shadow-[0_28px_70px_rgba(0,0,0,.22)]">
            {cover
              ? <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              : <div className={`absolute inset-0 ${bg === 'warm' ? 'bg-[#E8D5BF]' : bg === 'blue' ? 'bg-[#CBD9FF]' : bg === 'lime' ? 'bg-[#DFFFA8]' : 'bg-[#333]'}`} />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/45" />
            <div className="relative px-3 pb-5 pt-14 text-white">
              <div className="text-center">
                {logo
                  ? <img src={logo} alt="" className="mx-auto h-20 w-20 rounded-full border-4 border-white bg-white object-cover shadow-xl" />
                  : <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white font-bold text-black">{initials}</div>}
                <strong className="mt-3 block text-2xl">{business?.name}</strong>
                {location ? <span className="mt-1 block text-[11px] text-white/85">{location}</span> : null}
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {tags.map(t => <span key={t} className="rounded-full border border-white/25 bg-black/20 px-2 py-1 text-[8px]">{t}</span>)}
                </div>
              </div>
              <div className="mt-5 rounded-[20px] border border-white/50 bg-white/70 p-3 text-black backdrop-blur-xl">
                <span className="text-[8px] font-bold text-[#2E7D5B]">LIVE STATUS</span>
                <strong className="mt-1 block text-xl">Open now</strong>
                <span className="text-[10px] text-black/45">Closes at 4:00 PM</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {blocks.filter(b => b.on).map(b => (
                  <div key={b.id} className={`${b.id === 'website' || b.id.startsWith('map') ? 'col-span-2' : ''} rounded-[18px] border border-white/50 bg-white/65 p-3 text-black backdrop-blur-xl`}>
                    <strong className="block text-xs">{b.title}</strong>
                    <span className="text-[9px] opacity-45">{b.sub}</span>
                  </div>
                ))}
              </div>
              {socials.some(s => s.on && s.url) && (
                <div className="mt-3 flex justify-center gap-2">
                  {socials.filter(s => s.on && s.url).map(s => (
                    <span key={s.id} className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-[9px] font-bold text-black">{socialMark(s.label)}</span>
                  ))}
                </div>
              )}
              <div className="mt-4 text-center text-[8px] tracking-[.13em] text-white/50">POWERED BY OPENSTATUS</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Add Link Modal */}
      {addStep && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={closeAddModal}
        >
          <div
            className="w-full max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[#F8F7F2] shadow-2xl sm:max-w-lg sm:rounded-[32px]"
            onMouseDown={e => e.stopPropagation()}
          >

            {/* Step 1: Category */}
            {addStep === 'category' && (
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-bold tracking-[.14em] text-black/35">ADD TO YOUR PAGE</span>
                    <h2 className="mt-2 text-[28px] font-semibold tracking-[-.04em]">What do you want to add?</h2>
                  </div>
                  <button onClick={closeAddModal} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8 text-black/50 hover:bg-black/12 transition">
                    <XIcon />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => pickCategory(cat)}
                      className="flex flex-col gap-1.5 rounded-[20px] border border-black/8 bg-white p-3 text-left transition hover:shadow-md active:scale-[.98]"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#F0EDE6] text-black/55">
                        <CategoryIcon id={cat.id} />
                      </span>
                      <span className="text-sm font-semibold">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Provider */}
            {addStep === 'provider' && addCat && (
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => setAddStep('category')}
                      className="mb-2 text-[10px] font-semibold text-black/40 transition hover:text-black/70"
                    >
                      ← Back
                    </button>
                    <h2 className="text-[28px] font-semibold tracking-[-.04em]">{addCat.label}</h2>
                    <p className="mt-1 text-sm text-black/45">Where should customers go?</p>
                  </div>
                  <button onClick={closeAddModal} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8 text-black/50 hover:bg-black/12 transition">
                    <XIcon />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {addCat.providers?.map(prov => (
                    <button
                      key={prov.id}
                      onClick={() => pickProvider(prov)}
                      className="flex w-full items-center justify-between rounded-[18px] border border-black/8 bg-white px-4 py-4 text-left transition hover:shadow-md active:scale-[.99]"
                    >
                      <span className="text-sm font-semibold">{prov.label}</span>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" className="text-black/25">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: URL */}
            {addStep === 'url' && (
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => addCat?.providers ? setAddStep('provider') : setAddStep('category')}
                      className="mb-2 text-[10px] font-semibold text-black/40 transition hover:text-black/70"
                    >
                      ← Back
                    </button>
                    <h2 className="text-[28px] font-semibold tracking-[-.04em]">{addProv?.label ?? addCat?.label}</h2>
                    <p className="mt-1 text-sm text-black/45">Paste the link customers should open.</p>
                  </div>
                  <button onClick={closeAddModal} className="flex h-9 w-9 items-center justify-center rounded-full bg-black/8 text-black/50 hover:bg-black/12 transition">
                    <XIcon />
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[.1em] text-black/35">Button title</label>
                    <input
                      value={addTitle}
                      onChange={e => setAddTitle(e.target.value)}
                      placeholder="Order on DoorDash"
                      className="mt-1.5 w-full rounded-[14px] border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/25"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[.1em] text-black/35">
                      Subtitle <span className="normal-case font-normal text-black/25">(optional)</span>
                    </label>
                    <input
                      value={addSub}
                      onChange={e => setAddSub(e.target.value)}
                      placeholder="Delivery & pickup"
                      className="mt-1.5 w-full rounded-[14px] border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/25"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-[.1em] text-black/35">Destination</label>
                    <input
                      value={addUrl}
                      onChange={e => setAddUrl(e.target.value)}
                      placeholder={addProv?.ph ?? 'https://...'}
                      className="mt-1.5 w-full rounded-[14px] border border-black/10 bg-white px-4 py-3 font-mono text-xs outline-none focus:border-black/25"
                    />
                  </div>
                </div>
                <button
                  onClick={confirmAdd}
                  disabled={!addTitle.trim()}
                  className="mt-4 w-full rounded-[16px] bg-black py-3.5 text-sm font-bold text-white transition disabled:opacity-30"
                >
                  Add to page
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </main>
  );
}
