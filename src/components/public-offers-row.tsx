'use client';

import { useState } from 'react';
import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';
import { activeOffers, offersLabel, expiryLabel } from '@/lib/offers';
import { externalUrl } from '@/lib/url';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

/**
 * Offers.
 *
 * Same row as everything else, opening in place — an offer is a reason to come
 * in today, and sending someone to another site to read it is how you lose
 * them before they have read it.
 *
 * The code is the point for most of these, so it is the thing you can tap to
 * copy. "Redeem" only appears when there is somewhere to go; a code on a page
 * the customer is already holding needs no button.
 */

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  /** Today where the shop is. Expiry is a calendar date, not a moment. */
  today: string;
  dark?: boolean;
  accent?: string;
};

export default function PublicOffersRow({ block, businessId, today, dark = false, accent }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const offers = activeOffers(block.offers, today);

  // An expired offer is worse than no offer, and a row announcing that a shop
  // has no deals is worse than both.
  if (offers.length === 0) return null;

  const ink = dark ? '#FFFFFF' : '#0A0A0A';
  const muted = dark ? 'rgba(255,255,255,0.58)' : 'rgba(21,21,21,0.50)';
  const hairline = dark ? 'rgba(255,255,255,0.10)' : 'rgba(10,10,10,0.07)';

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800);
    } catch {
      // Clipboard can be blocked; the code is on screen to read out loud.
    }
    trackOpenStatusEvent(businessId, 'block_click', `${block.id}:code`);
  };

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <path d="M7 7h.01"/>
    </svg>
  );

  return (
    <PublicRow
      id={block.id} businessId={businessId} icon={icon}
      title={block.title?.trim() || 'Offers'}
      subtitle={offersLabel(offers.length)}
      dark={dark} accent={accent}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {offers.map((offer, i) => {
          const href = externalUrl(offer.url);
          const expiry = expiryLabel(offer.expiresAt, today);
          return (
            <div key={offer.id} style={{
              paddingTop: i === 0 ? 0 : 12,
              borderTop: i === 0 ? 'none' : `1px solid ${hairline}`,
            }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ink, letterSpacing: '-0.015em', lineHeight: 1.3 }}>
                {offer.title}
              </p>

              {offer.description && (
                <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.45, color: dark ? 'rgba(255,255,255,0.74)' : 'rgba(21,21,21,0.66)' }}>
                  {offer.description}
                </p>
              )}

              {offer.code && (
                <button
                  type="button"
                  onClick={() => void copy(offer.code!)}
                  aria-label={`Copy code ${offer.code}`}
                  style={{
                    all: 'unset', cursor: 'pointer', marginTop: 8,
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 10px', borderRadius: 9,
                    border: `1px dashed ${dark ? 'rgba(255,255,255,0.28)' : 'rgba(10,10,10,0.22)'}`,
                    background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(10,10,10,0.03)',
                  }}
                >
                  <span style={{ fontSize: 11.5, color: muted }}>Use code</span>
                  <span style={{ fontSize: 13, fontWeight: 750, letterSpacing: '0.04em', color: ink }}>
                    {offer.code}
                  </span>
                  <span style={{ fontSize: 11, color: copied === offer.code ? '#15803D' : muted }}>
                    {copied === offer.code ? '✓ Copied' : 'Copy'}
                  </span>
                </button>
              )}

              {expiry && (
                <p style={{ margin: '7px 0 0', fontSize: 11.5, color: muted }}>{expiry}</p>
              )}

              {href && (
                <a
                  href={href} target="_blank" rel="noreferrer"
                  onClick={() => trackOpenStatusEvent(businessId, 'block_click', `${block.id}:redeem`)}
                  style={{
                    display: 'inline-block', marginTop: 9,
                    fontSize: 12.5, fontWeight: 650, textDecoration: 'none',
                    color: dark ? '#FFFFFF' : '#0A0A0A',
                    borderBottom: `1.5px solid ${dark ? 'rgba(255,255,255,0.35)' : 'rgba(10,10,10,0.25)'}`,
                    paddingBottom: 1,
                  }}
                >
                  Redeem offer ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </PublicRow>
  );
}
