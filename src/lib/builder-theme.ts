/**
 * The builder's visual system.
 *
 * The builder is the frame, not the picture. A shop's page is full of their
 * colour, their photo, their type — so everything around it stays quiet:
 * white surfaces on a cool grey field, near-black text, one restrained
 * accent. If the builder is also shouting, the two compete and the owner
 * cannot judge their own page.
 *
 * Before this existed the file carried four different border greys, two
 * secondary text greys, six radius scales and fifty-two purple fills applied
 * to anything clickable. These are the values everything should reach for.
 */

export const SURFACE = {
  /** The application field everything sits on. */
  app: '#F4F5F6',
  /** Cards, panels, the editor column. */
  card: '#FFFFFF',
  /** A quiet fill: inactive segments, wells, secondary rows. */
  soft: '#F7F7F6',
  /** The stage the page preview floats on. Slightly cooler than the app. */
  stage: '#F1F2F3',
} as const;

export const TEXT = {
  primary: '#0A0A0A',
  secondary: '#777777',
  /** Hints, counts, things you should be able to ignore. */
  muted: '#9A9A97',
  onDark: '#FFFFFF',
} as const;

export const LINE = {
  /** The one border colour. */
  default: '#E9E9E7',
  /** For a border that needs to register without becoming a box. */
  strong: '#DCDCD9',
} as const;

/**
 * Purple marks what the owner has chosen, and nothing else. Not "this is a
 * button", not "this is active by default" — chosen. A thin outline or a
 * small mark, never a filled surface.
 */
export const ACCENT = {
  base: '#7C3AED',
  /** Outline for a selected card. */
  ring: '#7C3AED',
  /** The lightest possible tint, for a selected segment's fill. */
  wash: 'rgba(124,58,237,0.07)',
  text: '#6D28D9',
} as const;

/**
 * Tailwind's own scale already lands on these, so prefer the class over an
 * arbitrary value: rounded-lg = 8, rounded-xl = 12, rounded-2xl = 16.
 */
export const RADIUS = {
  /** Tiny controls: swatches, chips, segment buttons. */
  control: 8,
  /** Buttons and inputs. */
  button: 12,
  /** Cards and panels. */
  card: 16,
  /** Pills. */
  pill: 999,
  /** Reserved for the preview surface and the public page itself. */
  stage: 24,
} as const;

/** Soft and wide, never tight and dark. */
export const SHADOW = {
  none: 'none',
  card: '0 1px 2px rgba(10,10,10,0.04)',
  raised: '0 4px 16px rgba(10,10,10,0.06)',
  /** The preview, floating on the stage. */
  stage: '0 24px 70px rgba(10,10,10,0.14)',
} as const;

/**
 * Button hierarchy. Black carries the primary action; everything else is
 * quiet. Purple is not a button colour.
 */
export const BUTTON = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] px-4 py-2 ' +
    'text-[13px] font-semibold text-white transition-colors hover:bg-[#242424] ' +
    'disabled:opacity-45 disabled:cursor-default',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E9E9E7] bg-white px-4 py-2 ' +
    'text-[13px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#F7F7F6] ' +
    'disabled:opacity-45 disabled:cursor-default',
  quiet:
    'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 ' +
    'text-[13px] font-medium text-[#777777] transition-colors hover:text-[#0A0A0A] hover:bg-[#F7F7F6]',
} as const;

/** A control the owner has selected: thin ring, faintest wash, dark label. */
export const SELECTED =
  'border-[#7C3AED] bg-[rgba(124,58,237,0.07)] text-[#0A0A0A]';
export const UNSELECTED =
  'border-[#E9E9E7] bg-white text-[#777777] hover:border-[#DCDCD9]';
