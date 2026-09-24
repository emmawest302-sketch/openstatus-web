'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import PublicRow from '@/components/public-row';
import { externalUrl } from '@/lib/url';
import { brandGlyph } from '@/lib/brand-icons';
import { SHOP_PROVIDERS } from '@/components/builder/constants';

/**
 * Shop.
 *
 * A link to the store the business already runs. OpenStatus is not going to
 * hold their catalogue, their stock or their checkout — it answers "can I buy
 * from them online" and hands the customer over.
 *
 * The provider's own mark, when we have the real one, because "Shopify" under
 * a generic bag says less than the Shopify logo does at a glance.
 */

type Props = {
  block: OpenStatusBlock;
  businessId: string;
  dark?: boolean;
  accent?: string;
};

export default function PublicShopRow({ block, businessId, dark = false, accent }: Props) {
  const href = externalUrl(block.url);
  if (!href) return null;

  const provider = SHOP_PROVIDERS.find((p) => p.key === block.provider);
  const glyph = block.provider ? brandGlyph(block.provider) : null;

  const icon = glyph
    ? (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={glyph.path}/>
      </svg>
    )
    : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    );

  return (
    <PublicRow
      id={block.id}
      businessId={businessId}
      icon={icon}
      title={block.title?.trim() || 'Shop'}
      // "Shopify" is more use than "Shop online" — it tells the customer what
      // checkout they are about to land in.
      subtitle={block.sub?.trim() || provider?.label || 'Shop online'}
      href={href}
      dark={dark}
      accent={accent}
    />
  );
}
