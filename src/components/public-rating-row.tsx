'use client';

import { useEffect, useState, useCallback } from 'react';

type Props = { businessId: string; placeId?: string | null };

function getFingerprint(): string {
  try {
    let fp = localStorage.getItem('_os_fp');
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem('_os_fp', fp);
    }
    return fp;
  } catch {
    return 'anon';
  }
}

export default function PublicRatingRow({ businessId, placeId }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [upVotes, setUpVotes] = useState(0);
  const [downVotes, setDownVotes] = useState(0);
  const [myVote, setMyVote] = useState<'up' | 'down' | null>(null);
  const [thumbAnim, setThumbAnim] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    // Load votes
    fetch(`/api/votes?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        setUpVotes(d.up ?? 0);
        setDownVotes(d.down ?? 0);
        setMyVote(d.myVote ?? null);
      })
      .catch(() => {});

    // Load Google rating
    if (placeId) {
      fetch(`/api/places?businessId=${businessId}&type=info`)
        .then((r) => r.json())
        .then((d) => {
          if (d.rating) setRating(d.rating);
          if (d.reviewCount) setReviewCount(d.reviewCount);
        })
        .catch(() => {});
    }
  }, [businessId, placeId]);

  const vote = useCallback(async (direction: 'up' | 'down') => {
    const fp = getFingerprint();
    const prevVote = myVote;

    // Optimistic update
    setThumbAnim(direction);
    setTimeout(() => setThumbAnim(null), 300);

    if (myVote === direction) {
      setMyVote(null);
      setUpVotes((v) => direction === 'up' ? v - 1 : v);
      setDownVotes((v) => direction === 'down' ? v - 1 : v);
    } else {
      if (myVote) {
        setUpVotes((v) => myVote === 'up' ? v - 1 : v);
        setDownVotes((v) => myVote === 'down' ? v - 1 : v);
      }
      setMyVote(direction);
      setUpVotes((v) => direction === 'up' ? v + 1 : v);
      setDownVotes((v) => direction === 'down' ? v + 1 : v);
    }

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, vote: direction, fingerprint: fp }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // Rollback
      setMyVote(prevVote);
      setUpVotes((v) => direction === 'up' ? v - 1 : v);
      setDownVotes((v) => direction === 'down' ? v - 1 : v);
    }
  }, [businessId, myVote]);

  const hasAnyData = rating !== null || upVotes > 0 || downVotes > 0;
  if (!hasAnyData) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 0,
      background: 'rgba(255,255,255,0.74)',
      backdropFilter: 'blur(24px) saturate(130%)',
      WebkitBackdropFilter: 'blur(24px) saturate(130%)',
      border: '1px solid rgba(255,255,255,0.80)',
      boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
      borderRadius: 24,
      height: 58,
      padding: '0 6px',
      overflow: 'hidden',
    }}>

      {/* Google rating */}
      {rating !== null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 14px 0 16px',
          marginRight: 8,
          borderRight: '1px solid rgba(0,0,0,0.09)',
          height: '100%',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 1 }} aria-label={`${rating.toFixed(1)} out of 5`}>
            {[0, 1, 2, 3, 4].map((i) => {
              const fill = Math.max(0, Math.min(1, rating - i)); // partial star for e.g. 4.5
              return (
                <span key={i} style={{ position: 'relative', width: 14, height: 14, display: 'inline-block' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0 }}
                    fill="#E4E4E7" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
                  </svg>
                  {fill > 0 && (
                    <span style={{ position: 'absolute', inset: 0, width: `${fill * 100}%`, overflow: 'hidden' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBC04" aria-hidden="true">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>
                      </svg>
                    </span>
                  )}
                </span>
              );
            })}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#151515', letterSpacing: '-0.02em' }}>
            {rating.toFixed(1)}
          </span>
          {reviewCount !== null && (
            <span style={{ fontSize: 12, color: '#8A8A86', fontWeight: 400 }}>
              ({reviewCount.toLocaleString()})
            </span>
          )}
          {/* Whose rating this is. Without it the thumbs sitting alongside
              looked like buttons that changed the star rating. */}
          <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 500, letterSpacing: '0.01em' }}>
            Google
          </span>
        </div>
      )}

      {/* Divider if no rating */}
      {rating === null && (upVotes > 0 || downVotes > 0) && (
        <div style={{ width: 1 }} />
      )}

      {/* Thumbs up */}
      <button
        type="button"
        onClick={() => vote('up')}
        aria-label={myVote === 'up' ? 'Remove your recommendation' : 'Recommend this place'}
        aria-pressed={myVote === 'up'}
        title="Recommend this place"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 13px', height: 40, borderRadius: 14,
          background: myVote === 'up' ? 'rgba(34,197,94,0.10)' : 'rgba(0,0,0,0.035)',
          border: 'none', cursor: 'pointer',
          marginRight: 5,
          transition: 'background 0.15s',
        }}
      >
        <svg
          width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={myVote === 'up' ? '#22C55E' : '#292929'}
          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: thumbAnim === 'up' ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
          <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: myVote === 'up' ? '#22C55E' : '#292929',
        }}>
          {upVotes > 0 ? upVotes : ''}
        </span>
      </button>

      {/* Thumbs down */}
      <button
        type="button"
        onClick={() => vote('down')}
        aria-label={myVote === 'down' ? 'Remove your rating' : 'Not a good experience'}
        aria-pressed={myVote === 'down'}
        title="Not a good experience"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 13px', height: 40, borderRadius: 14,
          background: myVote === 'down' ? 'rgba(239,68,68,0.09)' : 'rgba(0,0,0,0.035)',
          border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <svg
          width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke={myVote === 'down' ? '#EF4444' : '#292929'}
          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: thumbAnim === 'down' ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
          <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
        </svg>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: myVote === 'down' ? '#EF4444' : '#292929',
        }}>
          {downVotes > 0 ? downVotes : ''}
        </span>
      </button>
    </div>
  );
}
