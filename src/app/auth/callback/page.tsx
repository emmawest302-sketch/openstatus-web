'use client';

import { useEffect } from 'react';
import OpenStatusMark from '@/components/openstatus-mark';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Mark() {
  return (
    <OpenStatusMark size={27}/>
  );
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      // Exchange the OAuth code in the URL for a real session (PKCE flow)
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=oauth');
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data: biz } = await supabase
        .from('businesses')
        .select('id, slug')
        .eq('user_id', session.user.id)
        .maybeSingle();

      router.replace(biz?.slug ? '/builder' : '/setup');
    })();
  }, [router]);

  return (
    <main
      className="grid min-h-screen place-items-center bg-white"
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <Mark />
        <p className="text-sm font-semibold text-black/50">Setting up your account...</p>
      </div>
    </main>
  );
}
