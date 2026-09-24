'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * How an owner gets the controls onto their phone.
 *
 * On a desktop that means a QR: they are building the page on one device and
 * want it on another, so the link is something to scan rather than retype.
 *
 * On a phone it means nothing of the sort. An owner reading this *on* their
 * phone was being shown a picture of the address they were already at, with
 * no way to act on it — so there they get the link opened directly instead,
 * and the page they land on walks them through adding it to the home screen.
 *
 * The instructions are spelled out either way, because "add to home screen"
 * is buried in a share sheet and most people have never deliberately done it.
 */
export default function OwnerLinkCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  // null until measured, so neither layout flashes before we know which is right.
  const [onPhone, setOnPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setOnPhone(
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
    );
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const load = useCallback(async (rotate = false) => {
    setError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError('Sign in again to see your link.'); return; }

    const res = await fetch('/api/owner/link', {
      method: rotate ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body?.error ?? 'Could not get your link'); return; }
    setUrl(body.url);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!url || onPhone !== false) return;
    let cancelled = false;
    import('qrcode')
      .then(m => m.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: 'M',
        color: { dark: '#0A0A0A', light: '#FFFFFF' } }))
      .then(d => { if (!cancelled) setQr(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url, onPhone]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* clipboard can be blocked; the link is on screen */}
  };

  const rotate = async () => {
    if (!confirm('Get a new link? The old one stops working on every phone that has it.')) return;
    setRotating(true); setQr(null);
    await load(true);
    setRotating(false);
  };

  return (
    <div className="mb-5 p-5 rounded-2xl border border-[#E9E9E7] bg-white">
      <p className="text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]">Change hours from your phone</p>
      <p className="text-[12.5px] text-[#777777] mt-0.5 mb-4">
        {onPhone
          ? 'Open it here, then add it to your home screen. One tap to close early — no password.'
          : 'Scan this with your phone, then add it to your home screen. One tap to close early — no password.'}
      </p>

      {error && <p className="text-[12.5px] text-red-600">{error}</p>}

      {!error && onPhone === true && (
        <div>
          <a
            href={url ?? '#'}
            aria-disabled={!url}
            className={`block w-full text-center rounded-xl bg-[#0A0A0A] px-4 py-3 text-[13.5px] font-semibold text-white transition-opacity ${url ? '' : 'pointer-events-none opacity-45'}`}
          >
            {url ? 'Open my controls' : 'Loading…'}
          </a>
          <ol className="text-[12.5px] text-[#0A0A0A] space-y-1.5 list-decimal pl-4 marker:text-[#9A9A97] mt-3.5">
            <li>Tap the button above — it signs this phone in.</li>
            <li>On that page, follow <strong>Keep this on your home screen</strong>.</li>
            <li>That icon is now your hours. Tap it to close early.</li>
          </ol>
          <div className="flex flex-wrap gap-2 mt-3.5">
            <button type="button" onClick={copy} disabled={!url}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E9E9E7] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors disabled:opacity-45">
              {copied ? '\u2713 Link copied' : 'Copy link'}
            </button>
            <button type="button" onClick={rotate} disabled={!url || rotating}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-medium text-[#777777] hover:text-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors disabled:opacity-45">
              Get a new link
            </button>
          </div>
          <p className="text-[11px] text-[#9A9A97] mt-3 leading-relaxed">
            Anyone with this link can change your hours, so keep it to yourself.
            Lost your phone? Get a new link and the old one stops working.
          </p>
        </div>
      )}

      {!error && onPhone === false && (
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-[148px] h-[148px] rounded-xl border border-[#E9E9E7] bg-white grid place-items-center flex-shrink-0 overflow-hidden">
            {qr
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={qr} alt="QR code for your owner link" className="w-full h-full"/>
              : <span className="text-[11px] text-[#9A9A97]">{rotating ? 'Making a new one\u2026' : 'Loading\u2026'}</span>}
          </div>

          <div className="min-w-0 flex-1">
            <ol className="text-[12.5px] text-[#0A0A0A] space-y-1.5 list-decimal pl-4 marker:text-[#9A9A97]">
              <li>Point your phone camera at the code and tap the link.</li>
              <li>On that page, follow <strong>Keep this on your home screen</strong>.</li>
              <li>That icon is now your hours. Tap it to close early.</li>
            </ol>

            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" onClick={copy} disabled={!url}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E9E9E7] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors disabled:opacity-45">
                {copied ? '\u2713 Link copied' : 'Copy link'}
              </button>
              <button type="button" onClick={rotate} disabled={!url || rotating}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-medium text-[#777777] hover:text-[#0A0A0A] hover:bg-[#F7F7F6] transition-colors disabled:opacity-45">
                Get a new link
              </button>
            </div>

            <p className="text-[11px] text-[#9A9A97] mt-3 leading-relaxed">
              Anyone with this link can change your hours, so keep it to yourself.
              Lost your phone? Get a new link and the old one stops working.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
