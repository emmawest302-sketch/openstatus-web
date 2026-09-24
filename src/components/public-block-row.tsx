'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicActionBlock from '@/components/public-action-block';
import PublicPhotosRow from '@/components/public-photos-row';
import PublicMenuRow from '@/components/public-menu-row';
import PublicReviewsRow from '@/components/public-reviews-row';

/**
 * One row, whichever kind it is.
 *
 * This exists so the published page and the builder preview can't disagree
 * about what a row looks like. They each used to switch on block.id in their
 * own JSX, which is how the preview ended up showing a Menu row as a plain
 * link while the page showed a photo tile, and how the preview kept rendering
 * a look the page had stopped producing months earlier.
 *
 * Instagram updates are the one row not handled here: it reads from the
 * database on the server, so the page renders it directly and the preview
 * shows a stand-in.
 */

export type PublicBlockRowProps = {
  block: OpenStatusBlock;
  businessId: string;
  placeId?: string | null;
  dark?: boolean;
  accent?: string;
};

export default function PublicBlockRow({ block, businessId, placeId, dark = false, accent }: PublicBlockRowProps) {
  if (block.id === 'gallery') {
    return <PublicPhotosRow block={block} businessId={businessId} placeId={placeId} dark={dark} accent={accent}/>;
  }
  if (block.id === 'reviews') {
    return <PublicReviewsRow block={block} businessId={businessId} placeId={placeId} dark={dark} accent={accent}/>;
  }
  if (block.id === 'menu') {
    return <PublicMenuRow block={block} businessId={businessId} dark={dark} accent={accent}/>;
  }
  return <PublicActionBlock block={block} businessId={businessId} dark={dark} accent={accent}/>;
}
