'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BuilderClient from '@/components/builder-client';
import { normalizeOpenStatusPageConfig, type OpenStatusPageConfig, type Business } from '@/components/builder-client';
import { loadPageConfig, savePageConfig } from '@/lib/page-config-store';
import { detectTimeZone, isValidTimeZone } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

interface DbHoursRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

// BusinessData extends the shared Business type with page-internal fields
interface BusinessData extends Business {
  header_url?: string;
  instagram_handle?: string;
  onboarded_at?: string | null;
  _businessId: string;
}

type WeeklyKey = 'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat';
const WEEK_KEYS: WeeklyKey[] = ['sun','mon','tue','wed','thu','fri','sat'];

function dbHoursToWeekly(rows: DbHoursRow[]): Record<WeeklyKey, { open:string; close:string; closed:boolean }> {
  const result = {} as Record<WeeklyKey, { open:string; close:string; closed:boolean }>;
  WEEK_KEYS.forEach((key, i) => {
    const row = rows.find(r => r.day_of_week === i);
    result[key] = row && !row.is_closed
      ? { open: (row.opens_at || '09:00').slice(0, 5), close: (row.closes_at || '17:00').slice(0, 5), closed: false }
      : { open: '09:00', close: '17:00', closed: true };
  });
  return result;
}

const LoadingScreen = () => (
  <main className="grid min-h-screen place-items-center" style={{ background: '#F7F7F5', fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 100 100" width="28" height="28">
        <circle cx="50" cy="50" r="48" fill="#0A0A0A"/>
        <circle cx="50" cy="50" r="21" fill="#F7F7F5"/>
        <circle cx="50" cy="44" r="7.4" fill="#0A0A0A"/>
        <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#0A0A0A"/>
      </svg>
      <p style={{ fontSize: 13, color: '#858585' }}>Loading your builder…</p>
    </div>
  </main>
);

// Inner component that reads search params — must be inside Suspense
function BuilderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [initialConfig, setInitialConfig] = useState<OpenStatusPageConfig | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace('/login'); return; }
      const user = session.user;

      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, tagline, slug, avatar_url, header_url, instagram_handle, onboarded_at, google_location_id, category, phone, website, address, place_id, timezone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (bizError) {
        setLoadError('Could not load your business: ' + bizError.message);
        return;
      }
      if (!biz) { router.replace('/setup'); return; }

      // Backfill for every business created before onboarding started capturing
      // this. Until it is set, the public page treats them as Central Time.
      if (!biz.timezone) {
        const detected = detectTimeZone();
        if (isValidTimeZone(detected)) {
          biz.timezone = detected;
          void supabase.from('businesses').update({ timezone: detected }).eq('id', biz.id);
        }
      }

      // Prefers business_page_config, falls back to the old auth metadata.
      const raw = (await loadPageConfig(biz.id)) as Record<string, unknown> | null;
      const config = normalizeOpenStatusPageConfig(raw);

      // ── Cleanup: strip any base64 images from user metadata on load ──────────
      // base64 data URLs in JWT cookies cause 494 REQUEST_HEADER_TOO_LARGE on Vercel.
      // We detect and remove them, then save the clean version back immediately.
      const hasDirtyBase64 =
        (raw?.bgImage as string | undefined)?.startsWith('data:') ||
        (raw?.blocks as {coverPhoto?:string}[] | undefined)?.some(b=>b.coverPhoto?.startsWith('data:'));
      if (hasDirtyBase64) {
        const cleaned = {
          ...raw,
          bgImage: (raw?.bgImage as string | undefined)?.startsWith('data:') ? undefined : raw?.bgImage,
          blocks: (raw?.blocks as {coverPhoto?:string}[] | undefined)?.map(b=>({
            ...b,
            coverPhoto: b.coverPhoto?.startsWith('data:') ? '' : b.coverPhoto,
          })),
        };
        // Save cleaned version silently — don't block the page load
        void savePageConfig(biz.id, cleaned).catch(()=>{});
      }

      // Reconstruct bgImage from businesses.header_url if not already set
      if (!config.bgImage && biz.header_url) {
        config.bgImage = `/api/assets?businessId=${biz.id}&kind=header`;
      }

      // Backfill placeId from the businesses table if not already in user metadata
      if (!config.placeId && biz.place_id) {
        config.placeId = biz.place_id as string;
      }

      const hasMetaHours = raw && raw.weeklyHours && typeof raw.weeklyHours === 'object';
      if (!hasMetaHours) {
        const { data: dbHours } = await supabase
          .from('business_hours')
          .select('day_of_week, opens_at, closes_at, is_closed')
          .eq('business_id', biz.id);
        if (dbHours && dbHours.length > 0) {
          config.weeklyHours = dbHoursToWeekly(dbHours as DbHoursRow[]);
        }
      }

      setGoogleConnected(!!biz.google_location_id);
      setBusiness({ ...biz, slug: biz.slug ?? '', _businessId: biz.id, onboarded_at: biz.onboarded_at ?? null, category: biz.category ?? null, phone: biz.phone ?? null, website: biz.website ?? null, address: biz.address ?? null });
      setInitialConfig(config);
      setReady(true);
    })();
  }, [router]);

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-white" style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}>
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold text-red-600">{loadError}</p>
          <button onClick={() => window.location.reload()} className="text-xs underline text-black/50">Try again</button>
        </div>
      </main>
    );
  }

  if (!ready) return <LoadingScreen />;

  return <BuilderClient business={business} initialConfig={initialConfig!} isFirstRun={isNew} onboardedAt={business?.onboarded_at ?? null} googleConnected={googleConnected} />;
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <BuilderPageInner />
    </Suspense>
  );
}
