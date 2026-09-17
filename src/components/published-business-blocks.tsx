import PublicActionBlock from '@/components/public-action-block';
import PublicLocationBlock from '@/components/public-location-block';
import InstagramUpdatesBlock from '@/components/instagram-updates-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';

type Props = { businessId: string; businessName: string; location: string; config: OpenStatusPageConfig; hasBgImage?: boolean };

export default function PublishedBusinessBlocks({ businessId, businessName, location, config, hasBgImage }: Props) {
  const enabled = config.blocks.filter((block) => block.on !== false);
  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5">
      {enabled.map((block) => {
        // Full-width: size==='full' or hours/location/updates/socials block
        const isFull = block.size === 'full' || block.id === 'hours' || block.id === 'location' || block.id === 'updates' || block.id === 'socials' || block.id === 'website';

        if (block.id === 'updates') {
          return (
            <div key={block.id} className="col-span-2">
              <InstagramUpdatesBlock businessId={businessId} />
            </div>
          );
        }
        if (block.id === 'location' && (block.googleUrl || block.appleMapsUrl || block.sub)) {
          return (
            <div key={block.id} className="col-span-2">
              <PublicLocationBlock block={block} businessId={businessId} hasBgImage={hasBgImage} />
            </div>
          );
        }
        return (
          <div key={block.id} className={isFull ? 'col-span-2' : ''}>
            <PublicActionBlock businessId={businessId} block={block} hasBgImage={hasBgImage} />
          </div>
        );
      })}
    </section>
  );
}
