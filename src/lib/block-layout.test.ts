import { describe, it, expect } from 'vitest';
import { computeSpans, FULL_SPAN, HALF_SPAN } from './block-layout';

const half = (id: string) => ({ id, size: 'half' });
const full = (id: string) => ({ id, size: 'full' });

describe('computeSpans', () => {
  it('gives a lone half block the whole row', () => {
    // The actual bug: Reviews sat at half width with nothing beside it and
    // looked like a rendering fault.
    expect(computeSpans([full('hours'), half('reviews'), full('website')]))
      .toEqual([FULL_SPAN, FULL_SPAN, FULL_SPAN]);
  });

  it('pairs two adjacent halves', () => {
    expect(computeSpans([half('reviews'), half('menu')]))
      .toEqual([HALF_SPAN, HALF_SPAN]);
  });

  it('pairs the first two and widens the leftover third', () => {
    expect(computeSpans([half('a'), half('b'), half('c')]))
      .toEqual([HALF_SPAN, HALF_SPAN, FULL_SPAN]);
  });

  it('pairs four halves into two rows', () => {
    expect(computeSpans([half('a'), half('b'), half('c'), half('d')]))
      .toEqual([HALF_SPAN, HALF_SPAN, HALF_SPAN, HALF_SPAN]);
  });

  it('does not pair across a full-width block', () => {
    expect(computeSpans([half('a'), full('b'), half('c')]))
      .toEqual([FULL_SPAN, FULL_SPAN, FULL_SPAN]);
  });

  it('treats updates as full width even when marked half', () => {
    expect(computeSpans([{ id: 'updates', size: 'half' }, half('reviews')]))
      .toEqual([FULL_SPAN, FULL_SPAN]);
  });

  it('treats third and square as half', () => {
    expect(computeSpans([{ id: 'a', size: 'third' }, { id: 'b', size: 'square' }]))
      .toEqual([HALF_SPAN, HALF_SPAN]);
  });

  it('defaults an unknown or missing size to full', () => {
    expect(computeSpans([{ id: 'a' }, { id: 'b', size: 'wat' }]))
      .toEqual([FULL_SPAN, FULL_SPAN]);
  });

  it('handles an empty page', () => {
    expect(computeSpans([])).toEqual([]);
  });

  it('never returns a span outside the grid', () => {
    const blocks = [half('a'), full('b'), half('c'), half('d'), { id: 'updates' }];
    for (const span of computeSpans(blocks)) {
      expect([HALF_SPAN, FULL_SPAN]).toContain(span);
    }
  });
});
