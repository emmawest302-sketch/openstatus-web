export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
  url?: string;
  size?: 'half' | 'full' | 'third';
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
  lat?: number;
  lng?: number;
  reviews?: Array<{author:string;rating:number;text:string;time:string}>;
};

export type WeekDay = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';
export interface DayHours { open: string; close: string; closed: boolean; }
export type WeeklyHours = Record<WeekDay, DayHours>;

export type OpenStatusSocial = { id: string; label: string; url: string; on: boolean };
export type OpenStatusPageConfig = {
  blocks: OpenStatusBlock[];
  bg: string;
  bgImage?: string;
  themeColor?: string;
  socials: OpenStatusSocial[];
  location?: string;
  tags?: string[];
  weeklyHours?: WeeklyHours;
};

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order',   title: 'Online ordering', sub: 'Order for pickup or delivery', icon: '', on: true,  tone: 'glass', url: '', size: 'half' },
  { id: 'book',    title: 'Reservations',    sub: 'Book a table',                 icon: '', on: true,  tone: 'glass', url: '', size: 'half' },
  { id: 'website', title: 'Website',         sub: 'Visit our site',               icon: '', on: true,  tone: 'glass', url: '', size: 'full' },
  { id: 'menu',    title: 'Menu',            sub: 'View our menu',                icon: '', on: true,  tone: 'glass', url: '', size: 'third', menuType: 'url' },
  { id: 'gallery', title: 'Gallery',         sub: 'See our photos',               icon: '', on: true,  tone: 'glass', url: '', size: 'third' },
  { id: 'reviews', title: 'Reviews',         sub: 'Read what guests say',         icon: '', on: true,  tone: 'glass', url: '', size: 'third' },
];

export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((block) => {
        const b = block as OpenStatusBlock;
        return {
          ...b,
          icon: '',
          url: typeof b.url === 'string' ? b.url : '',
          size: (b.size === 'half' || b.size === 'full' || b.size === 'third') ? b.size : 'full',
          color: typeof b.color === 'string' ? b.color : undefined,
          menuType: (b.menuType === 'url' || b.menuType === 'photo' || b.menuType === 'pdf') ? b.menuType : 'url',
          menuFile: typeof b.menuFile === 'string' ? b.menuFile : undefined,
        };
      })
    : defaultOpenStatusBlocks;
  const SOCIAL_LABELS: Record<string, string> = { instagram:'Instagram', tiktok:'TikTok', facebook:'Facebook', twitter:'Twitter / X', youtube:'YouTube' };
  const socials: OpenStatusSocial[] = Array.isArray(raw.socials)
    ? raw.socials.map((item, index) => {
        if (typeof item === 'string') return { id: `social-${index}`, label: item, url: '', on: true };
        const social = item && typeof item === 'object' ? item as Partial<OpenStatusSocial> : {};
        return { id: typeof social.id === 'string' ? social.id : `social-${index}`, label: typeof social.label === 'string' ? social.label : 'Social', url: typeof social.url === 'string' ? social.url : '', on: social.on !== false };
      })
    : raw.socials && typeof raw.socials === 'object' && !Array.isArray(raw.socials)
      // Handle new builder format: Record<string, string>  e.g. {instagram:'https://...', tiktok:''}
      ? Object.entries(raw.socials as Record<string, string>)
          .filter(([, v]) => typeof v === 'string' && v.trim())
          .map(([key, url]) => ({ id: key, label: SOCIAL_LABELS[key] ?? key, url: url as string, on: true }))
      : [];
  return {
    blocks,
    bg: typeof raw.bg === 'string' ? raw.bg : '#FFFFFF',
    bgImage: typeof raw.bgImage === 'string' ? raw.bgImage : undefined,
    themeColor: typeof raw.themeColor === 'string' ? raw.themeColor : undefined,
    socials,
    location: typeof raw.location === 'string' ? raw.location : '',
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
  };
}
