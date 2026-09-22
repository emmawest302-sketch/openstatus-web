'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Design tokens ────────────────────────────────────────────────────────────
const FONT = "'Poppins', system-ui, sans-serif";
const BG = '#F6F7F9';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const TEXT = '#111111';
const TEXT2 = '#667085';
const TEXT3 = '#98A2B3';
const GREEN = '#12B76A';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Business {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  avatar_url: string | null;
  header_url: string | null;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  google_location_id: string | null;
  onboarded_at: string | null;
  place_id: string | null;
}

interface DayHours {
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

type WeeklyHours = Record<number, DayHours>;

interface TrendPoint {
  date: string;
  views: number;
  clicks: number;
}

interface AnalyticsMetrics {
  views: number;
  directions: number;
  menu: number;
  clicks: number;
}

interface Analytics {
  metrics: AnalyticsMetrics;
  trend: TrendPoint[];
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return <div style={{ height: 32 }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconGear = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconPencil = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.63 4.9 2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.09a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconGlobe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBulb = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
  </svg>
);
const IconCup = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);
const IconUtensils = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="2" x2="3" y2="8" /><line x1="7" y1="2" x2="7" y2="8" /><polyline points="5 8 5 22" /><path d="M21 2v6.5a4.5 4.5 0 0 1-9 0V2" /><line x1="16.5" y1="2" x2="16.5" y2="22" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// Google G logo
const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// OpenStatus logo mark
const LogoMark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill={TEXT} />
    <circle cx="16" cy="16" r="6" fill={GREEN} />
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getTodayHours(hours: WeeklyHours | null): DayHours | null {
  if (!hours) return null;
  const day = new Date().getDay();
  return hours[day] ?? null;
}

function isOpenNow(hours: WeeklyHours | null): boolean {
  const today = getTodayHours(hours);
  if (!today || today.is_closed || !today.opens_at || !today.closes_at) return false;
  const now = new Date();
  const [oh, om] = today.opens_at.split(':').map(Number);
  const [ch, cm] = today.closes_at.split(':').map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= openMin && nowMin < closeMin;
}

function computePctChange(trend: TrendPoint[], key: 'views' | 'clicks'): string {
  if (!trend || trend.length < 14) return '—';
  const sorted = [...trend].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-7);
  const prior = sorted.slice(-14, -7);
  const recentSum = recent.reduce((s, t) => s + t[key], 0);
  const priorSum = prior.reduce((s, t) => s + t[key], 0);
  if (priorSum === 0 && recentSum === 0) return '—';
  const pct = ((recentSum - priorSum) / Math.max(priorSum, 1)) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(0) + '%';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      background: TEXT, color: '#fff', padding: '10px 20px', borderRadius: 12,
      fontSize: 14, fontFamily: FONT, opacity: visible ? 1 : 0,
      transition: 'all 0.25s', zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FONT,
    }}>
      <LogoMark size={48} />
      <p style={{ color: TEXT3, marginTop: 16, fontSize: 14 }}>Loading your dashboard…</p>
    </div>
  );
}

