'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BuilderClient from '@/components/builder-client';
import { normalizeOpenStatusPageConfig } from '@/lib/openstatus-page-config';

export const dynamic = 'force-dynamic';

// Convert business_hours table rows into the WeeklyHours shape the builder uses
function dbHoursToWeekly(rows) {
  const KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  const result = {};
  KEYS.forEach((key, i) => {
    const row = rows.find(r => r.day_of_week === i);
    result[key] = row && !row.is_closed
      ? { open: (row.opens_at || '09:00').slice(0, 5), close: (row.closes_at || '17:00').slice(0, 5), closed: false }
      : { open: '09:00', close: '17:00', closed: true };
  });
  return result;
}

// Convert the builder's WeeklyHours back to business_hours rows for saving
export function weeklyToDbRows(businessId, weekly) {
  const KEYS = ['sun','mon','tue','wed','thu','fri','sat'];
  return KEYS.map((key, i) => {
    const day = weekly[key] || { open: '09:00', close: '17:00', closed: true };
    return {
      business_id: businessId,
      day_of_week: i,
      opens_at: day.closed ? null : day.open,
      closes_at: day.closed ? null : day.close,
      is_closed: day.closed,
    };
  });
}

export default function BuilderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [business, setBusiness] = useState(null);
  const [initialConfig, setInitialConfig] = useState(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, name, slug, avatar_url, description, category, instagram_handle')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!biz) { router.replace('/setup'); return; }

      // Load page config from user metadata
      const raw = user.user_metadata?.openstatus_page ?? null;
      const config = normalizeOpenStatusPageConfig(raw);

      // If the builder has never saved weeklyHours, seed from business_hours table
      // (which setup populates). This keeps the two sources in sync on first visit.
      const hasMetaHours = raw && raw.weeklyHours && typeof raw.weeklyHours === 'object';
      if (!hasMetaHours) {
        const { data: dbHours } = await supabase
          .from('business_hours')
          .select('day_of_week, opens_at, closes_at, is_closed')
          .eq('business_id', biz.id);
        if (dbHours && dbHours.length > 0) {
          config.weeklyHours = dbHoursToWeekly(dbHours);
        }
      }

      setBusiness({ ...biz, _businessId: biz.id });
      setInitialConfig(config);
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-white" style={{ fontFamily: 'var(--font-poppins)' }}>
        <p className="text-sm font-semibold text-black/40">Loading your builder…</p>
      </main>
    );
  }

  return <BuilderClient business={business} initialConfig={initialConfig} />;
}
