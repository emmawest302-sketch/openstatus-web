import type { ImageBlur, ImageOverlay } from './image-treatment';

/**
 * Vibes: a whole look in one tap.
 *
 * The Style tab used to open on a grid of colour swatches and a hex wheel,
 * which asks a shop owner to be an art director. Picking #F3EBE1 is not a
 * decision anyone running a bakery wants to make, and the ones who tried
 * ended up with a page whose background, name colour and font had each been
 * chosen separately and didn't agree with one another.
 *
 * A vibe sets all of them together — background, font, name colour, accent
 * and how loud a cover photo is allowed to be — so the parts are chosen as a
 * set by someone who does do this for a living.
 *
 * Crucially a vibe is a starting point, not a mode. It writes the same config
 * fields the individual controls write and then gets out of the way, so an
 * owner can pick "Corner Store" and still change the background to their
 * brand green without the app fighting them or silently reverting it.
 */

/**
 * The style fields a vibe owns, and nothing else.
 *
 * The builder carries its own, slightly different page-config type (socials as
 * a record rather than a list, a narrowed `tone`). Typing these functions
 * against either one would have meant casting at one of the two call sites,
 * and a cast is exactly how the builder and the page drifted apart before. A
 * structural type fits both and lets the compiler check both.
 */
export type VibeStyleFields = {
  bg: string;
  font?: string;
  nameColor?: string;
  themeColor?: string;
  imageIntensity?: number;
  imageBlur?: ImageBlur;
  imageOverlay?: ImageOverlay;
  bgAnim?: string;
  bgAnimSpeed?: number;
};

export type VibeFields = {
  bg: string;
  font: string;
  /** undefined means "derive from the background", which is what Auto does. */
  nameColor?: string;
  themeColor: string;
  imageIntensity: number;
  imageBlur: ImageBlur;
  imageOverlay: ImageOverlay;
  /** Only the vibes that want motion set these. */
  bgAnim?: string;
  bgAnimSpeed?: number;
};

export type Vibe = {
  key: string;
  label: string;
  blurb: string;
  /** Swatch colours for the card's mini-preview. */
  swatch: { bg: string; ink: string };
  apply: VibeFields;
};

const INTER = 'Inter, system-ui, sans-serif';

export const VIBES: Vibe[] = [
  {
    key: 'clean',
    label: 'Clean',
    blurb: 'Quiet and modern',
    swatch: { bg: '#F4F4F2', ink: '#0A0A0A' },
    apply: {
      bg: '#F7F7F5', font: INTER, nameColor: undefined, themeColor: '#0A0A0A',
      imageIntensity: 78, imageBlur: 'none', imageOverlay: 'auto',
    },
  },
  {
    key: 'bakery',
    label: 'Bakery',
    blurb: 'Warm paper and serif',
    swatch: { bg: '#F3EBE1', ink: '#3A2A1C' },
    apply: {
      bg: '#F3EBE1', font: '"Playfair Display", Georgia, serif', nameColor: '#3A2A1C',
      themeColor: '#9A5B33', imageIntensity: 86, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'nightshift',
    label: 'Night Shift',
    blurb: 'Dark, for bars and late hours',
    swatch: { bg: '#141218', ink: '#FFFFFF' },
    apply: {
      bg: '#141218', font: '"Space Grotesk", system-ui, sans-serif', nameColor: '#FFFFFF',
      themeColor: '#E4B95B', imageIntensity: 92, imageBlur: 'none', imageOverlay: 'dark',
    },
  },
  {
    key: 'studio',
    label: 'Studio',
    blurb: 'Airy, for salons and wellness',
    swatch: { bg: '#EDF3F8', ink: '#24425C' },
    apply: {
      bg: '#EDF3F8', font: '"Cormorant Garamond", Georgia, serif', nameColor: '#24425C',
      themeColor: '#3E7CA6', imageIntensity: 62, imageBlur: 'soft', imageOverlay: 'light',
    },
  },
  {
    key: 'market',
    label: 'Market',
    blurb: 'Fresh and green',
    swatch: { bg: '#EAF2E4', ink: '#22351D' },
    apply: {
      bg: '#EDF4E7', font: INTER, nameColor: '#22351D',
      themeColor: '#3F7233', imageIntensity: 80, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'bold',
    label: 'Bold',
    blurb: 'Loud, for street food and pop-ups',
    swatch: { bg: '#FF5F6D', ink: '#FFFFFF' },
    apply: {
      bg: 'linear-gradient(160deg,#FF9A5A 0%,#FF5F6D 55%,#C13584 100%)',
      font: '"Bebas Neue", Impact, sans-serif', nameColor: '#FFFFFF',
      themeColor: '#FFFFFF', imageIntensity: 70, imageBlur: 'soft', imageOverlay: 'dark',
    },
  },
];

/** Every field a vibe writes. Used to apply one, and to compare against one. */
export const VIBE_FIELDS = [
  'bg', 'font', 'nameColor', 'themeColor',
  'imageIntensity', 'imageBlur', 'imageOverlay', 'bgAnim', 'bgAnimSpeed',
] as const;

/**
 * Apply a vibe to a config.
 *
 * Every field is written, including the ones the vibe leaves undefined —
 * otherwise a name colour from a previous vibe survives into the next one and
 * an owner gets a page nobody designed. Nothing outside VIBE_FIELDS is
 * touched: the owner's blocks, hours, tags and socials are theirs.
 */
export function applyVibe<T extends VibeStyleFields>(config: T, vibe: Vibe): T {
  return {
    ...config,
    bg: vibe.apply.bg,
    font: vibe.apply.font,
    nameColor: vibe.apply.nameColor,
    themeColor: vibe.apply.themeColor,
    imageIntensity: vibe.apply.imageIntensity,
    imageBlur: vibe.apply.imageBlur,
    imageOverlay: vibe.apply.imageOverlay,
    bgAnim: vibe.apply.bgAnim,
    bgAnimSpeed: vibe.apply.bgAnimSpeed,
  };
}

/**
 * Which vibe a config is currently on, if any.
 *
 * Deliberately an exact match on every field a vibe writes. A looser check —
 * matching on the background alone, which is what the old presets did — lights
 * up a card that no longer describes the page, so the owner changes the font,
 * sees "Bakery" still selected, taps it to check, and loses their font.
 */
export function activeVibe(config: VibeStyleFields): Vibe | null {
  return VIBES.find((v) =>
    config.bg === v.apply.bg &&
    (config.font ?? undefined) === v.apply.font &&
    (config.nameColor ?? undefined) === v.apply.nameColor &&
    (config.themeColor ?? undefined) === v.apply.themeColor &&
    (config.imageIntensity ?? undefined) === v.apply.imageIntensity &&
    (config.imageBlur ?? undefined) === v.apply.imageBlur &&
    (config.imageOverlay ?? undefined) === v.apply.imageOverlay
  ) ?? null;
}
