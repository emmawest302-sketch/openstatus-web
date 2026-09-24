import InstagramUpdatesBlock from '@/components/instagram-updates-block';
import PublicBlockRow from '@/components/public-block-row';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';
import { publishedBlocks } from '@/lib/page-rows';

/**
 * businessName and location used to be threaded through here for a location
 * row this component no longer renders — Directions is a header action now.
 * They stay in the props so the page's call site doesn't have to change, but
 * nothing reads them.
 */
type Props = {
  businessId: string;
  businessName?: string;
  location?: string;
  config: OpenStatusPageConfig;
  themeColor?: string;
  placeId?: string | null;
  dark?: boolean;
};

export default function PublishedBusinessBlocks({
  businessId, config, themeColor, placeId, dark = false,
}: Props) {
  // One shared filter, in lib/page-rows, so the builder preview and this page
  // cannot disagree about which rows publish.
  const enabled = publishedBlocks(config.blocks);

  // Every feature is one full-width row now. Owners used to size each block —
  // half, square, third — which produced holes where a half sat alone and
  // mismatched heights where two disagreed, for a choice no customer benefits
  // from. The page has one shape; the owner chooses the feel instead.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {enabled.map((block) => {

        // Instagram updates reads from the database on the server, so it
        // can't go through the shared client renderer below.
        if (block.id === 'updates') {
          return (
            <div key={block.id}>
              <InstagramUpdatesBlock businessId={businessId} />
            </div>
          );
        }

        return (
          <div key={block.id}>
            <PublicBlockRow
              block={block}
              businessId={businessId}
              placeId={placeId}
              dark={dark}
              accent={themeColor}
            />
          </div>
        );
      })}
    </div>
  );
}
