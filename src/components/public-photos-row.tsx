'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';
import BodyPortal from '@/components/body-portal';

/**
 * Photos, as a row.
 *
 * This used to be a card of its own shape: sometimes a 90px empty tile with an
 * icon in it, sometimes a photo with the title burned into a gradient. Neither
 * matched anything else on the page, and the empty variant took up a row to
 * tell a customer that a business has no photos — which is not worth a row.
 *
 * Now it is the same row as everything else, with three thumbnails where the
 * chevron's neighbours go. It opens in place rather than navigating, because
 * the photos are already here; sending someone to Google to look at them is
 * losing them.
 */

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  placeId?: string | null;
  dark?: boolean;
  accent?: string;
};

const photoUrl = (ref: string) => `/api/place-photo?ref=${encodeURIComponent(ref)}`;

export default function PublicPhotosRow({ block, businessId, placeId, dark = false, accent }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetch(`/api/places?businessId=${businessId}&type=photos`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d.photos)) setPhotos(d.photos); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId, placeId]);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback((n: number) => {
    setLightbox((i) => (i === null ? i : (i + n + photos.length) % photos.length));
  }, [photos.length]);

  // Arrow keys and Escape, because a lightbox that traps you is worse than no
  // lightbox.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, close, step]);

  const link = block.url?.trim() || '';

  // Nothing to show. A row that says "no photos" is a row spent on an absence.
  if (photos.length === 0 && !link) return null;

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );

  const title = block.title?.trim() || 'Photos';

  // An owner's own album link, with nothing from Google to show inline.
  if (photos.length === 0) {
    return (
      <PublicRow
        id={block.id} businessId={businessId} icon={icon}
        title={title} subtitle={block.sub || 'See our photos'}
        href={link} dark={dark} accent={accent}
      />
    );
  }

  const thumb = (ref: string, size: number) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl(ref)} alt=""
      style={{
        width: size, height: size, objectFit: 'cover', borderRadius: 7,
        display: 'block', background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.05)',
      }}
    />
  );

  return (
    <>
      <PublicRow
        id={block.id} businessId={businessId} icon={icon}
        title={title}
        subtitle={`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
        dark={dark} accent={accent}
        preview={photos.slice(0, 3).map((ref) => <span key={ref}>{thumb(ref, 30)}</span>)}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((ref, i) => (
            <button
              key={ref} type="button"
              onClick={() => { setLightbox(i); trackOpenStatusEvent(businessId, 'block_click', block.id); }}
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
              style={{ all: 'unset', cursor: 'pointer', aspectRatio: '1 / 1', display: 'block' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(ref)} alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, display: 'block',
                background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,10,0.05)',
              }}/>
            </button>
          ))}
        </div>

        {link && (
          <a href={link} target="_blank" rel="noreferrer"
            onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
            style={{
              display: 'block', textAlign: 'center', marginTop: 12,
              fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
              color: dark ? 'rgba(255,255,255,0.72)' : 'rgba(21,21,21,0.62)',
            }}>
            See more photos ↗
          </a>
        )}
      </PublicRow>

      {lightbox !== null && photos[lightbox] && (
        <BodyPortal>
        <div
          role="dialog" aria-modal="true" aria-label="Photo"
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.93)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 20, gap: 18,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(photos[lightbox])} alt={`Photo ${lightbox + 1} of ${photos.length}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '72vh', borderRadius: 16, objectFit: 'contain' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} onClick={(e) => e.stopPropagation()}>
            <Nav label="Previous photo" onClick={() => step(-1)} d="M15 18l-6-6 6-6"/>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums' }}>
              {lightbox + 1} / {photos.length}
            </span>
            <Nav label="Next photo" onClick={() => step(1)} d="M9 6l6 6-6 6"/>
          </div>
          <button type="button" onClick={close} style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)',
            color: '#FFFFFF', borderRadius: 999, padding: '8px 22px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}>
            Close
          </button>
        </div>
        </BodyPortal>
      )}
    </>
  );
}

function Nav({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} style={{
      all: 'unset', cursor: 'pointer', width: 38, height: 38, borderRadius: '50%',
      display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.12)', color: '#FFFFFF',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d}/>
      </svg>
    </button>
  );
}