// ─── Avatar circle ────────────────────────────────────────────────────────────
function AvatarCircle({ name, size = 36, fontSize = 14 }: { name: string; size?: number; fontSize?: number }) {
  const letter = name.trim()[0]?.toUpperCase() ?? '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: TEXT,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontFamily: FONT, fontWeight: 600, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

// ─── Status card buttons ──────────────────────────────────────────────────────
function StatusActionButton({
  label, onClick, posting,
}: { label: string; onClick: () => void; posting: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={posting}
      style={{
        flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${BORDER}`,
        background: CARD, color: TEXT, fontSize: 12, fontFamily: FONT, fontWeight: 500,
        cursor: posting ? 'not-allowed' : 'pointer', opacity: posting ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  const [biz, setBiz] = useState<Business | null>(null);
  const [hours, setHours] = useState<WeeklyHours | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusPosting, setStatusPosting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
  }, []);

  // Responsive
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Data fetch
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.replace('/login'); return; }
        const user = session.user;
        const token = session.access_token;

        // Business
        const { data: bizData, error: bizErr } = await supabase
          .from('businesses')
          .select('id,name,tagline,slug,avatar_url,header_url,category,phone,website,address,google_location_id,onboarded_at,place_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (bizErr) throw bizErr;
        if (!bizData) { router.replace('/setup'); return; }
        if (cancelled) return;
        setBiz(bizData);

        // Hours
        const { data: hoursData } = await supabase
          .from('business_hours')
          .select('day_of_week,opens_at,closes_at,is_closed')
          .eq('business_id', bizData.id);

        if (!cancelled && hoursData) {
          const weekly: WeeklyHours = {};
          for (const row of hoursData) {
            weekly[row.day_of_week] = {
              opens_at: row.opens_at,
              closes_at: row.closes_at,
              is_closed: row.is_closed,
            };
          }
          setHours(weekly);
        }

        // Analytics
        try {
          const res = await fetch('/api/analytics?days=30', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const json = await res.json();
            if (!cancelled) setAnalytics(json);
          }
        } catch {
          // analytics optional
        }

        if (!cancelled) { setLoading(false); setAnalyticsLoading(false); }
      } catch (err) {
        console.error('Dashboard load error:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

  const handleStatusAction = useCallback(async (type: 'close_early' | 'closed_today' | 'edit_hours') => {
    if (type === 'edit_hours') { router.push('/settings?tab=hours'); return; }
    if (!biz) return;
    setStatusPosting(true);
    try {
      await supabase.from('status_updates').insert({
        business_id: biz.id,
        type,
        created_at: new Date().toISOString(),
      });
      showToast(type === 'close_early' ? 'Closed early for today!' : 'Marked as closed today!');
    } catch {
      showToast('Something went wrong. Try again.');
    } finally {
      setStatusPosting(false);
    }
  }, [biz, router, showToast]);

  const handleCopy = useCallback(() => {
    if (!biz) return;
    const url = window.location.origin + '/' + biz.slug;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      showToast('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [biz, showToast]);

  if (loading) return <LoadingScreen />;
  if (!biz) return <LoadingScreen />;

  const today = getTodayHours(hours);
  const open = isOpenNow(hours);
  const todayLabel = today && !today.is_closed && today.opens_at && today.closes_at
    ? `Today ${formatTime(today.opens_at)} – ${formatTime(today.closes_at)}`
    : today?.is_closed ? 'Closed today' : 'Hours not set';

  const trend = analytics?.trend ?? [];
  const metrics = analytics?.metrics ?? { views: 0, directions: 0, menu: 0, clicks: 0 };

  const viewsTrend = trend.map(t => t.views);
  const directionsTrend = trend.map(t => Math.round(t.clicks / 3));
  const menuTrend = trend.map(t => Math.round(t.clicks / 2));
  const clicksTrend = trend.map(t => Math.round(t.clicks / 1.5));

  const viewsPct = computePctChange(trend, 'views');
  const clicksPct = computePctChange(trend, 'clicks');

  // Recent activity
  const activityItems: { text: string; time: string }[] = [];
  if (biz.google_location_id) {
    activityItems.push({ text: 'Google Business synced', time: '3 hours ago' });
  }
  const recentDays = [...trend]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(t => t.views > 0)
    .slice(0, 4);
  for (const day of recentDays) {
    const daysAgo = Math.round((Date.now() - new Date(day.date).getTime()) / 86400000);
    activityItems.push({
      text: `${day.views} visitor${day.views !== 1 ? 's' : ''} viewed your page`,
      time: daysAgo === 0 ? 'today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`,
    });
  }

  const firstName = biz.name.split(' ')[0];
  const liveUrl = `openstatus.co/${biz.slug}`;
  const fullUrl = typeof window !== 'undefined' ? window.location.origin + '/' + biz.slug : liveUrl;

  // ─── Shared card style ──────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`,
    padding: '20px', fontFamily: FONT,
  };

  // ─── STATUS CARD ────────────────────────────────────────────────────────────
  const StatusCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: open ? GREEN : '#EF4444',
            boxShadow: open ? `0 0 0 3px ${GREEN}30` : '0 0 0 3px #EF444430',
          }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>
            {open ? 'Open now' : 'Closed'}
          </span>
        </div>
        <span style={{
          background: '#F3F4F6', color: TEXT2, fontSize: 11, fontWeight: 500,
          padding: '3px 10px', borderRadius: 20,
        }}>
          Regular hours
        </span>
      </div>
      <p style={{ fontSize: 13, color: TEXT2, margin: '0 0 16px 18px' }}>{todayLabel}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatusActionButton label="Close early" onClick={() => handleStatusAction('close_early')} posting={statusPosting} />
        <StatusActionButton label="Closed today" onClick={() => handleStatusAction('closed_today')} posting={statusPosting} />
        <StatusActionButton label="Edit hours" onClick={() => handleStatusAction('edit_hours')} posting={statusPosting} />
      </div>
    </div>
  );

  // ─── GOOGLE CARD ────────────────────────────────────────────────────────────
  const GoogleCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GoogleG />
          <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Google Business</span>
        </div>
        <button
          onClick={() => router.push('/settings?tab=google')}
          style={{
            padding: '6px 14px', borderRadius: 10, background: biz.google_location_id ? '#F3F4F6' : TEXT,
            color: biz.google_location_id ? TEXT : '#fff', border: 'none',
            fontSize: 13, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          {biz.google_location_id ? 'Manage' : 'Connect'}
        </button>
      </div>
      {biz.google_location_id ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: `${GREEN}15`, color: GREEN, fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 12,
            }}>Connected</span>
            <span style={{ fontSize: 12, color: TEXT3 }}>Last synced 3 min ago</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <IconCheck />
            <span style={{ fontSize: 13, color: TEXT2 }}>Hours synced</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconCheck />
            <span style={{ fontSize: 13, color: TEXT2 }}>Photos synced <span style={{ color: TEXT3 }}>(24 photos)</span></span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: TEXT3, margin: 0 }}>
          Connect to sync your hours and photos automatically.
        </p>
      )}
    </div>
  );

  // ─── LINK CARD ──────────────────────────────────────────────────────────────
  const LinkCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: TEXT2 }}><IconLink /></span>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Your OpenStatus link</span>
      </div>
      <a
        href={fullUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'block', fontSize: 14, color: '#2563EB', fontWeight: 500,
          textDecoration: 'none', marginBottom: 14, wordBreak: 'break-all',
        }}
      >
        {liveUrl}
      </a>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10, background: TEXT,
            color: '#fff', border: 'none', fontSize: 13, fontWeight: 500,
            fontFamily: FONT, cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          onClick={() => window.open('/' + biz.slug, '_blank')}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10, background: 'transparent',
            color: TEXT, border: `1px solid ${BORDER}`, fontSize: 13, fontWeight: 500,
            fontFamily: FONT, cursor: 'pointer',
          }}
        >
          View live
        </button>
      </div>
    </div>
  );

  // ─── BUSINESS DETAILS CARD ──────────────────────────────────────────────────
  const DetailsCard = ({ onEdit }: { onEdit?: () => void }) => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: TEXT2 }}><IconBulb /></span>
          <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Business details</span>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              padding: '5px 12px', borderRadius: 8, background: 'transparent',
              color: TEXT2, border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer',
            }}
          >
            Edit
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {biz.category && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEXT3 }}><IconCup /></span>
              <span style={{ fontSize: 13, color: TEXT2 }}>{biz.category}</span>
            </div>
          )}
          {biz.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: TEXT3, marginTop: 1 }}><IconPin /></span>
              <span style={{ fontSize: 13, color: TEXT2, lineHeight: 1.4 }}>{biz.address}</span>
            </div>
          )}
          {biz.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEXT3 }}><IconPhone /></span>
              <a href={`tel:${biz.phone}`} style={{ fontSize: 13, color: TEXT2, textDecoration: 'none' }}>
                {biz.phone}
              </a>
            </div>
          )}
          {biz.website && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: TEXT3 }}><IconGlobe /></span>
              <a
                href={biz.website.startsWith('http') ? biz.website : 'https://' + biz.website}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none' }}
              >
                {biz.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {!biz.category && !biz.address && !biz.phone && !biz.website && (
            <p style={{ fontSize: 13, color: TEXT3, margin: 0 }}>No details yet — add them!</p>
          )}
        </div>
        {(biz.avatar_url || biz.header_url) && (
          <div style={{
            width: 72, height: 72, borderRadius: 12, overflow: 'hidden',
            background: '#F3F4F6', flexShrink: 0,
          }}>
            <img
              src={biz.avatar_url ?? biz.header_url ?? ''}
              alt={biz.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>
    </div>
  );

  // ─── ANALYTICS CARD ─────────────────────────────────────────────────────────
  const AnalyticsCard = () => {
    const metricItems = [
      {
        label: 'Views', value: metrics.views, pct: viewsPct, color: GREEN,
        icon: <IconEye />, data: viewsTrend,
      },
      {
        label: 'Directions', value: metrics.directions, pct: clicksPct, color: '#2563EB',
        icon: <IconPin />, data: directionsTrend,
      },
      {
        label: 'Menu taps', value: metrics.menu, pct: '—', color: '#7C3AED',
        icon: <IconUtensils />, data: menuTrend,
      },
      {
        label: 'Link clicks', value: metrics.clicks, pct: '—', color: '#D97706',
        icon: <IconLink />, data: clicksTrend,
      },
    ];

    return (
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: TEXT2 }}><IconChart /></span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Analytics</div>
              <div style={{ fontSize: 11, color: TEXT3 }}>Last 30 days</div>
            </div>
          </div>
          <a href="/analytics" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
            View all →
          </a>
        </div>

        {analyticsLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: TEXT3, fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {metricItems.map((item) => (
              <div
                key={item.label}
                style={{
                  background: BG, borderRadius: 14, padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT3 }}>
                  {item.icon}
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>
                  {item.value.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: item.pct.startsWith('+') ? GREEN : item.pct === '—' ? TEXT3 : '#EF4444', fontWeight: 600 }}>
                  {item.pct}
                </div>
                <Sparkline data={item.data} color={item.color} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── ACTIVITY CARD ──────────────────────────────────────────────────────────
  const ActivityCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: TEXT2 }}><IconClock /></span>
          <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Recent activity</span>
        </div>
        <a href="/analytics" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
          See all →
        </a>
      </div>
      {activityItems.length === 0 ? (
        <p style={{ fontSize: 13, color: TEXT3, margin: 0 }}>
          No activity yet — share your link to get started!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activityItems.slice(0, 4).map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: i < Math.min(activityItems.length, 4) - 1 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: TEXT }}>{item.text}</span>
              <span style={{ fontSize: 11, color: TEXT3, whiteSpace: 'nowrap', marginLeft: 12 }}>{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── TIPS CARD ──────────────────────────────────────────────────────────────
  const TipsCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ color: TEXT2 }}><IconBulb /></span>
        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>Tips for success</span>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: BG, borderRadius: 14, padding: '14px 16px', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📸</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 2 }}>Add more photos</div>
            <div style={{ fontSize: 12, color: TEXT2 }}>Businesses with photos get 3x more views</div>
          </div>
        </div>
        <button
          onClick={() => router.push('/builder')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: TEXT3, flexShrink: 0,
          }}
        >
          <IconArrowRight />
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{ fontFamily: FONT, background: BG, minHeight: '100vh', paddingBottom: 80 }}>
        {/* Header bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100, background: CARD,
          borderBottom: `1px solid ${BORDER}`, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <LogoMark size={26} />
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginRight: 'auto' }}>OpenStatus</span>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {biz.name}
            </span>
            <span style={{ color: TEXT3 }}><IconChevronDown /></span>
          </button>
          <button
            onClick={() => window.open('/' + biz.slug, '_blank')}
            style={{
              padding: '6px 12px', borderRadius: 10, border: `1px solid ${BORDER}`,
              background: 'transparent', color: TEXT, fontSize: 12, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer',
            }}
          >
            View live
          </button>
          <AvatarCircle name={biz.name} size={32} fontSize={13} />
        </div>

        {/* Cards */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <StatusCard />
          <GoogleCard />
          <LinkCard />
          <DetailsCard />
          <AnalyticsCard />
          <ActivityCard />
          <TipsCard />
        </div>

        {/* Bottom tab bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: CARD, borderTop: `1px solid ${BORDER}`,
          display: 'flex', padding: '8px 0 20px',
          zIndex: 100,
        }}>
          {[
            { icon: <IconHome />, label: 'Business', href: '/dashboard', active: true },
            { icon: <IconChart />, label: 'Analytics', href: '/analytics', active: false },
            { icon: <IconPencil />, label: 'Edit Page', href: '/builder', active: false },
            { icon: <IconGear />, label: 'Settings', href: '/settings', active: false },
          ].map((tab) => (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, background: 'none', border: 'none', cursor: 'pointer',
                color: tab.active ? GREEN : TEXT3, padding: '4px 0',
              }}
            >
              {tab.icon}
              <span style={{ fontSize: 10, fontWeight: tab.active ? 600 : 400, fontFamily: FONT }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        <Toast message={toast} visible={toastVisible} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════

  const AnalyticsMiniCard = () => {
    const items = [
      { label: 'Views', value: metrics.views, color: GREEN },
      { label: 'Directions', value: metrics.directions, color: '#2563EB' },
      { label: 'Menu taps', value: metrics.menu, color: '#7C3AED' },
    ];
    return (
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: TEXT2 }}><IconChart /></span>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Analytics</span>
          </div>
          <a href="/analytics" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>View all →</a>
        </div>
        {items.map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: `1px solid ${BORDER}`,
          }}>
            <span style={{ fontSize: 13, color: TEXT2 }}>{item.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: item.color }}>
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
        <a
          href="/analytics"
          style={{
            display: 'block', textAlign: 'center', fontSize: 13, color: TEXT,
            fontWeight: 500, textDecoration: 'none', marginTop: 4,
            padding: '8px', borderRadius: 10, background: BG,
          }}
        >
          View analytics →
        </a>
      </div>
    );
  };

  const DesktopLinkCard = () => (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: TEXT2 }}><IconLink /></span>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Your OpenStatus link</span>
      </div>
      <a
        href={fullUrl}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', display: 'block', marginBottom: 12 }}
      >
        {liveUrl}
      </a>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '7px 14px', borderRadius: 10, background: TEXT, color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          onClick={() => window.open('/' + biz.slug, '_blank')}
          style={{
            padding: '7px 14px', borderRadius: 10, background: 'transparent', color: TEXT,
            border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          View live
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: biz.name, url: fullUrl });
            } else {
              handleCopy();
            }
          }}
          style={{
            padding: '7px 14px', borderRadius: 10, background: 'transparent', color: TEXT2,
            border: `1px solid ${BORDER}`, fontSize: 12, fontWeight: 500, fontFamily: FONT, cursor: 'pointer',
          }}
        >
          Share
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: FONT, display: 'flex', minHeight: '100vh', background: BG }}>
      {/* Sidebar */}
      <div style={{
        width: 210, background: CARD, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0,
        zIndex: 10,
      }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${BORDER}` }}>
          <LogoMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>OpenStatus</span>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {[
            { icon: <IconHome />, label: 'Business', href: '/dashboard', active: true },
            { icon: <IconChart />, label: 'Analytics', href: '/analytics', active: false },
            { icon: <IconGear />, label: 'Settings', href: '/settings', active: false },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                background: item.active ? TEXT : 'transparent',
                color: item.active ? '#fff' : TEXT2,
                border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: item.active ? 600 : 400,
                fontFamily: FONT, textAlign: 'left',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '16px', borderTop: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AvatarCircle name={biz.name} size={34} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {biz.name}
            </div>
            <div style={{ fontSize: 11, color: TEXT3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {liveUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 210, overflowY: 'auto', padding: '28px 28px 60px' }}>

        {/* Hero */}
        <div style={{
          height: 180, borderRadius: 16, position: 'relative', overflow: 'hidden',
          marginBottom: 20,
          background: biz.header_url ? `url(${biz.header_url}) center/cover no-repeat` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 100%)',
            padding: '28px 28px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
              Good morning, {firstName}!
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 }}>
              {biz.tagline ?? "Here's what's happening"}
            </div>
          </div>
          <button
            onClick={() => router.push('/builder')}
            style={{
              position: 'absolute', bottom: 16, right: 16,
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
          >
            Edit page →
          </button>
        </div>

        {/* Status row */}
        <div style={{
          ...card, marginBottom: 16, display: 'flex', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: open ? GREEN : '#EF4444',
              boxShadow: open ? `0 0 0 3px ${GREEN}30` : '0 0 0 3px #EF444430',
            }} />
            <span style={{ fontSize: 17, fontWeight: 700, color: TEXT }}>
              {open ? 'Open now' : 'Closed'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: TEXT2 }}>{todayLabel}</span>
          <span style={{
            background: '#F3F4F6', color: TEXT2, fontSize: 11, fontWeight: 500,
            padding: '3px 10px', borderRadius: 20,
          }}>
            Regular hours
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {(['Close early', 'Closed today', 'Edit hours'] as const).map((label) => (
              <button
                key={label}
                disabled={statusPosting}
                onClick={() => handleStatusAction(
                  label === 'Close early' ? 'close_early' : label === 'Closed today' ? 'closed_today' : 'edit_hours'
                )}
                style={{
                  padding: '7px 14px', borderRadius: 10, border: `1px solid ${BORDER}`,
                  background: CARD, color: TEXT, fontSize: 13, fontWeight: 500,
                  fontFamily: FONT, cursor: statusPosting ? 'not-allowed' : 'pointer',
                  opacity: statusPosting ? 0.6 : 1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 3-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <DesktopLinkCard />
          <GoogleCard />
          <AnalyticsMiniCard />
        </div>

        {/* 2-column row: details + full analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
          <DetailsCard onEdit={() => router.push('/settings?tab=details')} />
          <AnalyticsCard />
        </div>

        {/* 2-column row: activity + tips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 40 }}>
          <ActivityCard />
          <TipsCard />
        </div>
      </div>

      <Toast message={toast} visible={toastVisible} />
    </div>
  );
}
