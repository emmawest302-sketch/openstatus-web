'use client';

import { useEffect, useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';

/**
 * Reviews, read from the business's own Google listing.
 *
 * There is deliberately no way for an owner to type a review in here. The
 * whole value of a rating on this page is that a customer can trust it came
 * from the same place their phone would have shown them anyway, and an
 * editable field destroys that for every business on the platform, not just
 * the one that abused it.
 *
 * The header already carries the score. This row carries the words, which are
 * what someone actually reads before deciding, and it opens in place — a link
 * straight out to Google is a customer we hand back.
 */

type Review = {
  author: string;
  photo: string | null;
  rating: number | null;
  when: string;
  text: string;
};

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  placeId?: string | null;
  dark?: boolean;
  accent?: string;
};

export default function PublicReviewsRow({ block, businessId, placeId, dark = false, accent }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetch(`/api/places?businessId=${businessId}&type=reviews`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.reviews)) setReviews(d.reviews as Review[]);
        if (typeof d.rating === 'number') setRating(d.rating);
        if (typeof d.reviewCount === 'number') setCount(d.reviewCount);
        if (typeof d.url === 'string') setUrl(d.url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId, placeId]);

  const fallbackUrl = block.googleUrl?.trim() || block.yelpUrl?.trim() || block.tripAdvisorUrl?.trim() || '';
  const outbound = url || fallbackUrl;

  // Nothing worth a row. Better an absent row than one that opens onto
  // "no reviews yet" under a business's own name.
  if (reviews.length === 0) return null;

  const ink = dark ? '#FFFFFF' : '#0A0A0A';
  const muted = dark ? 'rgba(255,255,255,0.58)' : 'rgba(21,21,21,0.50)';
  const hairline = dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.07)';

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
    </svg>
  );

  const subtitle = rating !== null
    ? `${rating.toFixed(1)} · ${count.toLocaleString()} on Google`
    : `${reviews.length} on Google`;

  return (
    <PublicRow
      id={block.id} businessId={businessId} icon={icon}
      title={block.title?.trim() || 'Reviews'}
      subtitle={subtitle}
      dark={dark} accent={accent}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.slice(0, 3).map((r, i) => (
          <div key={`${r.author}-${i}`} style={{
            paddingTop: i === 0 ? 0 : 12,
            borderTop: i === 0 ? 'none' : `1px solid ${hairline}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 12.5, fontWeight: 650, color: ink }}>{r.author}</span>
              {r.rating !== null && <Stars value={r.rating} dark={dark}/>}
              {r.when && <span style={{ fontSize: 11.5, color: muted, marginLeft: 'auto' }}>{r.when}</span>}
            </div>
            {/* Clamped, not truncated with an ellipsis in the data — the full
                text is in the DOM, so a screen reader and Google both get all
                of it, and only the visual box is limited. */}
            <p style={{
              fontSize: 12.5, lineHeight: 1.45, margin: 0,
              color: dark ? 'rgba(255,255,255,0.78)' : 'rgba(21,21,21,0.70)',
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            }}>
              {r.text}
            </p>
          </div>
        ))}
      </div>

      {outbound && (
        <a href={outbound} target="_blank" rel="noreferrer" style={{
          display: 'block', textAlign: 'center', marginTop: 13,
          fontSize: 12.5, fontWeight: 600, textDecoration: 'none', color: muted,
        }}>
          Read all {count > 0 ? count.toLocaleString() : ''} reviews ↗
        </a>
      )}
    </PublicRow>
  );
}

function Stars({ value, dark }: { value: number; dark: boolean }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24"
          fill={i < Math.round(value) ? '#FBBC04' : (dark ? 'rgba(255,255,255,0.20)' : '#E4E4E7')}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
        </svg>
      ))}
    </span>
  );
}
