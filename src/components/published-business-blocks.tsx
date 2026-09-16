import PublicActionBlock from '@/components/public-action-block';
import PublicMapBlock from '@/components/public-map-block';
import InstagramUpdatesBlock from '@/components/instagram-updates-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';

type Props = { businessId: string; businessName: string; location: string; config: OpenStatusPageConfig };

export default function PublishedBusinessBlocks({ businessId, businessName, location, config }: Props) {
  const enabled = config.blocks.filter((block) => block.on !== false);
  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5">
      {enabled.map((block) => {
        if (block.id === 'map') {
          return <PublicMapBlock key={block.id} businessId={businessId} name={businessName} location={block.url?.trim() || location} />;
        }
        if (block.id === 'updates') {
          return (
            <div key={block.id} className="col-span-2">
              <InstagramUpdatesBlock businessId={businessId} />
            </div>
          );
        }
        return <PublicActionBlock key={block.id} businessId={businessId} block={block} />;
      })}
    </section>
  );
}
