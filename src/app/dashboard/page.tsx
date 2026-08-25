'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        router.replace('/');
        return;
      }
      setEmail(data.user.email ?? null);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">OpenStatus</h1>
            <p className="text-sm text-slate-400">Admin dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Connected accounts</h2>
          <p className="text-slate-400 text-sm mb-6">
            Nothing connected yet. Meta, Google Business Profile and Yelp
            connections will land here.
          </p>
          <button
            disabled
            className="px-4 py-2 text-sm bg-blue-600/40 text-blue-200 rounded-lg cursor-not-allowed"
          >
            Connect Instagram (coming soon)
          </button>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Rules</h2>
          <p className="text-slate-400 text-sm">
            Keyword rules that flip your hours will show up here.
          </p>
        </section>

        <section className="md:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Recent activity</h2>
          <p className="text-slate-400 text-sm">
            No updates yet. Once posts are being watched, every automatic hour
            change gets logged here.
          </p>
        </section>
      </main>
    </div>
  );
}
