'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';

/**
 * The menu row.
 *
 * A menu arrives in three shapes and the owner picks one in the builder: a
 * link to their own page, a PDF they uploaded, or a link to a photo album.
 * Only the first of those was ever read on the published page — the row took
 * its destination from `url` alone, so an owner who uploaded a PDF got a row
 * that looked tappable and did nothing. That is the single worst thing a row
 * can do, because the customer blames the restaurant, not us.
 *
 * All three go somewhere now, and the row says which kind it is, so nobody
 * taps a PDF expecting a web page on a phone with no signal.
 */

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  dark?: boolean;
  accent?: string;
};

export function menuDestination(block: OpenStatusBlock): { href: string; kind: 'pdf' | 'photos' | 'url' } | null {
  const url = block.url?.trim() ?? '';
  const file = block.menuFile?.trim() ?? '';

  if (block.menuType === 'pdf') return file ? { href: file, kind: 'pdf' } : null;
  if (block.menuType === 'photos') return url ? { href: url, kind: 'photos' } : null;
  // 'url', and anything older that predates menuType. A PDF uploaded before
  // the type existed still lives in menuFile, so fall back to it rather than
  // dropping the row.
  if (url) return { href: url, kind: 'url' };
  return file ? { href: file, kind: 'pdf' } : null;
}

const SUBTITLE: Record<'pdf' | 'photos' | 'url', string> = {
  pdf: 'Opens a PDF',
  photos: 'Photo menu',
  url: 'Tap to view',
};

export default function PublicMenuRow({ block, businessId, dark = false, accent }: Props) {
  const dest = menuDestination(block);
  if (!dest) return null;

  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
    </svg>
  );

  return (
    <PublicRow
      id={block.id}
      businessId={businessId}
      icon={icon}
      title={block.title?.trim() || 'Menu'}
      subtitle={block.sub?.trim() || SUBTITLE[dest.kind]}
      badge={dest.kind === 'pdf' ? 'PDF' : null}
      href={dest.href}
      dark={dark}
      accent={accent}
    />
  );
}
