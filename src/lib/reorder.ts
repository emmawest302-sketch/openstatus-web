/**
 * Reordering for drag-on-the-preview.
 *
 * Swap rather than insert-at-index. As the pointer crosses each neighbour we
 * swap the dragged block with the one under the cursor, which in a two-column
 * grid of mixed-width blocks lands where the user expects. Crossing neighbours
 * one at a time gives the same result as a move, and a pointer that jumps
 * several blocks still does something sensible instead of nothing.
 *
 * Pure, so the gesture code above it stays about pointers and this stays about
 * order.
 */

export type Ordered = { id: string };

/** Ids that never move. The hours block is the page's hero and is pinned first. */
export const PINNED_IDS = new Set(['hours']);

/**
 * Only custom links reorder.
 *
 * Built-in rows sit in a fixed hierarchy now (see lib/page-rows): hours, then
 * what a customer decides with, then what they act on. Letting an owner drag
 * those was a choice that changed nothing on the published page once the page
 * started sorting by that hierarchy — the block moved in the builder and
 * snapped back on the live site, which is the worst kind of control.
 *
 * Custom links have no natural order, so they keep the owner's.
 */
export function canDrag(id: string): boolean {
  return !PINNED_IDS.has(id) && id.startsWith('custom-');
}

/**
 * Swap two blocks by id. Returns the original array (same reference) when the
 * swap is a no-op, so callers can skip a re-render.
 */
export function swapById<T extends Ordered>(list: T[], a: string, b: string): T[] {
  if (a === b) return list;
  if (!canDrag(a) || !canDrag(b)) return list;

  const i = list.findIndex((x) => x.id === a);
  const j = list.findIndex((x) => x.id === b);
  if (i < 0 || j < 0) return list;

  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
