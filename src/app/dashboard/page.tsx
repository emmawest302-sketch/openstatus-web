'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type WeeklyKey = 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';
interface DayHours { open: string; close: string; closed: boolean; }
type WeeklyHours = Record<WeeklyKey, DayHours>;

interface Business {
  id: string;
  name: string;
  tagline: string | null;
  slug: string | null;
  avatar_url: string | null;
  header_url: string | null;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  google_location_id: string | null;
  onboarded_at: string | null;
}

interface AnalyticsSummary {
  pageViews: number;
  directions: number;
  menuTaps: number;
  linkClicks: number;
  followers: number;
}

interface ActivityRow {
  id: string;
  type: 'hours'|'google'|'link'|'photo'|'status';
  label: string;
  detail: string;
  time: string;
}

const FONT = "'Poppins', system-ui, sans-serif";
const BG = '#F6F7F9';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const TEXT = '#111111';
const TEXT2 = '#667085';
const TEXT3 = '#98A2B3';
const GREEN = '#12B76A';

const WEEK_KEYS: WeeklyKey[] = ['sun','mon','tue','wed','thu','fri','sat'];
const DAY_LABELS: Record<WeeklyKey,string> = {sun:'Sunday',mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday'};

function getTodayKey(): WeeklyKey { return WEEK_KEYS[new Date().getDay()]; }

function getGreeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const emoji = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
  const short = name.split(' ')[0];
  return `Good ${time}, ${short} ${emoji}`;
}

function fmt12(t: string) {
  const [h,m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function isOpenNow(hours: WeeklyHours | null): boolean {
  if (!hours) return false;
  const key = getTodayKey();
  const day = hours[key];
  if (!day || day.closed) return false;
  const now = new Date();
  const [oh,om] = day.open.split(':').map(Number);
  const [ch,cm] = day.close.split(':').map(Number);
  const mins = now.getHours()*60+now.getMinutes();
  return mins >= oh*60+om && mins < ch*60+cm;
}

// ─── Icon components ─────────────────────────────────────────────────────────
function IconHome() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconChart() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function IconEdit() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>; }
function IconSettings() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function IconLink() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function IconExternalLink() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function IconClock() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconLightbulb() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>; }
function IconMapPin() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>; }
function IconPhone() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.52 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.55a16 16 0 0 0 6.63 6.63l1.21-1.21a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function IconGlobe() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function IconTag() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>; }
function IconShare() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>; }
function IconBolt() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }

