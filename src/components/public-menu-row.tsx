'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';
import { menuDestination } from '@/lib/menu';

/**
 * The menu row.
 *
 * A menu is a link. Resolving which link — and keeping the PDFs uploaded
 * before that was true — lives in lib/menu, where it has tests. The row says
 * when it is a PDF, so nobody taps one expecting a web page.
 */

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  dark?: boolean;
  accent?: string;
};

const SUBTITLE: Record<'pdf' | 'link', string> = {
  pdf: 'Opens a PDF',
  link: 'Tap to view',
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
