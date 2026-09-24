'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';
import BodyPortal from '@/components/body-portal';

/**
 * "Share this place".
 *
 * Sharing is the one thing we actively want a visitor to do, so it is styled
 * as a real action rather than the small grey utility pill it used to be. It
 * takes its look from the page: frosted glass on a dark page, a tint of the
 * owner's accent colour on a light one, so it reads as part of the profile
 * instead of a browser control.
 *
 * Phones get the native share sheet. Everything else gets a small panel with
 * a QR code and a copy button — a QR because these pages end up on a counter
 * or a window as often as in a text message.
 */

type Props = {
  businessName: string;
  url: string;
  businessId: string;
  dark?: boolean;
  accent?: string;
};

export default function PublicShareButton({
  businessName, url, businessId, dark = false, accent = '#7C3AED',
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  // The QR library is only pulled in if someone actually opens the panel.
  useEffect(() => {
    if (!open || qr) return;
    let cancelled = false;
    import('qrcode')
      .then((m) => m.toDataURL(url, {
        margin: 1, width: 320, errorCorrectionLevel: 'M',
        color: { dark: '#111111', light: '#FFFFFF' },
      }))
      .then((data) => { if (!cancelled) setQr(data); })
      .catch(() => {/* no QR is fine, the link still copies */});
    return () => { cancelled = true; };
  }, [open, qr, url]);

  const nativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    try {
      await navigator.share({ title: businessName, text: `${businessName} on OpenStatus`, url });
      return true;
    } catch {
      // Cancelling is not a failure; don't fall back into a panel they
      // didn't ask for.
      return true;
    }
  }, [businessName, url]);

  const onShare = useCallback(async () => {
    trackOpenStatusEvent(businessId, 'share_click');
    if (await nativeShare()) return;
    setOpen(true);
  }, [businessId, nativeShare]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the URL is on screen to copy by hand.
    }
  }, [url]);

  // Escape closes, as it should for anything modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const pill: React.CSSProperties = dark
    ? {
        background: hovered ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.28)',
        color: '#FFFFFF',
      }
    : {
        background: hovered
          ? `color-mix(in srgb, ${accent} 18%, #FFFFFF)`
          : `color-mix(in srgb, ${accent} 10%, #FFFFFF)`,
        border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
        color: accent,
      };

  return (
    <>
      <button
        type="button"
        onClick={onShare}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Share ${businessName}`}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 10px', borderRadius: 999,
          fontSize: 12.5, fontWeight: 650, letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer',
          backdropFilter: 'blur(20px) saturate(130%)',
          WebkitBackdropFilter: 'blur(20px) saturate(130%)',
          boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.12)' : '0 4px 14px rgba(0,0,0,0.07)',
          transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform .16s ease, box-shadow .16s ease, background .16s ease',
          ...pill,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: hovered ? 'translate(1.5px,-1.5px)' : 'none',
            transition: 'transform .16s ease',
          }}>
          <path d="M7 17 17 7"/><path d="M8 7h9v9"/>
        </svg>
        Share
      </button>

      {open && (
        <BodyPortal>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.34)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Share ${businessName}`}
            style={{
              position: 'fixed', zIndex: 61,
              left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
              width: 'min(320px, calc(100vw - 32px))',
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(28px)',
              borderRadius: 24,
              boxShadow: '0 24px 70px rgba(0,0,0,0.26)',
              padding: '22px 22px 18px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 750, color: '#151515', letterSpacing: '-0.02em', margin: 0 }}>
              Share this place
            </p>
            <p style={{ fontSize: 12.5, color: '#767674', margin: '4px 0 16px' }}>
              {businessName}
            </p>

            <div style={{
              width: 168, height: 168, margin: '0 auto 16px',
              borderRadius: 16, overflow: 'hidden',
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.07)',
              display: 'grid', placeItems: 'center',
            }}>
              {qr
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={qr} alt={`QR code linking to ${businessName}`} style={{ width: '100%', height: '100%' }}/>
                : <span style={{ fontSize: 11, color: '#A1A1AA' }}>Generating…</span>}
            </div>

            <button
              type="button"
              onClick={copyLink}
              style={{
                width: '100%', padding: '12px', borderRadius: 14,
                border: 'none', cursor: 'pointer',
                background: copied ? 'rgba(34,197,94,0.14)' : '#151515',
                color: copied ? '#15803D' : '#FFFFFF',
                fontSize: 13.5, fontWeight: 650,
                transition: 'background .15s, color .15s',
              }}
            >
              {copied ? '✓ Link copied' : 'Copy link'}
            </button>

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                type="button"
                onClick={() => { void nativeShare(); setOpen(false); }}
                style={{
                  width: '100%', marginTop: 8, padding: '11px', borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.10)', background: 'transparent',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#292929',
                }}
              >
                More sharing options
              </button>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 10, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12.5, color: '#8A8A86', fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
        </BodyPortal>
      )}
    </>
  );
}
