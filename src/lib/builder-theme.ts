/**
 * The builder's own palette.
 *
 * Two colour systems live in this product and confusing them is what made the
 * app feel like a template builder. The BUSINESS PAGE is where a shop expresses
 * itself — its vibe, its accent, its cover photo. The BUILDER is the workshop
 * around that page, and a workshop should be quiet: paper, ink, stone. When the
 * editor chrome was purple and the page was sage, the two fought, and the thing
 * the owner was actually making came second to the tool making it.
 *
 * So: nothing in here is expressive. There is no brand accent, because the
 * builder does not need one — black is the accent. The only colours with any
 * saturation are the three semantic ones, and they mean something: this
 * worked, look at this, this is wrong. A business's accent never gets to
 * borrow those, and they never get applied as decoration.
 *
 * Use these instead of writing another hex literal. There were several hundred
 * in builder-client before this file existed.
 */
export const BUILDER_UI = {
  /** The page behind everything. */
  app: '#F5F5F3',
  /** A card, a sheet, a field. */
  surface: '#FFFFFF',
  /** A card that sits ON a surface, or a resting control. */
  surfaceSoft: '#F1F1EF',
  /** That control, held down. */
  surfacePressed: '#EAEAE7',

  border: '#E7E7E3',
  borderStrong: '#D8D8D3',

  /** Headings, primary buttons, the active nav item. */
  ink: '#0A0A0A',
  /** Body copy. */
  text: '#3F3F3C',
  /** Labels and secondary copy. */
  muted: '#777774',
  /** Placeholders, disabled, the inactive nav item. */
  quiet: '#A3A39F',

  success: '#168A46',
  successSoft: '#EEF8F1',

  warning: '#B87518',
  warningSoft: '#FFF8EA',

  danger: '#C4473F',
  dangerSoft: '#FFF2F1',
} as const;

/**
 * The application typeface.
 *
 * Poppins is the OpenStatus wordmark and it stays that. As interface type it
 * is too round and too wide — every label read a size larger than it was, and
 * a dense settings list in Poppins is a wall. Inter is the boring correct
 * answer for UI and it makes the same screen feel calmer at the same size.
 *
 * The BUSINESS PAGE still renders in whatever font the owner picked. This is
 * the chrome only.
 */
export const BUILDER_FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Builder type scale.
 *
 * Not every label is semibold. The old builder reached for 600 on anything it
 * wanted noticed, which meant nothing was noticeable. Weight is hierarchy, so
 * it has to be spent.
 */
export const BUILDER_TYPE = {
  /** The name of the screen you are on. */
  screenTitle:  { fontSize: 20,   fontWeight: 600, letterSpacing: '-0.025em' },
  /** "You're open" — the one number-sized thing on a page. */
  majorStatus:  { fontSize: 25,   fontWeight: 600, letterSpacing: '-0.035em' },
  /** A group of rows. */
  sectionTitle: { fontSize: 14,   fontWeight: 600, letterSpacing: '-0.01em' },
  /** The name of one row or card. */
  cardTitle:    { fontSize: 13,   fontWeight: 600, letterSpacing: '-0.005em' },
  body:         { fontSize: 12,   fontWeight: 400 },
  helper:       { fontSize: 11,   fontWeight: 400 },
  button:       { fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.005em' },
  navLabel:     { fontSize: 10,   fontWeight: 500 },
} as const;

/** Corner radii, so a sheet and a card agree about what round means. */
export const BUILDER_RADIUS = {
  sheet: 22,
  card: 16,
  control: 12,
  pill: 999,
} as const;
