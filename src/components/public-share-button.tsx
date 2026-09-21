'use client';
import { useState } from 'react';

export default function PublicShareButton({ businessName, url }: { businessName: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: businessName, url });
        return;
      } catch {
        // user cancelled or error — fall through
        return;
      }
    }
    // Fallback: show copy/link options
    setShowFallback(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShowFallback(false); }, 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleShare}
        aria-label="Share"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 14px',
          borderRadius: 20,
          border: '1.5px solid rgba(0,0,0,0.09)',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          fontSize: 12, fontWeight: 600,
          color: '#292929',
          letterSpacing: '-0.01em',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
        </svg>
        Share
      </button>

      {/* Fallback panel for non-Web Share API browsers */}
      {showFallback && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowFallback(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.18)',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 51, width: 'min(340px, calc(100vw - 32px))',
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(24px)',
            borderRadius: 22,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            padding: '20px 20px 24px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#151515', letterSpacing: '-0.01em' }}>
              Share {businessName}
            </p>

            {/* Instagram option */}
            <a
              href={`instagram://sharesheet?text=${encodeURIComponent(url)}`}
              onClick={() => setShowFallback(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                textDecoration: 'none', color: '#292929',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" fill="none" stroke="white" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.5"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="white"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Instagram</span>
            </a>

            {/* Text message option */}
            <a
              href={`sms:?body=${encodeURIComponent(`Check out ${businessName}: ${url}`)}`}
              onClick={() => setShowFallback(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                textDecoration: 'none', color: '#292929',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#34C759',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Text message</span>
            </a>

            {/* Copy link */}
            <button
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                width: '100%', textAlign: 'left',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(0,0,0,0.07)',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#292929" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#292929' }}>
                {copied ? '✓ Copied!' : 'Copy link'}
              </span>
            </button>

            <button
              onClick={() => setShowFallback(false)}
              style={{
                marginTop: 8, width: '100%', padding: '12px',
                borderRadius: 14, border: 'none',
                background: 'rgba(0,0,0,0.06)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#292929',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
