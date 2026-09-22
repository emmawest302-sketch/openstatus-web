'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type BizRow = {
  id: string; name: string; slug: string | null; tagline: string | null;
  avatar_url: string | null; created_at: string; user_id: string; email: string;
  instagram_handle: string | null; phone: string | null; address: string | null;
  website: string | null; has_hours: boolean; completion: number;
};

type EditState = {
  id: string; name: string; slug: string; tagline: string;
  phone: string; address: string; website: string;
};

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#050505"/>
      <circle cx="50" cy="50" r="21" fill="#F7F7F3"/>
      <circle cx="50" cy="44" r="7.4" fill="#050505"/>
      <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/>
    </svg>
  );
}

function IconEdit() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
}

export default function AdminPage() {
  const [rows, setRows] = useState<BizRow[]>([]);
  const [filtered, setFiltered] = useState<BizRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeEntry, setPasscodeEntry] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const ADMIN_CODE = '6869959799';

  const submitPasscode = () => {
    if (passcodeEntry === ADMIN_CODE) {
      setPasscode(passcodeEntry);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
      setPasscodeEntry('');
    }
  };

  // Edit modal state
  const [editRow, setEditRow] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (tok: string) => {
    const res = await fetch('/api/admin/data', {
      headers: { Authorization: `Passcode ${ADMIN_CODE}` },
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error ?? 'Failed'); setLoading(false); return; }
    setRows(body.rows);
    setFiltered(body.rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }
      setToken(session.access_token);
      if (passcode === ADMIN_CODE) await load(session.access_token);
    })();
  }, [load, passcode]);

  useEffect(() => {
    if (passcode === ADMIN_CODE) {
      setLoading(true);
      setError('');
      void load(token);
    }
  }, [passcode]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(!q ? rows : rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.slug ?? '').toLowerCase().includes(q)
    ));
  }, [search, rows]);

  const openEdit = (r: BizRow) => {
    setEditRow({
      id: r.id,
      name: r.name,
      slug: r.slug ?? '',
      tagline: r.tagline ?? '',
      phone: r.phone ?? '',
      address: r.address ?? '',
      website: r.website ?? '',
    });
    setSaveError('');
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/admin/business', {
      method: 'PATCH',
      headers: { Authorization: `Passcode ${ADMIN_CODE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editRow),
    });
    const body = await res.json();
    if (!res.ok) { setSaveError(body.error ?? 'Save failed'); setSaving(false); return; }
    // Update row in local state
    setRows(prev => prev.map(r => r.id === editRow.id ? {
      ...r,
      name: editRow.name || r.name,
      slug: editRow.slug || r.slug,
      tagline: editRow.tagline || r.tagline,
      phone: editRow.phone || r.phone,
      address: editRow.address || r.address,
      website: editRow.website || r.website,
    } : r));
    setSaving(false);
    setEditRow(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/business?id=${deleteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Passcode ${ADMIN_CODE}` },
    });
    if (res.ok) {
      setRows(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    }
    setDeleting(false);
  };

  const total = rows.length;
  const withSlug = rows.filter(r => r.slug).length;
  const withHours = rows.filter(r => r.has_hours).length;
  const avgCompletion = total ? Math.round(rows.reduce((s, r) => s + r.completion, 0) / total) : 0;

  // Passcode gate
  if (passcode !== ADMIN_CODE) return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0A]">
      <div className="w-full max-w-xs text-center">
        <div className="mb-8 flex justify-center">
          <svg viewBox="0 0 100 100" width="36" height="36">
            <circle cx="50" cy="50" r="48" fill="#C8FF62"/>
            <circle cx="50" cy="50" r="21" fill="#0A0A0A"/>
            <circle cx="50" cy="44" r="7.4" fill="#C8FF62"/>
            <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#C8FF62"/>
          </svg>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/30">Admin Access</p>
        <p className="mb-6 text-lg font-bold text-white">Enter passcode</p>
        <input
          type="password"
          value={passcodeEntry}
          onChange={e => { setPasscodeEntry(e.target.value); setPasscodeError(false); }}
          onKeyDown={e => e.key === 'Enter' && submitPasscode()}
          placeholder="••••••••••"
          className="mb-3 w-full rounded-[14px] border border-white/10 bg-white/6 px-4 py-3 text-center text-lg tracking-[0.3em] text-white outline-none placeholder:text-white/15 focus:border-white/25"
          autoFocus
        />
        {passcodeError && <p className="mb-3 text-xs text-red-400">Incorrect passcode</p>}
        <button
          onClick={submitPasscode}
          className="w-full rounded-[14px] bg-[#C8FF62] py-3 text-sm font-bold text-black hover:bg-[#d4ff7a]"
        >
          Unlock
        </button>
      </div>
    </main>
  );

  if (loading) return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0A]">
      <p className="text-sm text-white/50">Loading admin hub...</p>
    </main>
  );

  if (error) return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0A]">
      <div className="text-center">
        <p className="text-white/50">{error}</p>
        <Link href="/dashboard" className="mt-4 block text-sm text-white/30 underline">Go to dashboard</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: 'var(--font-poppins)' }}>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-[#141414] border border-white/10 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-bold">Edit business</h2>
              <button onClick={() => setEditRow(null)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {([
                { key: 'name', label: 'Business name' },
                { key: 'slug', label: 'Slug (URL handle)' },
                { key: 'tagline', label: 'Tagline' },
                { key: 'phone', label: 'Phone' },
                { key: 'address', label: 'Address' },
                { key: 'website', label: 'Website' },
              ] as const).map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</label>
                  <input
                    value={editRow[key]}
                    onChange={e => setEditRow(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                    className="w-full rounded-[12px] border border-white/10 bg-white/6 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25"
                  />
                </div>
              ))}
            </div>
            {saveError && <p className="mt-3 text-xs text-red-400">{saveError}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setEditRow(null)}
                className="flex-1 rounded-[12px] border border-white/10 py-2.5 text-sm text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 rounded-[12px] bg-[#C8FF62] py-2.5 text-sm font-bold text-black hover:bg-[#d4ff7a] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-[#141414] border border-white/10 p-6 shadow-2xl text-center">
            <div className="mb-3 text-3xl">⚠️</div>
            <h2 className="mb-2 text-base font-bold">Delete this business?</h2>
            <p className="mb-5 text-sm text-white/40">This will permanently delete the business and all its data. There&apos;s no undo.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-[12px] border border-white/10 py-2.5 text-sm text-white/50 hover:text-white">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-[12px] bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            placeholder="Search by name, email or slug…"
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
                        <img
                          src={r.avatar_url.startsWith('storage:') ? `/api/assets?businessId=${r.id}&kind=avatar` : r.avatar_url}
                          className="h-7 w-7 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold">
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold leading-tight">{r.name}</div>
                        {r.tagline && <div className="text-[10px] text-white/30 leading-tight truncate max-w-[140px]">{r.tagline}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.slug
                      ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-mono">{r.slug}</span>
                      : <span className="text-white/25 text-xs">—</span>
                    }
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
                    {r.has_hours
                      ? <span className="text-[#C8FF62] text-xs">✓</span>
                      : <span className="text-white/25 text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">
                    {r.instagram_handle ? `@${r.instagram_handle}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/35 text-xs">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.slug && (
                        <a
                          href={`/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] hover:bg-white/15 transition"
                        >
                          View ↗
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(r)}
                        className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-[10px] hover:bg-white/15 transition"
                        title="Edit"
                      >
                        <IconEdit/> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        className="flex items-center gap-1 rounded-full bg-red-900/30 px-2.5 py-1 text-[10px] text-red-400 hover:bg-red-900/60 transition"
                        title="Delete"
                      >
                        <IconTrash/> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-white/30">No businesses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-white/25">Showing {filtered.length} of {total} businesses</p>
      </div>
    </main>
  );
}
