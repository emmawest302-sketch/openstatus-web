export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
  url?: string;
};

export type OpenStatusPageConfig = {
  blocks: OpenStatusBlock[];
  bg: string;
  socials: string[];
};

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order', title: 'Order', sub: 'Pickup available', icon: '↗', on: true, tone: 'dark', url: '' },
  { id: 'menu', title: 'Menu', sub: 'See today’s menu', icon: '☰', on: true, tone: 'light', url: '' },
  { id: 'map', title: 'Directions', sub: 'Open maps', icon: '⌖', on: true, tone: 'map', url: '' },
  { id: 'book', title: 'Book', sub: 'Appointments', icon: '＋', on: true, tone: 'glass', url: '' },
  { id: 'website', title: 'Website', sub: 'Visit full website', icon: '↗', on: true, tone: 'light', url: '' },
];

export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as Partial<OpenStatusPageConfig> : {};
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((block) => ({ ...block, url: typeof block.url === 'string' ? block.url : '' }))
    : defaultOpenStatusBlocks;

  return {
    blocks,
    bg: typeof raw.bg === 'string' ? raw.bg : 'warm',
    socials: Array.isArray(raw.socials) ? raw.socials.filter((item): item is string => typeof item === 'string') : [],
  };
}
