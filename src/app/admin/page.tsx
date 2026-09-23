'use client';

/** Shape returned by /api/admin/customer — see that route for what each check means. */
type CustomerDetail = {
  business: {
    id: string; name: string; slug: string | null; tagline: string | null;
    address: string | null; phone: string | null; website: string | null;
    timezone: string | null; google_location_id: string | null;
    created_at: string; onboarded_at: string | null;
  };
  owner: { email: string | null; created_at: string | null; last_sign_in_at: string | null } | null;
  checks: { id: string; label: string; ok: boolean; detail: string }[];
  health: { failing: number; total: number };
  hours: {
    live: { day: string; closed: boolean | null; open: string | null; close: string | null }[];
    builder: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  };
  statusUpdates: { id: string; headline: string; status: string; source: string; created_at: string; expires_at: string | null }[];
  traffic: { days: number; total: number; byType: Record<string, number> };
  votes: number;
};

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
      <circle cx="50" cy="50" r="48" fill="#7C3AED"/>
      <circle cx="50" cy="50" r="21" fill="#FFFFFF"/>
      <circle cx="50" cy="44" r="7.4" fill="#7C3AED"/>
      <path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#7C3AED"/>
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

  // Passcode sign-in. The code itself is NOT in this file — it lives in
  // ADMIN_PASSCODE on the server. This posts whatever was typed to
  // /api/admin/session, which compares it and sets an httpOnly cookie. That is
  // the whole difference from the old gate, which hardcoded the code here and
  // therefore published it in the browser bundle.
  const [passcodeEntry, setPasscodeEntry] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeBusy, setPasscodeBusy] = useState(false);
  const [passcodeOffered, setPasscodeOffered] = useState(false);
  const [authed, setAuthed] = useState(false);

  // Edit modal state
  const [editRow, setEditRow] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Customer detail drawer — the "why is their page wrong?" view
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (tok: string) => {
    // The admin cookie is httpOnly and same-origin, so fetch sends it without
    // us touching it. The bearer token is the other accepted route in.
    const res = await fetch('/api/admin/data', {
      headers: tok ? { Authorization: `Bearer ${tok}` } : undefined,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error ?? 'Failed'); setAuthed(false); setLoading(false); return; }
    setRows(body.rows);
    setFiltered(body.rows);
    setError('');
    setAuthed(true);
    setLoading(false);
  }, []);

  const submitPasscode = async () => {
    setPasscodeBusy(true);
    setPasscodeError('');
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeEntry }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setPasscodeError(body.error ?? 'Incorrect passcode'); setPasscodeEntry(''); return; }
      setPasscodeEntry('');
      setLoading(true);
      await load(token);
    } catch {
      setPasscodeError('Could not reach the server');
    } finally {
      setPasscodeBusy(false);
    }
  };

  useEffect(() => {
    void (async () => {
      // Does the server offer passcode sign-in at all?
      try {
        const cfg = await fetch('/api/admin/session').then(r => r.json());
        setPasscodeOffered(!!cfg?.passcodeEnabled);
      } catch { /* not fatal */ }

      // Try the signed-in session, then the admin cookie. Either may work.
      const { data: { session } } = await supabase.auth.getSession();
      const tok = session?.access_token ?? '';
      setToken(tok);
      await load(tok);
    })();
  }, [load]);

  useEffect(() => {
    if (!detailId || !token) { setDetail(null); return; }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    void (async () => {
      try {
        const res = await fetch(`/api/admin/customer?id=${encodeURIComponent(detailId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) { setDetailError(body.error ?? 'Could not load'); setDetail(null); }
        else setDetail(body as CustomerDetail);
      } catch {
        if (!cancelled) setDetailError('Could not reach the server');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [detailId, token]);

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
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      headers: { Authorization: `Bearer ${token}` },
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

  // Not authorised yet. The server has already refused; this offers the two
  // ways in. Which email you're signed in as doesn't matter if you have the code.
  if (!authed && !loading) return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFA] px-6" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="mb-7 flex justify-center"><Mark /></div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.16em] text-[#98A2B3]">OpenStatus admin</p>
        <p className="mb-6 text-xl font-semibold tracking-[-0.03em] text-[#111]">Sign in to continue</p>

        {passcodeOffered ? (
          <div className="rounded-[20px] border border-[#E8EBF0] bg-white p-5 text-left shadow-sm">
            <label htmlFor="admin-passcode" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-[#98A2B3]">
              Admin passcode
            </label>
            <input
              id="admin-passcode"
              type="password"
              autoComplete="one-time-code"
              value={passcodeEntry}
              onChange={e => { setPasscodeEntry(e.target.value); setPasscodeError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && passcodeEntry && !passcodeBusy) void submitPasscode(); }}
              placeholder="••••••••••••••••"
              className="w-full rounded-[12px] border border-[#E4E7EC] bg-[#F9FAFB] px-3.5 py-2.5 text-sm tracking-[0.2em] text-[#111] outline-none placeholder:tracking-normal placeholder:text-[#C0C6D0] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
              autoFocus
            />
            {passcodeError && <p className="mt-2 text-[12px] text-[#DC2626]">{passcodeError}</p>}
            <button
              onClick={() => void submitPasscode()}
              disabled={passcodeBusy || !passcodeEntry}
              className="mt-3 w-full rounded-[12px] bg-[#7C3AED] py-2.5 text-sm font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-40"
            >
              {passcodeBusy ? 'Checking…' : 'Unlock'}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-[#98A2B3]">
              Works whichever account you&apos;re signed in as, including a test business owner.
            </p>
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#E8EBF0] bg-white p-5 text-left shadow-sm">
            <p className="text-[13px] font-medium text-[#111]">Passcode sign-in isn&apos;t set up</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#667085]">
              Add <code className="rounded bg-[#F2F4F7] px-1 py-0.5 text-[11px]">ADMIN_PASSCODE</code> (16+ characters)
              in Vercel to enable it. Until then, sign in with an email listed in ADMIN_EMAILS.
            </p>
          </div>
        )}

        <a href="/login" className="mt-4 inline-block text-[12px] font-medium text-[#7C3AED] hover:text-[#6D28D9]">
          Or sign in with an admin email
        </a>
      </div>
    </main>
  );

  if (loading) return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFA]">
      <p className="text-sm text-[#667085]">Loading admin hub...</p>
    </main>
  );

  if (error) return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFA]">
      <div className="text-center">
        <p className="text-[#667085]">{error}</p>
        <Link href="/dashboard" className="mt-4 block text-sm text-[#98A2B3] underline">Go to dashboard</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#111]" style={{ fontFamily: 'var(--font-poppins)' }}>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white border border-[#E4E7EC] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">Edit business</h2>
              <button onClick={() => setEditRow(null)} className="text-[#98A2B3] hover:text-[#111] text-xl leading-none">×</button>
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
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[#98A2B3]">{label}</label>
                  <input
                    value={editRow[key]}
                    onChange={e => setEditRow(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                    className="w-full rounded-[12px] border border-[#E4E7EC] bg-[#F5F6F8] px-3 py-2 text-sm text-[#111] outline-none placeholder:text-[#C0C6D0] focus:border-[#7C3AED]"
                  />
                </div>
              ))}
            </div>
            {saveError && <p className="mt-3 text-xs text-[#DC2626]">{saveError}</p>}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setEditRow(null)}
                className="flex-1 rounded-[12px] border border-[#E4E7EC] py-2.5 text-sm text-[#667085] hover:text-[#111]"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 rounded-[12px] bg-[#7C3AED] py-2.5 text-sm font-semibold text-white hover:bg-[#6D28D9] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-white border border-[#E4E7EC] p-6 shadow-2xl text-center">
            <div className="mb-3 text-3xl">⚠️</div>
            <h2 className="mb-2 text-base font-semibold">Delete this business?</h2>
            <p className="mb-5 text-sm text-[#98A2B3]">This will permanently delete the business and all its data. There&apos;s no undo.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteId(null)} className="flex-1 rounded-[12px] border border-[#E4E7EC] py-2.5 text-sm text-[#667085] hover:text-[#111]">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-[12px] bg-[#DC2626] py-2.5 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-[#E8EBF0] bg-[#FAFAFA]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Mark />
            <span className="font-semibold">OpenStatus</span>
            <span className="rounded-full bg-[#EEF0F3] px-2 py-0.5 text-[10px] font-semibold text-[#667085]">ADMIN</span>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="text-xs text-[#98A2B3] hover:text-[#344054]">Dashboard</Link>
            <button
              onClick={async () => {
                // Clear the admin cookie as well as the Supabase session,
                // otherwise "sign out" would leave admin access behind.
                await fetch('/api/admin/session', { method: 'DELETE' }).catch(() => {});
                await supabase.auth.signOut().catch(() => {});
                setAuthed(false);
                setToken('');
              }}
              className="text-xs text-[#98A2B3] hover:text-[#344054]"
            >
              Sign out
            </button>
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
            <div key={s.label} className="rounded-[20px] border border-[#E8EBF0] bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#111]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or slug…"
            className="w-full rounded-[14px] border border-[#E4E7EC] bg-[#F5F6F8] px-4 py-3 text-sm text-[#111] outline-none placeholder:text-[#C0C6D0] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#EDE9FE]"
          />
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-[20px] border border-[#E8EBF0] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8EBF0] bg-[#F7F8FA]">
                {['Business', 'Email', 'Slug', 'Setup', 'Hours', 'IG', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[.12em] text-[#98A2B3]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-[#F0F2F5] transition hover:bg-[#F7F8FA] ${i % 2 === 0 ? '' : 'bg-[#FBFBFA]'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.avatar_url ? (
                        <img
                          src={r.avatar_url.startsWith('storage:') ? `/api/assets?businessId=${r.id}&kind=avatar` : r.avatar_url}
                          className="h-7 w-7 rounded-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-[#EEF0F3] flex items-center justify-center text-[9px] font-semibold">
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <button onClick={() => setDetailId(r.id)} className="text-left">
                        <div className="font-semibold leading-tight hover:text-[#6D28D9] transition-colors">{r.name}</div>
                        {r.tagline && <div className="text-[10px] text-[#98A2B3] leading-tight truncate max-w-[140px]">{r.tagline}</div>}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#667085] text-xs">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.slug
                      ? <span className="rounded-full bg-[#EEF0F3] px-2 py-0.5 text-[11px] font-mono">{r.slug}</span>
                      : <span className="text-[#C0C6D0] text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EEF0F3]">
                        <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${r.completion}%` }}/>
                      </div>
                      <span className="text-xs text-[#667085]">{r.completion}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.has_hours
                      ? <span className="text-[#7C3AED] text-xs">✓</span>
                      : <span className="text-[#C0C6D0] text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[#667085] text-xs">
                    {r.instagram_handle ? `@${r.instagram_handle}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#98A2B3] text-xs">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.slug && (
                        <a
                          href={`/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] hover:bg-[#E4E7EC] transition"
                        >
                          View ↗
                        </a>
                      )}
                      <button
                        onClick={() => setDetailId(r.id)}
                        className="rounded-full bg-[#7C3AED] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#6D28D9] transition"
                        title="Open customer record"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="flex items-center gap-1 rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] hover:bg-[#E4E7EC] transition"
                        title="Edit"
                      >
                        <IconEdit/> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(r.id)}
                        className="flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[10px] text-[#DC2626] hover:bg-[#FECACA] transition"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#98A2B3]">No businesses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-[#C0C6D0]">Showing {filtered.length} of {total} businesses</p>

      {/* ══ CUSTOMER RECORD ══ one screen that answers "what's going on with this business?" ══ */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDetailId(null)}>
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <aside
            onClick={e => e.stopPropagation()}
            className="relative ml-auto flex h-full w-full max-w-[560px] flex-col border-l border-[#E4E7EC] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#E8EBF0] px-6 py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">Customer record</p>
                <h2 className="truncate text-lg font-semibold text-[#111]">{detail?.business.name ?? 'Loading…'}</h2>
                {detail?.owner?.email && <p className="truncate text-xs text-[#667085]">{detail.owner.email}</p>}
              </div>
              <button onClick={() => setDetailId(null)} className="shrink-0 rounded-full bg-[#F2F4F7] px-3 py-1.5 text-xs text-[#475467] hover:bg-[#E4E7EC]">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailLoading && <p className="text-sm text-[#98A2B3]">Loading…</p>}
              {detailError && <p className="text-sm text-[#DC2626]">{detailError}</p>}

              {detail && (
                <>
                  {/* Health — the reason this screen exists */}
                  <div className={`mb-5 rounded-2xl border px-4 py-3 ${detail.health.failing === 0 ? 'border-[#A7F3D0] bg-[#ECFDF5]' : 'border-[#FDE68A] bg-[#FFFBEB]'}`}>
                    <p className={`text-sm font-semibold ${detail.health.failing === 0 ? 'text-[#047857]' : 'text-[#B45309]'}`}>
                      {detail.health.failing === 0
                        ? 'Everything checks out'
                        : `${detail.health.failing} problem${detail.health.failing === 1 ? '' : 's'} found`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#667085]">
                      {detail.health.failing === 0
                        ? 'Their page is showing what they think it is.'
                        : 'These are the likely answers to whatever they wrote in about.'}
                    </p>
                  </div>

                  <div className="mb-6 space-y-2">
                    {detail.checks.map(c => (
                      <div key={c.id} className="flex gap-3 rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] px-3.5 py-3">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${c.ok ? 'bg-emerald-500/20 text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                          {c.ok ? '✓' : '!'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#111]">{c.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-[#667085]">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hours, both sources side by side */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">Hours — builder vs live page</p>
                  <div className="mb-6 overflow-hidden rounded-xl border border-[#E8EBF0]">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-[#F7F8FA] text-left text-[#98A2B3]">
                          <th className="px-3 py-2 font-semibold">Day</th>
                          <th className="px-3 py-2 font-semibold">Builder (what they see)</th>
                          <th className="px-3 py-2 font-semibold">Live page (what customers see)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.hours.live.map(row => {
                          const b = detail.hours.builder?.[row.day];
                          const builderText = !detail.hours.builder ? '—' : b?.closed ? 'Closed' : `${b?.open ?? '09:00'}–${b?.close ?? '17:00'}`;
                          const liveText = row.closed === null ? 'missing' : row.closed ? 'Closed' : `${row.open}–${row.close}`;
                          const differs = detail.hours.builder != null && builderText !== liveText;
                          return (
                            <tr key={row.day} className={`border-t border-[#F0F2F5] ${differs ? 'bg-[#FEF2F2]' : ''}`}>
                              <td className="px-3 py-1.5 uppercase text-[#667085]">{row.day}</td>
                              <td className="px-3 py-1.5 text-[#344054]">{builderText}</td>
                              <td className={`px-3 py-1.5 ${differs ? 'font-semibold text-[#B91C1C]' : 'text-[#344054]'}`}>{liveText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Traffic */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">Last 30 days</p>
                  <div className="mb-6 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] px-3 py-2.5">
                      <p className="text-lg font-semibold text-[#111]">{detail.traffic.total}</p>
                      <p className="text-[10px] text-[#98A2B3]">events</p>
                    </div>
                    <div className="rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] px-3 py-2.5">
                      <p className="text-lg font-semibold text-[#111]">{detail.traffic.byType.view ?? 0}</p>
                      <p className="text-[10px] text-[#98A2B3]">page views</p>
                    </div>
                    <div className="rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] px-3 py-2.5">
                      <p className="text-lg font-semibold text-[#111]">{detail.votes}</p>
                      <p className="text-[10px] text-[#98A2B3]">votes</p>
                    </div>
                  </div>

                  {/* Status history */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">Recent status updates</p>
                  {detail.statusUpdates.length === 0 ? (
                    <p className="mb-6 text-[11px] text-[#98A2B3]">None yet.</p>
                  ) : (
                    <div className="mb-6 space-y-1.5">
                      {detail.statusUpdates.map(u => (
                        <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E8EBF0] bg-[#F9FAFB] px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] text-[#1D2939]">{u.headline}</p>
                            <p className="text-[10px] text-[#98A2B3]">
                              {u.source} · {new Date(u.created_at).toLocaleDateString()}
                              {u.expires_at ? ` · expires ${new Date(u.expires_at).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${u.status === 'active' ? 'bg-amber-500/20 text-[#B45309]' : 'bg-[#F2F4F7] text-[#98A2B3]'}`}>
                            {u.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Raw detail */}
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#98A2B3]">Account</p>
                  <dl className="mb-4 space-y-1 text-[11px]">
                    {([
                      ['Business ID', detail.business.id],
                      ['Timezone', detail.business.timezone ?? '—'],
                      ['Address', detail.business.address ?? '—'],
                      ['Google location', detail.business.google_location_id ?? '—'],
                      ['Signed up', detail.owner?.created_at ? new Date(detail.owner.created_at).toLocaleDateString() : '—'],
                      ['Last sign in', detail.owner?.last_sign_in_at ? new Date(detail.owner.last_sign_in_at).toLocaleString() : 'never'],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <dt className="w-32 shrink-0 text-[#98A2B3]">{k}</dt>
                        <dd className="min-w-0 break-all text-[#475467]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>

            {detail?.business.slug && (
              <div className="flex gap-2 border-t border-[#E8EBF0] px-6 py-3">
                <a href={`/${detail.business.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-[#F2F4F7] py-2.5 text-center text-xs font-semibold text-[#1D2939] hover:bg-[#E4E7EC]">
                  View their page ↗
                </a>
                {detail.owner?.email && (
                  <a href={`mailto:${detail.owner.email}`}
                    className="flex-1 rounded-xl bg-[#7C3AED] py-2.5 text-center text-xs font-semibold text-white hover:bg-[#6D28D9]">
                    Email them
                  </a>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      </div>
    </main>
  );
}
