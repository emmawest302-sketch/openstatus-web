'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BuilderClient from '@/components/builder-client';
import { normalizeOpenStatusPageConfig } from '@/lib/openstatus-page-config';

export const dynamic = 'force-dynamic';

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

      const raw = user.user_metadata?.openstatus_page ?? null;
      setBusiness(biz);
      setInitialConfig(normalizeOpenStatusPageConfig(raw));
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
