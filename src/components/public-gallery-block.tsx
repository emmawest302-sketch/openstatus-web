'use client';

import { useEffect, useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

type Props = { block: OpenStatusBlock; businessId: string; placeId?: string | null };

export default function PublicGalleryBlock({ block, businessId, placeId }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!placeId) return;
    fetch(`/api/places?businessId=${businessId}&type=photos`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.photos)) setPhotos(d.photos); })
      .catch(() => {});
  }, [businessId, placeId]);

  const iconColor = block.color ?? '#374151';
  const iconBg = block.color ? `${block.color}18` : 'rgba(0,0,0,0.05)';
  const href = block.url?.trim() ? block.url : undefined;

  function openPhoto(i: number) {
    setActive(i);
    setOpen(true);
    trackOpenStatusEvent(businessId, 'block_click', block.id);
  }

  // If no Google photos and no link, just show the plain action card
  const hasPhotos = photos.length > 0;
  const hasLink = !!href;

  if (!hasPhotos && !hasLink) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18,
        padding: '18px 12px', gap: 8, minHeight: 90,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A18' }}>{block.title}</div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{block.sub}</div>
        </div>
      </div>
    );
  }

  if (hasLink && !hasPhotos) {
    // Render as a regular action block with a link
    return (
      <a href={href} target="_blank" rel="noreferrer"
        onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
          background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18,
          padding: '18px 12px', gap: 8, minHeight: 90, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', }}
      >
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={iconColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A18' }}>{block.title}</div>
          <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>{block.sub}</div>
        </div>
      </a>
    );
  }

  // Has Google photos — show a tappable preview
  const preview = `/api/place-photo?ref=${photos[0]}`;

  return (
    <>
      <button
        onClick={() => openPhoto(0)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18,
          minHeight: 90, width: '100%', padding: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Gallery preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }}/>
        <div style={{ position: 'relative', padding: '10px 12px', textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{block.title}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{photos.length} photos</div>
        </div>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/place-photo?ref=${photos[active]}`}
            alt="Photo"
            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 16, objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            {photos.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setActive(i); }}
                style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: i === active ? '#fff' : 'rgba(255,255,255,0.4)', padding: 0 }}
              />
            ))}
          </div>
          <button onClick={() => setOpen(false)}
            style={{ marginTop: 20, background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', borderRadius: 99, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      )}
    </>
  );
}
