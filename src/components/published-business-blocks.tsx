import PublicActionBlock from '@/components/public-action-block';
import PublicLocationBlock from '@/components/public-location-block';
import InstagramUpdatesBlock from '@/components/instagram-updates-block';
import PublicGalleryBlock from '@/components/public-gallery-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';

type Props = {
  businessId: string;
  businessName: string;
  location: string;
  config: OpenStatusPageConfig;
  themeColor: string;
  placeId?: string | null;
  dark?: boolean;
};

export default function PublishedBusinessBlocks({
  businessId, businessName, location, config, themeColor, placeId, dark = false,
}: Props) {
  // Skip hours and location — those are handled inline in the page.
  // Also drop blocks with nothing to open: a tappable row that goes nowhere
  // (or, worse, borrows another block's link) is a broken promise to the
  // customer. These render in the builder with a "Needs setup" badge instead.
  const SELF_CONTAINED = new Set(['updates', 'gallery', 'socials']);
  const hasDestination = (b: { id: string; url?: string; menuFile?: string }) =>
    SELF_CONTAINED.has(b.id) || !!(b.url && b.url.trim()) || !!(b.menuFile && b.menuFile.trim());

  const enabled = config.blocks.filter((block) =>
    block.on !== false &&
    block.id !== 'hours' &&
    block.id !== 'location' &&
    hasDestination(block)
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
      {enabled.map((block) => {
        // Determine column span
        const span =
          block.size === 'third' ? 2
          : block.size === 'half' || block.size === 'square' ? 3
          : 6; // 'full' or default

        // Special renderers
        if (block.id === 'updates') {
          return (
            <div key={block.id} style={{ gridColumn: 'span 6' }}>
              <InstagramUpdatesBlock businessId={businessId} />
            </div>
          );
        }

        if (block.id === 'gallery') {
          return (
            <div key={block.id} style={{ gridColumn: `span ${span}` }}>
              <PublicGalleryBlock block={block} businessId={businessId} placeId={placeId}/>
            </div>
          );
        }

        return (
          <div key={block.id} style={{ gridColumn: `span ${span}` }}>
            <PublicActionBlock block={block} businessId={businessId} dark={dark}/>
          </div>
        );
      })}
    </div>
  );
}
