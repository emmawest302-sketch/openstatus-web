/**
 * Which rows a business page shows, and in what order.
 *
 * OpenStatus used to let an owner size every block — half, square, third,
 * full — which meant they were laying out a web page rather than running a
 * shop. Two half blocks of different heights left a hole; a lone half looked
 * broken; and the page's shape changed from business to business for no
 * reason a customer benefits from.
 *
 * So the page has one shape now. Every feature is a full-width row, the order
 * is fixed, and the only question left is whether a row has anything worth
 * showing. That question is answered here, away from any JSX, so the rule
 * "don't render an empty Menu row" is a line of code with a test rather than
 * a condition buried three levels into a component.
 */

export type RowId =
  | 'hours'
  | 'photos'
  | 'menu'
  | 'order'
  | 'book'
  | 'reviews'
  | 'updates'
  | 'custom';

/**
 * Default order. Hours first because it is the reason the page exists, then
 * the things a customer decides with, then the things they act on.
 */
export const ROW_ORDER: RowId[] = [
  'hours', 'photos', 'menu', 'order', 'book', 'reviews', 'updates', 'custom',
];

/** Hours is the product. It cannot be turned off or moved off the top. */
export const PINNED_ROWS = new Set<RowId>(['hours']);

/**
 * Website and Directions are not rows. Every business has a website or an
 * address or neither, and when they do those are the two things a customer
 * reaches for first — so they live in the header as permanent actions rather
 * than as blocks an owner can bury at the bottom or forget to switch on.
 */
export const HEADER_ACTION_IDS = new Set(['website', 'location']);

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

export type RowData = {
  /** Photos from Google, or uploaded by the owner. */
  photoCount?: number;
  /** A structured menu, a PDF, or a link — any of them counts. */
  hasMenu?: boolean;
  reviewCount?: number;
  hasHours?: boolean;
};

export type ResolvedRow = {
  id: RowId;
  /** The owner's block, when this row comes from one. */
  block?: RowSource;
  pinned: boolean;
};

function blockId(rowId: RowId): string {
  return rowId;
}

/** A block only earns a row if tapping it would do something. */
function blockHasSomewhereToGo(b: RowSource | undefined): boolean {
  if (!b) return false;
  return !!(b.url && b.url.trim()) || !!(b.menuFile && b.menuFile.trim());
}

/**
 * Decide the page. A row appears when it is switched on AND it has content —
 * an empty Photos row or a Menu row that opens nothing is worse than no row,
 * because it reads as a broken page rather than a business without a menu.
 */
export function resolveRows(blocks: RowSource[], data: RowData = {}): ResolvedRow[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const rows: ResolvedRow[] = [];

  for (const id of ROW_ORDER) {
    if (id === 'custom') continue;               // handled after, in owner order
    const block = byId.get(blockId(id));
    const pinned = PINNED_ROWS.has(id);

    if (!pinned && block?.on === false) continue;

    let keep: boolean;
    switch (id) {
      case 'hours':
        keep = data.hasHours !== false;
        break;
      case 'photos':
        keep = (data.photoCount ?? 0) > 0;
        break;
      case 'menu':
        keep = !!block && (data.hasMenu === true || blockHasSomewhereToGo(block));
        break;
      case 'reviews':
        keep = (data.reviewCount ?? 0) > 0;
        break;
      case 'updates':
        keep = !!block && block.on === true;     // self-contained; renders its own empty state
        break;
      default:
        keep = blockHasSomewhereToGo(block);
    }

    if (keep) rows.push({ id, block, pinned });
  }

  // Custom links keep the owner's own ordering among themselves.
  for (const b of blocks) {
    if (!b.id.startsWith('custom-')) continue;
    if (b.on === false) continue;
    if (!blockHasSomewhereToGo(b)) continue;
    rows.push({ id: 'custom', block: b, pinned: false });
  }

  return rows;
}

/**
 * Chevron direction.
 *
 * Down means "this opens here". An arrow means "this takes you away". Mixing
 * them taught customers nothing, because the same glyph meant both.
 */
export type RowAffordance = 'expand' | 'leave';

export function affordanceFor(id: RowId): RowAffordance {
  return id === 'order' || id === 'book' || id === 'custom' ? 'leave' : 'expand';
}


/**
 * Blocks that open something of their own rather than linking away. They earn
 * a row without a URL, because the row *is* the content — photos and reviews
 * come from the business's Google listing, and Instagram updates from the
 * connected account. Each renders nothing at all when it has nothing, which
 * is the right empty state: an absent row, not a row about an absence.
 */
export const SELF_CONTAINED_IDS = new Set(['updates', 'gallery', 'reviews']);

/**
 * Social links render once, as the icon row above the footer. As a block they
 * appeared a second time on the same page.
 */
export const RETIRED_ROW_IDS = new Set(['socials']);

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

/**
 * The one list of rows a published page shows, in the owner's order.
 *
 * Both the live page and the builder preview call this. They used to each
 * carry their own copy of the filter, and the copies disagreed — the preview
 * showed rows the page then refused to publish, so an owner would design
 * against something their customers never saw.
 */
export function publishedBlocks<T extends RowSource>(blocks: T[]): T[] {
  return blocks.filter((b) =>
    b.on !== false &&
    b.id !== 'hours' &&
    !HEADER_ACTION_IDS.has(b.id) &&
    !RETIRED_ROW_IDS.has(b.id) &&
    blockHasDestination(b)
  );
}
