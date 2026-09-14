import PublicActionBlock from '@/components/public-action-block';
import PublicMapBlock from '@/components/public-map-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';

type Props = { businessId: string; businessName: string; location: string; config: OpenStatusPageConfig };

export default function PublishedBusinessBlocks({ businessId, businessName, location, config }: Props) {
  const enabled = config.blocks.filter((block) => block.on !== false);
  return <section className="mt-3 grid grid-cols-2 gap-2.5">{enabled.map((block) => block.id === 'map' ? <PublicMapBlock key={block.id} businessId={businessId} name={businessName} location={block.url?.trim() || location} /> : <PublicActionBlock key={block.id} businessId={businessId} block={block} />)}</section>;
}