function GoogleLogo({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// Tiny sparkline using SVG
function Sparkline({ color, trend }: { color: string; trend: 'up'|'flat' }) {
  const up = [40,35,38,30,28,22,15,10];
  const flat = [25,28,22,30,25,27,24,26];
  const pts = (trend === 'up' ? up : flat);
  const max = Math.max(...pts), min = Math.min(...pts);
  const w=48, h=20;
  const coords = pts.map((v,i)=>`${Math.round(i/(pts.length-1)*w)},${Math.round(h-(v-min)/(max-min||1)*h)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={coords} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BusinessDashboard() {
  const router = useRouter();
  const [biz, setBiz] = useState<Business|null>(null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours|null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeNav, setActiveNav] = useState<'business'|'analytics'|'edit'|'settings'>('business');

  // Load data
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace('/login'); return; }

      const { data: b } = await supabase
        .from('businesses')
        .select('id,name,tagline,slug,avatar_url,header_url,category,phone,website,address,google_location_id,onboarded_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!b) { router.replace('/setup'); return; }
      setBiz(b);
      setGoogleConnected(!!b.google_location_id);

      // Load hours from user metadata first, then DB
      const meta = session.user.user_metadata?.openstatus_page;
      if (meta?.weeklyHours) {
        setWeeklyHours(meta.weeklyHours as WeeklyHours);
      } else {
        const { data: dbHours } = await supabase
          .from('business_hours')
          .select('day_of_week,opens_at,closes_at,is_closed')
          .eq('business_id', b.id);
        if (dbHours?.length) {
          const wh = {} as WeeklyHours;
          WEEK_KEYS.forEach((key, i) => {
            const row = dbHours.find((r: {day_of_week:number}) => r.day_of_week === i) as {opens_at:string|null;closes_at:string|null;is_closed:boolean}|undefined;
            wh[key] = row && !row.is_closed
              ? { open: (row.opens_at||'09:00').slice(0,5), close: (row.closes_at||'17:00').slice(0,5), closed: false }
              : { open: '09:00', close: '17:00', closed: true };
          });
          setWeeklyHours(wh);
        }
      }
    })();
  }, [router]);

  const copyLink = useCallback(async () => {
    if (!biz?.slug) return;
    await navigator.clipboard.writeText(`https://openstatus.co/${biz.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [biz?.slug]);

  if (!biz) {
    return (
      <div style={{ fontFamily: FONT, minHeight: '100vh', background: BG, display: 'grid', placeItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <svg viewBox="0 0 100 100" width="28" height="28">
            <circle cx="50" cy="50" r="48" fill="#0A0A0A"/>
            <circle cx="50" cy="50" r="21" fill={BG}/>
            <circle cx="50" cy="44" r="7.4" fill="#0A0A0A"/>
            <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#0A0A0A"/>
          </svg>
          <p style={{ fontSize: 13, color: TEXT3 }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const todayKey = getTodayKey();
  const todayHours = weeklyHours?.[todayKey];
  const open = isOpenNow(weeklyHours);
  const todayLabel = todayHours && !todayHours.closed
    ? `Today ${fmt12(todayHours.open)} – ${fmt12(todayHours.close)}`
    : 'Closed today';

  // Mock analytics (replace with real fetch)
  const analytics: AnalyticsSummary = { pageViews: 1284, directions: 347, menuTaps: 196, linkClicks: 421, followers: 89 };
  const activity: ActivityRow[] = [
    { id:'1', type:'hours', label:'Hours updated', detail:`Changed hours to ${fmt12('07:00')} – ${fmt12('17:00')}`, time:'2 hours ago' },
    { id:'2', type:'google', label:'Google Business synced', detail:'Your business info and photos are up to date', time:'3 hours ago' },
    { id:'3', type:'link', label:'Link shared', detail:'Your OpenStatus link was copied', time:'1 day ago' },
    { id:'4', type:'photo', label:'New photo imported', detail:'Added 3 photos from Google Business', time:'2 days ago' },
  ];

  const initials = biz.name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();

  // ─── SIDEBAR ─────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', background: CARD, borderRight: `1px solid ${BORDER}`, height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '18px 20px 0', flexShrink: 0 }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em', color: TEXT }}>OpenStatus</span>
      </div>
      <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {([
          { key: 'business', label: 'Business', icon: <IconHome/>, href: '/dashboard' },
          { key: 'analytics', label: 'Analytics', icon: <IconChart/>, href: '/analytics' },
          { key: 'edit', label: 'Edit Page', icon: <IconEdit/>, href: '/builder' },
        ] as const).map(({ key, label, icon, href }) => (
          <a key={key} href={href}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none',
              background: key === 'business' ? '#F2F4F7' : 'transparent',
              color: key === 'business' ? TEXT : TEXT2,
              transition: 'background 0.15s',
            }}
          >
            <span style={{ color: key === 'business' ? TEXT : TEXT3 }}>{icon}</span>
            {label}
          </a>
        ))}
      </nav>
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <a href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>
          <span style={{ color: TEXT3 }}><IconSettings/></span> Settings
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginTop: 4, borderRadius: 10, background: BG, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8EBF0', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: TEXT, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{biz.name}</div>
            <div style={{ fontSize: 10, color: TEXT3 }}>Business account</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </aside>
  );

  // ─── OPEN STATUS CARD ────────────────────────────────────────────────────
  const OpenStatusCard = () => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: open ? GREEN : '#D1D5DB', flexShrink: 0, boxShadow: open ? `0 0 0 3px rgba(18,183,106,0.15)` : 'none' }}/>
            <span style={{ fontSize: 28, fontWeight: 700, color: TEXT, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {open ? 'Open now' : 'Closed'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: TEXT2, marginLeft: 18 }}>{todayLabel}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: TEXT3, background: BG, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '3px 10px', flexShrink: 0 }}>Regular hours</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {(['Close early', 'Closed today', 'Edit hours'] as const).map((label) => (
          <a key={label} href="/builder?tab=hours"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: TEXT, textDecoration: 'none', textAlign: 'center', cursor: 'pointer' }}>
            {label}
          </a>
        ))}
      </div>
    </div>
  );

  // ─── GOOGLE BUSINESS CARD ────────────────────────────────────────────────
  const GoogleCard = () => (
    <div style={{ background: googleConnected ? '#F0FDF4' : CARD, border: `1px solid ${googleConnected ? '#BBF7D0' : BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GoogleLogo size={16}/>
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Google Business</span>
        </div>
        <a href="/connect/google" style={{ fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '5px 12px', background: CARD }}>Manage</a>
      </div>
      {googleConnected ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', background: '#BBF7D0', borderRadius: 999, padding: '2px 10px' }}>Connected</span>
            <span style={{ fontSize: 11, color: TEXT3 }}>Last synced 3 min ago</span>
          </div>
          {[['Hours synced', true], ['Photos synced', true]].map(([label]) => (
            <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#BBF7D0"/><polyline points="8 12 11 15 16 9" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ fontSize: 13, color: TEXT }}>{label as string}</span>
            </div>
          ))}
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: TEXT2, marginBottom: 14 }}>Connect your business to sync hours and information to Google.</p>
          <button onClick={() => { window.location.href = '/connect/google'; }}
            style={{ width: '100%', padding: '10px', background: TEXT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Connect Google Business
          </button>
        </>
      )}
    </div>
  );

  // ─── LINK CARD ───────────────────────────────────────────────────────────
  const LinkCard = () => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: TEXT3 }}><IconLink/></span>
        <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Your OpenStatus link</span>
      </div>
      {biz.slug && (
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2563EB', marginBottom: 16 }}>
          openstatus.co/{biz.slug}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copyLink} style={{ flex: 1, padding: '9px', background: copied ? '#DCFCE7' : TEXT, color: copied ? '#166534' : '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        {biz.slug && (
          <a href={`/${biz.slug}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: TEXT, textDecoration: 'none' }}>
            View live <IconExternalLink/>
          </a>
        )}
      </div>
    </div>
  );

  // ─── BUSINESS DETAILS CARD ───────────────────────────────────────────────
  const BusinessDetailsCard = () => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: TEXT3 }}><IconTag/></span>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Business details</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {biz.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TEXT3 }}><IconTag/></span>
                <span style={{ fontSize: 13, color: TEXT }}>{biz.category}</span>
              </div>
            )}
            {biz.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TEXT3 }}><IconMapPin/></span>
                <span style={{ fontSize: 13, color: TEXT }}>{biz.address}</span>
              </div>
            )}
            {biz.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TEXT3 }}><IconPhone/></span>
                <span style={{ fontSize: 13, color: TEXT }}>{biz.phone}</span>
              </div>
            )}
            {biz.website && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: TEXT3 }}><IconGlobe/></span>
                <a href={biz.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none' }}>
                  {biz.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {!biz.category && !biz.address && !biz.phone && !biz.website && (
              <div style={{ fontSize: 13, color: TEXT3 }}>No details added yet.</div>
            )}
          </div>
        </div>
        {biz.header_url && (
          <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            <img src={`/api/assets?businessId=${biz.id}&kind=header`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
        )}
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
        <a href="/settings" style={{ fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>Edit business info →</a>
      </div>
    </div>
  );

  // ─── QUICK ACTIONS ───────────────────────────────────────────────────────
  const QuickActions = () => (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ color: TEXT3 }}><IconBolt/></span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Quick actions</div>
          <div style={{ fontSize: 12, color: TEXT2 }}>Common tasks to keep your page up to date.</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {([
          { label: 'Update status', sub: 'Open, close, or add hours', bg: '#F0FDF4', dot: GREEN, href: '/builder?tab=hours' },
          { label: 'Add special hours', sub: 'Holidays or events', bg: '#EFF6FF', dot: '#3B82F6', href: '/builder?tab=hours' },
          { label: 'Import photos', sub: 'Sync from Google', bg: '#F5F3FF', dot: '#8B5CF6', href: '/builder?tab=photos' },
        ] as const).map(({ label, sub, bg, dot, href }) => (
          <a key={label} href={href}
            style={{ display: 'block', padding: '14px', background: bg, borderRadius: 14, textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }}/>
              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
            </div>
            <div style={{ fontSize: 11, color: TEXT2 }}>{sub}</div>
          </a>
        ))}
      </div>
    </div>
  );

  // ─── ANALYTICS SUMMARY ───────────────────────────────────────────────────
  const AnalyticsSummary = () => {
    const metrics = [
      { label: 'Page views', value: analytics.pageViews.toLocaleString(), pct: '+12%', color: '#10B981', spark: 'up' as const },
      { label: 'Directions', value: analytics.directions.toLocaleString(), pct: '+28%', color: '#3B82F6', spark: 'up' as const },
      { label: 'Menu taps', value: analytics.menuTaps.toLocaleString(), pct: '+6%', color: '#8B5CF6', spark: 'up' as const },
      { label: 'Link clicks', value: analytics.linkClicks.toLocaleString(), pct: '+18%', color: '#F59E0B', spark: 'up' as const },
      { label: 'Followers', value: analytics.followers.toLocaleString(), pct: '+32%', color: '#EC4899', spark: 'up' as const },
    ];
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: TEXT3 }}><IconChart/></span>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Analytics</span>
            <span style={{ fontSize: 11, color: TEXT3, background: BG, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '2px 8px' }}>Last 30 days</span>
          </div>
          <a href="/analytics" style={{ fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>View full analytics →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {metrics.map(({ label, value, pct, color, spark }) => (
            <div key={label} style={{ padding: '14px', background: BG, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: TEXT3, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6 }}>{value}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}</span>
                <Sparkline color={color} trend={spark}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── MOBILE ANALYTICS ────────────────────────────────────────────────────
  const MobileAnalytics = () => {
    const metrics = [
      { label: 'Page views', value: analytics.pageViews.toLocaleString(), pct: '+12%', color: '#10B981' },
      { label: 'Directions', value: analytics.directions.toLocaleString(), pct: '+28%', color: '#3B82F6' },
      { label: 'Menu', value: analytics.menuTaps.toLocaleString(), pct: '+6%', color: '#8B5CF6' },
      { label: 'Links', value: analytics.linkClicks.toLocaleString(), pct: '+18%', color: '#F59E0B' },
    ];
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: TEXT3 }}><IconChart/></span>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Analytics</span>
            <span style={{ fontSize: 10, color: TEXT3 }}>Last 30 days</span>
          </div>
          <a href="/analytics" style={{ fontSize: 11, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>View all →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {metrics.map(({ label, value, pct, color }) => (
            <div key={label} style={{ padding: '10px 8px', background: BG, borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: TEXT3, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color, marginTop: 3 }}>{pct}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── RECENT ACTIVITY ─────────────────────────────────────────────────────
  const RecentActivity = () => {
    const icons: Record<ActivityRow['type'], React.ReactNode> = {
      hours: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={GREEN} strokeWidth="2"/><polyline points="12 6 12 12 16 14" stroke={GREEN} strokeWidth="2" strokeLinecap="round"/></svg>,
      google: <GoogleLogo size={14}/>,
      link: <IconLink/>,
      photo: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
      status: <div style={{ width:8, height:8, borderRadius:'50%', background: GREEN }}/>,
    };
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: TEXT3 }}><IconClock/></span>
            <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>Recent activity</span>
          </div>
          <a href="#" style={{ fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>See all activity →</a>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activity.map((row, i) => (
            <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: i < activity.length - 1 ? `1px solid ${BG}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: BG, display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
                {icons[row.type]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{row.label}</div>
                <div style={{ fontSize: 12, color: TEXT2 }}>{row.detail}</div>
              </div>
              <div style={{ fontSize: 11, color: TEXT3, flexShrink: 0, paddingTop: 2 }}>{row.time}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── TIPS CARD ───────────────────────────────────────────────────────────
  const TipsCard = () => (
    <div style={{ background: '#F0FDF4', border: `1px solid #BBF7D0`, borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: GREEN }}><IconLightbulb/></span>
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Tips for success</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: i===0?16:6, height: 6, borderRadius: 999, background: i===0 ? GREEN : '#BBF7D0' }}/>)}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Add more photos</div>
      <div style={{ fontSize: 12, color: TEXT2, marginBottom: 14, lineHeight: 1.6 }}>
        Businesses with more photos get significantly more views. Keep your page fresh with new images.
      </div>
      <a href="/builder?tab=photos"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#166534', textDecoration: 'none', background: '#BBF7D0', padding: '7px 14px', borderRadius: 8 }}>
        Import photos
      </a>
    </div>
  );

  // ─── MOBILE BOTTOM NAV ───────────────────────────────────────────────────
  const MobileNav = () => (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, display: 'flex', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {([
        { key: 'business' as const, label: 'Business', icon: <IconHome/>, href: '/dashboard' },
        { key: 'analytics' as const, label: 'Analytics', icon: <IconChart/>, href: '/analytics' },
        { key: 'edit' as const, label: 'Edit Page', icon: <IconEdit/>, href: '/builder' },
        { key: 'settings' as const, label: 'Settings', icon: <IconSettings/>, href: '/settings' },
      ]).map(({ key, label, icon, href }) => {
        const isActive = key === 'business';
        return (
          <a key={key} href={href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0', textDecoration: 'none', gap: 4 }}>
            <div style={{
              padding: '4px 12px', borderRadius: 8,
              background: isActive ? '#F0FDF4' : 'transparent',
              color: isActive ? GREEN : TEXT3,
            }}>{icon}</div>
            <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? GREEN : TEXT3 }}>{label}</span>
          </a>
        );
      })}
    </nav>
  );

  // ─── DESKTOP RENDER ──────────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ fontFamily: FONT, minHeight: '100vh', background: BG, display: 'flex' }}>
        <Sidebar/>
        <main style={{ flex: 1, minWidth: 0, padding: '32px 32px 48px', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 30, fontWeight: 700, color: TEXT, letterSpacing: '-0.04em', margin: 0, lineHeight: 1.2 }}>{getGreeting(biz.name)}</h1>
              <p style={{ fontSize: 14, color: TEXT2, marginTop: 6, margin: '6px 0 0' }}>Here&apos;s what&apos;s happening with your business today.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {biz.slug && (
                <a href={`/${biz.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>
                  <IconExternalLink/> View live
                </a>
              )}
              <button onClick={copyLink}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: TEXT2, cursor: 'pointer' }}>
                <IconShare/> {copied ? 'Copied!' : 'Share'}
              </button>
              <a href="/builder"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: TEXT, border: `1px solid ${TEXT}`, borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                Edit Page <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          </div>

          {/* Row 1: Status + Google */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <OpenStatusCard/>
            <GoogleCard/>
          </div>

          {/* Row 2: Link + Business details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <LinkCard/>
            <BusinessDetailsCard/>
          </div>

          {/* Row 3: Quick actions */}
          <div style={{ marginBottom: 14 }}>
            <QuickActions/>
          </div>

          {/* Row 4: Analytics */}
          <div style={{ marginBottom: 14 }}>
            <AnalyticsSummary/>
          </div>

          {/* Row 5: Activity + Tips */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <RecentActivity/>
            <TipsCard/>
          </div>
        </main>
      </div>
    );
  }

  // ─── MOBILE RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: FONT, minHeight: '100vh', background: BG, paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      {/* Mobile header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT3, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>OpenStatus</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{biz.name}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        {biz.slug && (
          <a href={`/${biz.slug}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>
            <IconExternalLink/> View live
          </a>
        )}
      </div>

      {/* Mobile content */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: open ? GREEN : '#D1D5DB', boxShadow: open ? `0 0 0 3px rgba(18,183,106,0.15)` : 'none' }}/>
              <span style={{ fontSize: 24, fontWeight: 700, color: TEXT, letterSpacing: '-0.04em', lineHeight: 1 }}>{open ? 'Open now' : 'Closed'}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: TEXT3, background: BG, border: `1px solid ${BORDER}`, borderRadius: 999, padding: '2px 8px' }}>Regular hours</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT2, marginBottom: 12 }}>{todayLabel}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Close early', 'Closed today', 'Edit hours'] as const).map(label => (
              <a key={label} href="/builder?tab=hours"
                style={{ flex: 1, padding: '8px 4px', background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 11, fontWeight: 600, color: TEXT, textDecoration: 'none', textAlign: 'center' }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Google card mobile */}
        <div style={{ background: googleConnected ? '#F0FDF4' : CARD, border: `1px solid ${googleConnected ? '#BBF7D0' : BORDER}`, borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GoogleLogo size={14}/>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Google Business</span>
            </div>
            <a href="/connect/google" style={{ fontSize: 11, fontWeight: 600, color: TEXT2, textDecoration: 'none', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '4px 10px', background: CARD }}>Manage</a>
          </div>
          {googleConnected ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: '#BBF7D0', borderRadius: 999, padding: '2px 8px' }}>Connected</span>
                <span style={{ fontSize: 11, color: TEXT3 }}>Last synced 3 min ago</span>
              </div>
              {['Hours synced', 'Photos synced'].map(label => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#BBF7D0"/><polyline points="8 12 11 15 16 9" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize: 12, color: TEXT }}>{label}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: TEXT2, marginBottom: 12 }}>Connect to sync hours and info to Google.</p>
              <button onClick={() => { window.location.href = '/connect/google'; }}
                style={{ width: '100%', padding: '9px', background: TEXT, color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Connect Google Business
              </button>
            </>
          )}
        </div>

        {/* Link card mobile */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: TEXT3 }}><IconLink/></span>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Your OpenStatus link</span>
          </div>
          {biz.slug && <div style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', marginBottom: 12 }}>openstatus.co/{biz.slug}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copyLink} style={{ flex: 1, padding: '9px', background: copied ? '#DCFCE7' : TEXT, color: copied ? '#166534' : '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            {biz.slug && (
              <a href={`/${biz.slug}`} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: TEXT, textDecoration: 'none' }}>
                View live
              </a>
            )}
          </div>
        </div>

        {/* Business details mobile */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Business details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {biz.category && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: TEXT3 }}><IconTag/></span><span style={{ fontSize: 12, color: TEXT }}>{biz.category}</span></div>}
                {biz.address && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: TEXT3 }}><IconMapPin/></span><span style={{ fontSize: 12, color: TEXT }}>{biz.address}</span></div>}
                {biz.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: TEXT3 }}><IconPhone/></span><span style={{ fontSize: 12, color: TEXT }}>{biz.phone}</span></div>}
                {biz.website && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: TEXT3 }}><IconGlobe/></span><a href={biz.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>{biz.website.replace(/^https?:\/\//,'')}</a></div>}
              </div>
            </div>
            {biz.header_url && <div style={{ width: 60, height: 60, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><img src={`/api/assets?businessId=${biz.id}&kind=header`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/></div>}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
            <a href="/settings" style={{ fontSize: 12, fontWeight: 600, color: TEXT2, textDecoration: 'none' }}>Edit business info →</a>
          </div>
        </div>

        {/* Analytics mobile */}
        <MobileAnalytics/>

        {/* Activity mobile */}
        <RecentActivity/>

        {/* Tips mobile */}
        <TipsCard/>
      </div>

      <MobileNav/>
    </div>
  );
}
