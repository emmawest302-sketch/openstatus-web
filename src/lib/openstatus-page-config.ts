export type OpenStatusBlock = {
  id: string;
  title: string;
  sub: string;
  icon: string;
  on: boolean;
  tone: string;
  url?: string;
  size?: 'half' | 'square' | 'full' | 'third';
  color?: string;
  /** 'photo' is the legacy spelling of 'photos' and is migrated on read. */
  menuType?: 'url' | 'photos' | 'pdf';
  titleBold?: boolean; titleItalic?: boolean;
  subBold?: boolean; subItalic?: boolean;
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

import { type ImageBlur, type ImageOverlay, isImageBlur, isImageOverlay } from './image-treatment';

export type OpenStatusSocial = { id: string; label: string; url: string; on: boolean };
export type OpenStatusPageConfig = {
  blocks: OpenStatusBlock[];
  bg: string;
  bgImage?: string;
  bgImagePosition?: string;
  /** Image treatment. See lib/image-treatment.ts. */
  imageIntensity?: number;
  imageBlur?: ImageBlur;
  imageOverlay?: ImageOverlay;
  themeColor?: string;
  socials: OpenStatusSocial[];
  location?: string;
  /**
   * Where the Directions button goes, when the owner wants a specific place
   * rather than a search. Blank means build a maps search from the address,
   * which is right for almost everyone and opens each visitor's own maps app.
   */
  directionsUrl?: string;
  tags?: string[];
  weeklyHours?: WeeklyHours;
  font?: string;
  nameColor?: string;
  bgAnim?: string;
  bgAnimSpeed?: number;
};

export const defaultOpenStatusBlocks: OpenStatusBlock[] = [
  { id: 'order',   title: 'Online ordering', sub: 'Order for pickup or delivery', icon: '', on: true,  tone: 'glass', url: '', size: 'half' },
  { id: 'book',    title: 'Reservations',    sub: 'Book a table',                 icon: '', on: true,  tone: 'glass', url: '', size: 'half' },
  { id: 'website', title: 'Website',         sub: 'Visit our site',               icon: '', on: true,  tone: 'glass', url: '', size: 'full' },
  { id: 'menu',    title: 'Menu',            sub: 'View our menu',                icon: '', on: true,  tone: 'glass', url: '', size: 'third', menuType: 'url' },
  { id: 'gallery', title: 'Gallery',         sub: 'See our photos',               icon: '', on: true,  tone: 'glass', url: '', size: 'third' },
  { id: 'reviews', title: 'Reviews',         sub: 'Read what guests say',         icon: '', on: true,  tone: 'glass', url: '', size: 'third' },
];

/** The builder has always written 'photos'; older saves used 'photo'. */
function normalizeMenuType(value: unknown): 'url' | 'photos' | 'pdf' {
  if (value === 'photos' || value === 'photo') return 'photos';
  if (value === 'pdf') return 'pdf';
  return 'url';
}

/**
 * The one normalizer for a page config.
 *
 * It returns an explicit object, which is safer than spreading unknown input —
 * but that makes forgetting a field a silent data loss rather than a type
 * error, because every optional field is happy to be undefined. Three fields
 * had already gone missing this way: nameColor and the two background
 * animation fields, which is why custom name colours and animated backgrounds
 * worked in the builder preview and did nothing on the live page.
 *
 * If you add a field to OpenStatusPageConfig, add it here too, and add it to
 * the round-trip test in openstatus-page-config.test.ts — that test exists
 * specifically to fail when this list falls behind the type.
 */
export function normalizeOpenStatusPageConfig(value: unknown): OpenStatusPageConfig {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const blocks = Array.isArray(raw.blocks)
    ? raw.blocks.map((block) => {
        const b = block as OpenStatusBlock;
        return {
          ...b,
          icon: '',
          url: typeof b.url === 'string' ? b.url : '',
          // 'square' is a real size the builder offers; omitting it here turned
          // every square block into a full-width one on the live page.
          size: (b.size === 'half' || b.size === 'square' || b.size === 'full' || b.size === 'third') ? b.size : 'full',
          color: typeof b.color === 'string' ? b.color : undefined,
          menuType: normalizeMenuType((b as { menuType?: unknown }).menuType),
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
    bgImagePosition: typeof raw.bgImagePosition === 'string' ? raw.bgImagePosition : undefined,
    imageIntensity: typeof raw.imageIntensity === 'number' && Number.isFinite(raw.imageIntensity)
      ? Math.min(100, Math.max(0, raw.imageIntensity))
      : undefined,
    imageBlur: isImageBlur(raw.imageBlur) ? raw.imageBlur : undefined,
    imageOverlay: isImageOverlay(raw.imageOverlay) ? raw.imageOverlay : undefined,
    themeColor: typeof raw.themeColor === 'string' ? raw.themeColor : undefined,
    socials,
    location: typeof raw.location === 'string' ? raw.location : '',
    directionsUrl: typeof raw.directionsUrl === 'string' ? raw.directionsUrl : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : [],
    font: typeof raw.font === 'string' ? raw.font : undefined,
    // Previously missing — see the note above normalizeOpenStatusPageConfig.
    nameColor: typeof raw.nameColor === 'string' ? raw.nameColor : undefined,
    bgAnim: typeof raw.bgAnim === 'string' ? raw.bgAnim : undefined,
    bgAnimSpeed: typeof raw.bgAnimSpeed === 'number' ? raw.bgAnimSpeed : undefined,
    weeklyHours: (raw.weeklyHours && typeof raw.weeklyHours === 'object')
      ? raw.weeklyHours as WeeklyHours
      : undefined,
  };
}
