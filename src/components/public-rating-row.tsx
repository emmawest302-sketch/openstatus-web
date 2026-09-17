'use client';

import { useEffect, useState } from 'react';

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
    return Math.random().toString(36).slice(2);
  }
}

export default function PublicRatingRow({ businessId, placeId }: Props) {
  const [rating, setRating]       = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [up, setUp]               = useState(0);
  const [down, setDown]           = useState(0);
  const [myVote, setMyVote]       = useState<'up' | 'down' | null>(null);
  const [voting, setVoting]       = useState(false);

  useEffect(() => {
    // Fetch votes
    fetch(`/api/votes?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => { setUp(d.up ?? 0); setDown(d.down ?? 0); })
      .catch(() => {});

    // Fetch Google rating if place_id exists
    if (placeId) {
      fetch(`/api/places?businessId=${businessId}&type=info`)
        .then((r) => r.json())
        .then((d) => { setRating(d.rating ?? null); setReviewCount(d.reviewCount ?? 0); })
        .catch(() => {});
    }

    // Restore local vote state
    try {
      const saved = localStorage.getItem(`_os_vote_${businessId}`);
      if (saved === 'up' || saved === 'down') setMyVote(saved);
    } catch {}
  }, [businessId, placeId]);

  async function vote(direction: 'up' | 'down') {
    if (voting) return;
    setVoting(true);
    const fp = getFingerprint();

    // Optimistic update
    const prev = myVote;
    const newVote = myVote === direction ? null : direction;
    setMyVote(newVote);
    if (prev === 'up') setUp((n) => n - 1);
    if (prev === 'down') setDown((n) => n - 1);
    if (newVote === 'up') setUp((n) => n + 1);
    if (newVote === 'down') setDown((n) => n + 1);

    try {
      localStorage.setItem(`_os_vote_${businessId}`, newVote ?? '');
    } catch {}

    try {
      await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, vote: direction, fingerprint: fp }),
      });
    } catch {}
    setVoting(false);
  }

  const hasRating = rating !== null && placeId;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 0,
        background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 99, padding: '8px 18px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        fontSize: 13, fontWeight: 600, color: '#1A1A18',
      }}>
        {hasRating && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFBB00" stroke="#FFBB00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{rating.toFixed(1)}</span>
              <span style={{ color: 'rgba(0,0,0,0.4)', fontWeight: 400 }}>({reviewCount.toLocaleString()})</span>
            </span>
            <span style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', margin: '0 14px', flexShrink: 0 }}/>
          </>
        )}

        <button
          onClick={() => vote('up')}
          disabled={voting}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: myVote === 'up' ? 'rgba(34,197,94,0.12)' : 'none',
            border: 'none', borderRadius: 99, padding: '3px 8px',
            cursor: 'pointer', color: myVote === 'up' ? '#16a34a' : '#555',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
          </svg>
          {up}
        </button>

        <span style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.1)', margin: '0 6px', flexShrink: 0 }}/>

        <button
          onClick={() => vote('down')}
          disabled={voting}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: myVote === 'down' ? 'rgba(239,68,68,0.1)' : 'none',
            border: 'none', borderRadius: 99, padding: '3px 8px',
            cursor: 'pointer', color: myVote === 'down' ? '#dc2626' : '#555',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
          </svg>
          {down}
        </button>
      </div>
    </div>
  );
}
