import PublicActionBlock from '@/components/public-action-block';
import PublicMapBlock from '@/components/public-map-block';
import type { OpenStatusPageConfig } from '@/lib/openstatus-page-config';

type Props = { businessName: string; location: string; config: OpenStatusPageConfig };

export default function PublishedBusinessBlocks({ businessName, location, config }: Props) {
  const enabled = config.blocks.filter((block) => block.on !== false);
  return <section className="grid grid-cols-2 gap-2.5 px-4 py-3">{enabled.map((block) => block.id === 'map' ? <PublicMapBlock key={block.id} name={businessName} location={block.url?.trim() || location} /> : <PublicActionBlock key={block.id} block={block} />)}</section>;
}
