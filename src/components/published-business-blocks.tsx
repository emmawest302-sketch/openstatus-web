import PublicActionBlock from '@/components/public-action-block';
import PublicLocationBlock from '@/components/public-location-block';
import InstagramUpdatesBlock from '@/components/instagram-updates-block';
import PublicGalleryBlock from '@/components/public-gallery-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';
import { HEADER_ACTION_IDS } from '@/lib/page-rows';

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
  const SELF_CONTAINED = new Set(['updates', 'gallery']);
  const hasDestination = (b: { id: string; url?: string; menuFile?: string }) =>
    SELF_CONTAINED.has(b.id) || !!(b.url && b.url.trim()) || !!(b.menuFile && b.menuFile.trim());

  const enabled = config.blocks.filter((block) =>
    block.on !== false &&
    block.id !== 'hours' &&
    // Header actions, not rows. See HEADER_ACTION_IDS in lib/page-rows.
    !HEADER_ACTION_IDS.has(block.id) &&
    // Retired. Social links render once, as the icon row above the footer.
    // As a block they appeared a second time on the same page.
    block.id !== 'socials' &&
    hasDestination(block)
  );

  // Every feature is one full-width row now. Owners used to size each block —
  // half, square, third — which produced holes where a half sat alone and
  // mismatched heights where two disagreed, for a choice no customer benefits
  // from. The page has one shape; the owner chooses the feel instead.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {enabled.map((block) => {

        // Special renderers
        if (block.id === 'updates') {
          return (
            <div key={block.id}>
              <InstagramUpdatesBlock businessId={businessId} />
            </div>
          );
        }

        if (block.id === 'gallery') {
          return (
            <div key={block.id}>
              <PublicGalleryBlock block={block} businessId={businessId} placeId={placeId}/>
            </div>
          );
        }

        return (
          <div key={block.id}>
            <PublicActionBlock block={block} businessId={businessId} dark={dark}/>
          </div>
        );
      })}
    </div>
  );
}
