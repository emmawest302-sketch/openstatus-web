export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
  url?: string;
  size?: 'half' | 'full';
  color?: string;
  menuType?: 'url' | 'photo' | 'pdf';
  menuFile?: string;
  appleMapsUrl?: string;
  googleUrl?: string;
  tripAdvisorUrl?: string;
  yelpUrl?: string;
  reviewStars?: number;
  reviewCount?: number;
  blockStyle?: string;
  coverPhoto?: string;
  provider?: string;
  address?: string;
  reviews?: Array<{author:string;rating:number;text:string;time:string}>;
};

export type WeekDay = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
export interface DayHours { open: string; close: string; closed: boolean; }
export type WeeklyHours = Record<WeekDay, DayHours>;

export type OpenStatusSocial = { id: string; label: string; url: string; on: boolean };
export type OpenStatusPageConfig = { blocks: OpenStatusBlock[]; bg: string; socials: OpenStatusSocial[]; location?: string; tags?: string[]; weeklyHours?: WeeklyHours; };

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order', title: 'Order', sub: 'Order online', icon: '', on: true, tone: 'glass', url: '', size: 'full' },
  { id: 'menu', title: 'Menu', sub: "See today's menu", icon: '', on: true, tone: 'glass', url: '', size: 'full', menuType: 'url' },
  { id: 'map', title: 'Directions', sub: 'Open maps', icon: '', on: true, tone: 'map', url: '', size: 'full' },
  { id: 'book', title: 'Book', sub: 'Book an appointment', icon: '', on: true, tone: 'glass', url: '', size: 'full' },
  { id: 'website', title: 'Website', sub: 'Visit our website', icon: '', on: true, tone: 'glass', url: '', size: 'full' },
];

export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as { blocks?: unknown; bg?: unknown; socials?: unknown; location?: unknown; tags?: unknown } : {};
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((block) => {
        const b = block as OpenStatusBlock;
        return {
          ...b,
          icon: '',
          url: typeof b.url === 'string' ? b.url : '',
          size: (b.size === 'half' || b.size === 'full') ? b.size : 'full',
          color: typeof b.color === 'string' ? b.color : undefined,
          menuType: (b.menuType === 'url' || b.menuType === 'photo' || b.menuType === 'pdf') ? b.menuType : 'url',
          menuFile: typeof b.menuFile === 'string' ? b.menuFile : undefined,
        };
      })
    : defaultOpenStatusBlocks;
  const socials: OpenStatusSocial[] = Array.isArray(raw.socials)
    ? raw.socials.map((item, index) => {
        if (typeof item === 'string') return { id: `social-${index}`, label: item, url: '', on: true };
        const social = item && typeof item === 'object' ? item as Partial<OpenStatusSocial> : {};
        return { id: typeof social.id === 'string' ? social.id : `social-${index}`, label: typeof social.label === 'string' ? social.label : 'Social', url: typeof social.url === 'string' ? social.url : '', on: social.on !== false };
      })
    : [];
  return {
    blocks,
    bg: typeof raw.bg === 'string' ? raw.bg : 'warm',
    socials,
    location: typeof raw.location === 'string' ? raw.location : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
  };
}
