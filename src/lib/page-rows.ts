/**
 * Which rows a business page shows, and in what order.
 *
 * Two things used to decide this and they disagreed. `resolveRows()` declared
 * a fixed hierarchy and had eighteen tests asserting it; the live page used
 * `publishedBlocks()`, which preserved whatever order was saved. The first was
 * never called from anywhere — dead code with a passing test suite, which is
 * worse than no code, because it reads as the answer.
 *
 * There is one function now. Built-in rows sit in a fixed hierarchy, because
 * the order is a product decision and not something an owner benefits from
 * relitigating: hours first (the reason the page exists), then what a customer
 * decides with, then what they act on, then what they read. Custom links keep
 * the owner's own order among themselves, at the end, because nobody else can
 * know what those are for.
 */

/** Built-in rows, top to bottom. Anything not listed sorts after them. */
export const ROW_ORDER = [
  'hours',
  'gallery',   // shown as "Photos"
  'menu',
  'offers',
  'shop',
  'order',
  'book',
  'reviews',
  'updates',
] as const;

export type RowId = typeof ROW_ORDER[number];

/** Hours is the product. It cannot be turned off or moved off the top. */
export const PINNED_ROWS = new Set<string>(['hours']);

/**
 * Website and Directions are not rows. Every business has a website or an
 * address or neither, and when they do those are the two things a customer
 * reaches for first — so they live in the header as permanent actions rather
 * than as blocks an owner can bury at the bottom or forget to switch on.
 */
export const HEADER_ACTION_IDS = new Set(['website', 'location']);

/**
 * Blocks that open something of their own rather than linking away. They earn
 * a row without a URL, because the row *is* the content — photos and reviews
 * come from the business's Google listing, offers are written in the builder,
 * and Instagram updates come from the connected account. Each renders nothing
 * at all when it has nothing, which is the right empty state: an absent row,
 * not a row about an absence.
 */
export const SELF_CONTAINED_IDS = new Set(['updates', 'gallery', 'reviews', 'offers']);

/**
 * Social links render once, as the icon row above the footer. As a block they
 * appeared a second time on the same page.
 */
export const RETIRED_ROW_IDS = new Set(['socials']);

export type RowSource = {
  id: string;
  on?: boolean;
  url?: string;
  menuFile?: string;
  menuType?: string;
  googleUrl?: string;
  appleMapsUrl?: string;
  yelpUrl?: string;
  tripAdvisorUrl?: string;
};

export function isCustomRow(id: string): boolean {
  return id.startsWith('custom-');
}

/**
 * Does tapping this row do anything?
 *
 * This used to look at `url` and `menuFile` only, which quietly dropped every
 * block that stores its destination somewhere else — a Reviews row pointing at
 * Google, a listing with only a Yelp link. The owner switched the block on,
 * saw it in the builder, and it never appeared on the page, with nothing
 * anywhere to say why.
 */
export function blockHasDestination(b: RowSource): boolean {
  if (SELF_CONTAINED_IDS.has(b.id)) return true;
  return [b.url, b.menuFile, b.googleUrl, b.appleMapsUrl, b.yelpUrl, b.tripAdvisorUrl]
    .some((v) => !!v && v.trim().length > 0);
}

/** Position in the fixed hierarchy. Custom links sort after every built-in. */
export function rowRank(id: string): number {
  const i = (ROW_ORDER as readonly string[]).indexOf(id);
  return i === -1 ? ROW_ORDER.length : i;
}

/**
 * The one list of rows a published page shows.
 *
 * Both the live page and the builder preview call this, so they cannot drift.
 * Built-ins come back in hierarchy order regardless of how they happen to sit
 * in the saved config — which also means an old config written before a row
 * existed slots the new row into the right place without a migration.
 */
export function publishedBlocks<T extends RowSource>(blocks: T[]): T[] {
  const visible = blocks.filter((b) =>
    b.on !== false &&
    b.id !== 'hours' &&
    !HEADER_ACTION_IDS.has(b.id) &&
    !RETIRED_ROW_IDS.has(b.id) &&
    blockHasDestination(b)
  );

  const builtIns = visible.filter((b) => !isCustomRow(b.id));
  // Stable within a rank, so two blocks that somehow share one keep their
  // saved order rather than flipping between renders.
  builtIns.sort((a, b) => rowRank(a.id) - rowRank(b.id));

  // Custom links keep the owner's order, after everything built in.
  const customs = visible.filter((b) => isCustomRow(b.id));

  return [...builtIns, ...customs];
}
