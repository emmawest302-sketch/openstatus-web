export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
  url?: string;
};

export type OpenStatusSocial = {
  id: string;
  label: string;
  url: string;
  on: boolean;
};

export type OpenStatusPageConfig = {
  blocks: OpenStatusBlock[];
  bg: string;
  socials: OpenStatusSocial[];
};

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order', title: 'Order', sub: 'Pickup available', icon: '↗', on: true, tone: 'dark', url: '' },
  { id: 'menu', title: 'Menu', sub: 'See today’s menu', icon: '☰', on: true, tone: 'light', url: '' },
  { id: 'map', title: 'Directions', sub: 'Open maps', icon: '⌖', on: true, tone: 'map', url: '' },
  { id: 'book', title: 'Book', sub: 'Appointments', icon: '＋', on: true, tone: 'glass', url: '' },
  { id: 'website', title: 'Website', sub: 'Visit full website', icon: '↗', on: true, tone: 'light', url: '' },
];

export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as { blocks?: unknown; bg?: unknown; socials?: unknown } : {};
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((block) => ({ ...(block as OpenStatusBlock), url: typeof (block as OpenStatusBlock).url === 'string' ? (block as OpenStatusBlock).url : '' }))
    : defaultOpenStatusBlocks;

  const socials: OpenStatusSocial[] = Array.isArray(raw.socials)
    ? raw.socials.map((item, index) => {
        if (typeof item === 'string') return { id: `social-${index}`, label: item, url: '', on: true };
        const social = item && typeof item === 'object' ? item as Partial<OpenStatusSocial> : {};
        return {
          id: typeof social.id === 'string' ? social.id : `social-${index}`,
          label: typeof social.label === 'string' ? social.label : 'Social',
          url: typeof social.url === 'string' ? social.url : '',
          on: social.on !== false,
        };
      })
    : [];

  return {
    blocks,
    bg: typeof raw.bg === 'string' ? raw.bg : 'warm',
    socials,
  };
}
