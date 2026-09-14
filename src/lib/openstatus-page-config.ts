export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
};

export type OpenStatusPageConfig = {
  blocks: OpenStatusBlock[];
  bg: string;
  socials: string[];
};

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order', title: 'Order', sub: 'Pickup available', icon: '↗', on: true, tone: 'dark' },
  { id: 'menu', title: 'Menu', sub: 'See today’s menu', icon: '☰', on: true, tone: 'light' },
  { id: 'map', title: 'Directions', sub: 'Open maps', icon: '⌖', on: true, tone: 'map' },
  { id: 'book', title: 'Book', sub: 'Appointments', icon: '＋', on: true, tone: 'glass' },
  { id: 'website', title: 'Website', sub: 'Visit full website', icon: '↗', on: true, tone: 'light' },
];

export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as Partial<OpenStatusPageConfig> : {};
  return {
    blocks: Array.isArray(raw.blocks) ? raw.blocks : defaultOpenStatusBlocks,
    bg: typeof raw.bg === 'string' ? raw.bg : 'warm',
    socials: Array.isArray(raw.socials) ? raw.socials.filter((item): item is string => typeof item === 'string') : [],
  };
}
