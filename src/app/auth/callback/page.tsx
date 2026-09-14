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
      // Supabase automatically handles the code-exchange from the URL
      // when getSession() is called after an OAuth redirect
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      // Route new users (no business yet) to the step-by-step setup wizard,
      // returning users straight to the builder
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      router.replace(biz ? '/builder' : '/setup');
    })();
  }, [router]);

  return (
    <main
      className="grid min-h-screen place-items-center bg-[#F5F3ED]"
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <Mark />
        <p className="text-sm font-semibold text-black/50">Setting up your account...</p>
      </div>
    </main>
  );
}
