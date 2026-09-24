'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Getting the controls onto a home screen, from the phone itself.
 *
 * The only install UI we had was a QR code, which assumes the owner is at a
 * desktop looking at a page they want to open somewhere else. An owner already
 * holding the phone has nothing to scan — they were being shown a picture of
 * the address they were already at.
 *
 * Three states, because the platforms genuinely differ and pretending
 * otherwise produces instructions that are wrong for half the people reading:
 *
 *  - Already installed: say so and stop. Repeating install instructions inside
 *    the installed app is how an owner concludes it didn't work.
 *  - Chromium: `beforeinstallprompt` gives us a real button.
 *  - iOS Safari: there is no API. Apple only allows this through the share
 *    sheet, so the honest thing is to name the exact taps.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Mode = 'installed' | 'prompt' | 'ios' | 'other';

/**
 * Already running from the home screen?
 *
 * Read during render rather than set from an effect, so the first paint is
 * already correct — an installed owner should never see install instructions
 * flash before they are replaced.
 */
function subscribeDisplayMode(onChange: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function readStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    // iOS predates the media query and still reports it only here.
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const NEVER_CHANGES = () => () => {};

/** 'server' until hydration, which is how we know not to guess yet. */
function readPlatform(): 'ios' | 'other' {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ claims to be a Mac; a touch-capable "Mac" is an iPad.
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS ? 'ios' : 'other';
}

export default function AddToHomeScreen({ businessName, blurb }: {
  businessName?: string;
  /**
   * What the icon will be, in the caller's words.
   *
   * The default describes the hours controls, which is what /me installs. The
   * same component runs at the end of setup, where the icon is the whole app
   * and "no password" would be a lie — the builder does ask for one.
   */
  blurb?: string;
}) {
  const standalone = useSyncExternalStore(subscribeDisplayMode, readStandalone, () => false);
  const platform = useSyncExternalStore<'ios' | 'other' | 'server'>(
    NEVER_CHANGES, readPlatform, () => 'server',
  );

  // These two only ever change from an event listener, which is the one place
  // setState belongs.
  const [justInstalled, setJustInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Keep our own UI instead of Chrome's mini-infobar, which is easy to
      // dismiss by accident and never comes back.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') setJustInstalled(true);
      // A dismissed prompt cannot be re-fired, so drop it and fall back to
      // instructions rather than leaving a button that silently does nothing.
      setDeferred(null);
      if (outcome === 'dismissed') setDismissed(true);
    } catch {
      setDeferred(null);
      setDismissed(true);
    } finally {
      setInstalling(false);
    }
  }, [deferred]);

  const mode: Mode | null =
    platform === 'server' ? null
    : standalone || justInstalled ? 'installed'
    : deferred && !dismissed ? 'prompt'
    : platform === 'ios' ? 'ios'
    : 'other';

  // Nothing until we know which platform this is — a flash of the wrong
  // instructions is worse than a beat of nothing.
  if (mode === null) return null;

  if (mode === 'installed') {
    return (
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={tick} aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534"
            strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <p style={{ ...body, margin: 0 }}>
          On your home screen. Tap the icon any time to change today&apos;s hours.
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      <p style={heading}>Keep this on your home screen</p>
      <p style={{ ...body, margin: '5px 0 0' }}>
        {blurb ?? `${businessName ? `${businessName}'s hours, ` : 'Your hours, '}one tap away — no password, no app store.`}
      </p>

      {mode === 'prompt' && (
        <button type="button" onClick={() => void install()} disabled={installing} style={primaryBtn}>
          {installing ? 'Adding…' : 'Add to home screen'}
        </button>
      )}

      {mode === 'ios' && (
        <ol style={steps}>
          <li style={step}>
            Tap <Share/> <strong>Share</strong> at the bottom of Safari.
          </li>
          <li style={step}>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </li>
          <li style={step}>Tap <strong>Add</strong>. That icon is now your hours.</li>
        </ol>
      )}

      {mode === 'other' && (
        <ol style={steps}>
          <li style={step}>Open your browser&apos;s menu.</li>
          <li style={step}>
            Tap <strong>Add to Home screen</strong> (or <strong>Install</strong>).
          </li>
          <li style={step}>That icon is now your hours.</li>
        </ol>
      )}
    </div>
  );
}

/** Apple's share glyph, so step one names a shape rather than a word. */
function Share() {
  return (
    <svg width="12" height="14" viewBox="0 0 24 28" fill="none" stroke="currentColor"
      strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: '-2px', margin: '0 1px' }} aria-hidden="true">
      <path d="M12 2v15"/><path d="M7 7l5-5 5 5"/>
      <path d="M4 12H2v14h20V12h-2"/>
    </svg>
  );
}

const card: React.CSSProperties = {
  width: '100%', maxWidth: 420,
  background: '#FFFFFF', border: '1px solid #E9E9E7',
  borderRadius: 18, padding: '16px 17px', marginTop: 14,
  boxSizing: 'border-box',
};

const heading: React.CSSProperties = {
  fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.015em', color: '#0A0A0A', margin: 0,
};

const body: React.CSSProperties = {
  fontSize: 12.5, lineHeight: 1.5, color: '#777777',
};

const steps: React.CSSProperties = {
  margin: '12px 0 0', padding: '0 0 0 18px',
  display: 'flex', flexDirection: 'column', gap: 6,
};

const step: React.CSSProperties = {
  fontSize: 12.5, lineHeight: 1.5, color: '#3F3F3F',
};

const primaryBtn: React.CSSProperties = {
  marginTop: 13, width: '100%', padding: '12px',
  borderRadius: 13, border: 'none', cursor: 'pointer',
  background: '#0A0A0A', color: '#FFFFFF',
  fontSize: 13.5, fontWeight: 650,
};

const tick: React.CSSProperties = {
  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
  background: 'rgba(22,163,74,0.12)', display: 'grid', placeItems: 'center',
};
