'use client';

import { useEffect, useState } from 'react';

/**
 * The business's Google rating, as a single compact line in the page header.
 *
 * This used to be a full-width bar below the hours, sitting alongside
 * thumbs-up / thumbs-down buttons. Two problems with that: it was the largest
 * object on the page for information that is context rather than an action,
 * and the anonymous thumbs sat close enough to the star rating to read as
 * controls that changed it. A binary vote also competes with the real Google
 * score while carrying none of its weight, so it is gone entirely.
 *
 * What is left is credibility attached to the business name, and nothing else.
 * With no reviews there is nothing to say, so the row does not render.
 */

type Props = { businessId: string; placeId?: string | null; dark?: boolean };

export default function PublicRatingRow({ businessId, placeId, dark = false }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetch(`/api/places?businessId=${businessId}&type=info`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d.rating === 'number') setRating(d.rating);
        if (typeof d.reviewCount === 'number') setReviewCount(d.reviewCount);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [businessId, placeId]);

  if (rating === null || reviewCount < 1) return null;

  const muted = dark ? 'rgba(255,255,255,0.62)' : 'rgba(21,21,21,0.52)';
  const strong = dark ? 'rgba(255,255,255,0.92)' : '#151515';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 5, marginTop: 8,
      }}
      aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${reviewCount} Google reviews`}
    >
      {/* One star, not five. Five little stars is a rating widget — it reads
          as something you can tap, it costs 70px of width, and the number
          beside it already says everything the stars were drawing. */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBC04" aria-hidden="true" style={{ flexShrink: 0 }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
      </svg>

      <span style={{ fontSize: 13, fontWeight: 700, color: strong, letterSpacing: '-0.01em' }}>
        {rating.toFixed(1)}
      </span>
      <span style={{ fontSize: 12.5, color: muted, fontWeight: 400 }}>
        · {reviewCount.toLocaleString()} Google {reviewCount === 1 ? 'review' : 'reviews'}
      </span>
    </div>
  );
}
