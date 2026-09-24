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

/**
 * The presets.
 *
 * These replaced a set named after shop types — Bakery, Night Shift, Market,
 * Bold. Naming a look after a trade tells an owner which one is "for them" and
 * then they stop looking, which is how every cafe ended up on the same warm
 * serif. A florist might want Night; a tattoo studio might want Editorial.
 * These are named after the feeling instead, so the choice is a design choice.
 *
 * Each one is a complete set: background, typeface, name colour, accent, and
 * how loud a cover photo may be. They were mixed together rather than picked
 * one field at a time, which is the whole reason presets exist.
 */
export const PRESET_BLURBS: Record<string, string> = {
  clean: 'Quiet and modern',
  editorial: 'Warm serif',
  botanical: 'Soft green',
  coastal: 'Cool and calm',
  warm: 'Earthy and friendly',
  night: 'Dark, with gold',
  mono: 'Black and white',
  cobalt: 'Sharp and blue',
};

export const VIBES: Vibe[] = [
  {
    key: 'clean',
    label: 'Clean',
    blurb: PRESET_BLURBS.clean,
    swatch: { bg: '#F7F7F5', ink: '#0A0A0A' },
    apply: {
      bg: '#F7F7F5', font: 'Inter, system-ui, sans-serif', nameColor: '#0A0A0A',
      themeColor: '#111111', imageIntensity: 82, imageBlur: 'none', imageOverlay: 'auto',
    },
  },
  {
    key: 'editorial',
    label: 'Editorial',
    blurb: PRESET_BLURBS.editorial,
    swatch: { bg: '#F1EDE5', ink: '#2C2924' },
    apply: {
      bg: '#F1EDE5', font: '"DM Serif Display", Georgia, serif', nameColor: '#2C2924',
      themeColor: '#786C5B', imageIntensity: 88, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'botanical',
    label: 'Botanical',
    blurb: PRESET_BLURBS.botanical,
    swatch: { bg: '#E9EFE7', ink: '#1E3023' },
    apply: {
      bg: '#E9EFE7', font: '"Manrope", system-ui, sans-serif', nameColor: '#1E3023',
      themeColor: '#5F765D', imageIntensity: 80, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'coastal',
    label: 'Coastal',
    blurb: PRESET_BLURBS.coastal,
    swatch: { bg: '#EDF2F4', ink: '#17262F' },
    apply: {
      bg: '#EDF2F4', font: '"DM Sans", system-ui, sans-serif', nameColor: '#17262F',
      themeColor: '#608197', imageIntensity: 86, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'warm',
    label: 'Warm',
    blurb: PRESET_BLURBS.warm,
    swatch: { bg: '#F2E8DC', ink: '#30261F' },
    apply: {
      bg: '#F2E8DC', font: '"Poppins", system-ui, sans-serif', nameColor: '#30261F',
      themeColor: '#A06E50', imageIntensity: 84, imageBlur: 'none', imageOverlay: 'light',
    },
  },
  {
    key: 'night',
    label: 'Night',
    blurb: PRESET_BLURBS.night,
    swatch: { bg: '#111111', ink: '#F5F2EB' },
    apply: {
      bg: '#111111', font: '"Space Grotesk", system-ui, sans-serif', nameColor: '#F5F2EB',
      themeColor: '#C9B58B', imageIntensity: 92, imageBlur: 'none', imageOverlay: 'dark',
    },
  },
  {
    key: 'mono',
    label: 'Mono',
    blurb: PRESET_BLURBS.mono,
    swatch: { bg: '#EDEDEB', ink: '#0A0A0A' },
    apply: {
      bg: '#EDEDEB', font: '"Poppins", system-ui, sans-serif', nameColor: '#0A0A0A',
      themeColor: '#0A0A0A', imageIntensity: 76, imageBlur: 'none', imageOverlay: 'auto',
    },
  },
  {
    key: 'cobalt',
    label: 'Cobalt',
    blurb: PRESET_BLURBS.cobalt,
    swatch: { bg: '#F4F5F7', ink: '#111318' },
    apply: {
      bg: '#F4F5F7', font: '"Manrope", system-ui, sans-serif', nameColor: '#111318',
      themeColor: '#315DE8', imageIntensity: 84, imageBlur: 'none', imageOverlay: 'auto',
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
