'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BuilderClient from '@/components/builder-client';
import { normalizeOpenStatusPageConfig, type OpenStatusPageConfig } from '@/components/builder-client';

export const dynamic = 'force-dynamic';

interface DbHoursRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

interface BusinessData {
  id: string;
  name: string;
  slug?: string;
  avatar_url?: string;
  header_url?: string;
  tagline?: string;
  instagram_handle?: string;
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

export default function BuilderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [initialConfig, setInitialConfig] = useState<OpenStatusPageConfig | null>(null);

  useEffect(() => {
    void (async () => {
      // Use getSession() in client components — reads the local cookie without a
      // server round-trip, so it never fails due to a network blip like getUser() can.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace('/login'); return; }
      const user = session.user;

      const { data: biz, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, tagline, slug, avatar_url, header_url, instagram_handle')
        .eq('user_id', user.id)
        .maybeSingle();

      if (bizError) {
        setLoadError('Could not load your business: ' + bizError.message);
        return;
      }
      if (!biz) { router.replace('/setup'); return; }

      const raw = user.user_metadata?.openstatus_page ?? null;
      const config = normalizeOpenStatusPageConfig(raw);

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

      setBusiness({ ...biz, _businessId: biz.id });
      setInitialConfig(config);
      setReady(true);
    })();
  }, [router]);

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold text-red-600">{loadError}</p>
          <button onClick={() => window.location.reload()} className="text-xs underline text-black/50">Try again</button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        <p className="text-sm font-semibold text-black/40">Loading your builder…</p>
      </main>
    );
  }

  return <BuilderClient business={business} initialConfig={initialConfig!} />;
}
