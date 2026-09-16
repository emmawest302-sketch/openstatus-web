'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BizRow = {
  id: string; name: string; slug: string | null; tagline: string | null;
  avatar_url: string | null; created_at: string; user_id: string; email: string;
  instagram_handle: string | null; has_hours: boolean; completion: number;
};

function Mark() { return <svg width="26" height="26" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#050505"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4" fill="#050505"/><path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/></svg>; }

export default function AdminPage() {
  const [rows, setRows] = useState<BizRow[]>([]);
  const [filtered, setFiltered] = useState<BizRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }
      const res = await fetch('/api/admin/data', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Failed'); setLoading(false); return; }
      setRows(body.rows);
      setFiltered(body.rows);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(!q ? rows : rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.slug ?? '').toLowerCase().includes(q)
    ));
  }, [search, rows]);

  const total = rows.length;
  const withSlug = rows.filter(r => r.slug).length;
  const withHours = rows.filter(r => r.has_hours).length;
  const avgCompletion = total ? Math.round(rows.reduce((s, r) => s + r.completion, 0) / total) : 0;

  if (loading) return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0A]">
      <p className="text-sm text-white/50">Loading admin hub...</p>
    </main>
  );

  if (error) return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0A]">
      <div className="text-center"><p className="text-white/50">{error}</p><Link href="/dashboard" className="mt-4 block text-sm text-white/30 underline">Go to dashboard</Link></div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Mark />
            <span className="font-bold">OpenStatus</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/50">ADMIN</span>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/70">Dashboard</Link>
            <button onClick={() => supabase.auth.signOut()} className="text-xs text-white/40 hover:text-white/70">Sign out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total businesses', value: total },
            { label: 'With live link', value: withSlug },
            { label: 'Hours set', value: withHours },
            { label: 'Avg completion', value: `${avgCompletion}%` },
          ].map(s => (
            <div key={s.label} className="rounded-[20px] bg-white/6 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/35">{s.label}</p>
              <p className="mt-2 text-3xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or slug..."
            className="w-full rounded-[14px] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/20 focus:ring-2 focus:ring-white/10"
          />
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-[20px] border border-white/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/4">
                {['Business', 'Email', 'Slug', 'Setup', 'Hours', 'IG', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[.12em] text-white/35">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-white/5 transition hover:bg-white/4 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.avatar_url ? (
                        <img src={r.avatar_url.startsWith('storage:') ? `/api/assets?businessId=${r.id}&kind=avatar` : r.avatar_url} className="h-7 w-7 rounded-full object-cover" alt=""/>
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">{r.name.slice(0,2).toUpperCase()}</div>
                      )}
                      <span className="font-semibold">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.slug ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono">{r.slug}</span> : <span className="text-white/25 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#C8FF62]" style={{ width: `${r.completion}%` }}/>
                      </div>
                      <span className="text-xs text-white/50">{r.completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.has_hours ? <span className="text-[#C8FF62] text-xs">✓</span> : <span className="text-white/25 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {r.instagram_handle ? `@${r.instagram_handle}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/35 text-xs">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {r.slug && <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] hover:bg-white/15">View ↗</a>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-white/30">No businesses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-white/25">Showing {filtered.length} of {total} businesses</p>
      </div>
    </main>
  );
}
