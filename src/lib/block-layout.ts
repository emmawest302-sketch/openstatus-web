/**
 * Works out how many of the 6 grid columns each block on a public page takes.
 *
 * Pulled out of the component so it can be tested. The rule it encodes is not
 * obvious from looking at a single block:
 *
 * A half-width block is only half-width if something sits beside it. On its
 * own it left a 50% gap to its right, which customers read as the page being
 * broken rather than as a deliberate layout. So halves pair with the next
 * half, and a half with no partner fills its row.
 *
 * ('third' used to be 2 of 6 columns. After the icon and padding that left
 * about 60px for text, so titles broke mid-word — "Revi / ews". Half is the
 * narrowest a block with words in it survives at phone width, so third and
 * square are treated as half.)
 */

export type LayoutBlock = { id: string; size?: string };

export const FULL_SPAN = 6;
export const HALF_SPAN = 3;

/** Updates renders a feed and always needs the whole row. */
export function isHalfWidth(block: LayoutBlock): boolean {
  if (block.id === 'updates') return false;
  return block.size === 'half' || block.size === 'third' || block.size === 'square';
}

export function computeSpans(blocks: LayoutBlock[]): number[] {
  const spans: number[] = new Array(blocks.length).fill(FULL_SPAN);

  for (let i = 0; i < blocks.length; ) {
    const pairs = isHalfWidth(blocks[i]) && i + 1 < blocks.length && isHalfWidth(blocks[i + 1]);
    if (pairs) {
      spans[i] = HALF_SPAN;
      spans[i + 1] = HALF_SPAN;
      i += 2;
    } else {
      spans[i] = FULL_SPAN;
      i += 1;
    }
  }

  return spans;
}
