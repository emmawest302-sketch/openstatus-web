'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      router.replace(biz ? '/dashboard' : '/setup');
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
