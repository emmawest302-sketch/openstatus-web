import { describe, it, expect } from 'vitest';
import { swapById, canDrag } from './reorder';

// Only custom links reorder now, so the generic fixtures use custom ids.
const list = (...ids: string[]) => ids.map((id) => ({ id: id.length === 1 ? `custom-${id}` : id }));
const c = (id: string) => `custom-${id}`;
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe('swapById', () => {
  it('swaps two blocks', () => {
    expect(ids(swapById(list('a', 'b', 'c'), c('a'), c('c')))).toEqual([c('c'), c('b'), c('a')]);
  });

  it('crossing neighbours one at a time walks a block to the end', () => {
    // This is what the gesture actually does as the finger travels.
    let l = list('a', 'b', 'c', 'd');
    l = swapById(l, c('a'), c('b'));
    l = swapById(l, c('a'), c('c'));
    l = swapById(l, c('a'), c('d'));
    expect(ids(l)).toEqual([c('b'), c('c'), c('d'), c('a')]);
  });

  it('is its own inverse', () => {
    const start = list('a', 'b', 'c');
    expect(ids(swapById(swapById(start, c('a'), c('c')), c('a'), c('c')))).toEqual([c('a'), c('b'), c('c')]);
  });

  it('returns the same reference when nothing changes', () => {
    const start = list('a', 'b');
    expect(swapById(start, c('a'), c('a'))).toBe(start);
    expect(swapById(start, c('a'), 'custom-missing')).toBe(start);
  });

  it('refuses to move the pinned hours hero', () => {
    const start = list('hours', 'menu');
    expect(swapById(start, 'hours', 'menu')).toBe(start);
    expect(swapById(start, 'menu', 'hours')).toBe(start);
  });

  it('refuses to move a built-in row', () => {
    // Built-ins sit in a fixed hierarchy. Letting one drag moved it in the
    // builder and snapped it back on the live page.
    const start = list('menu', 'order');
    expect(swapById(start, 'menu', 'order')).toBe(start);
  });

  it('leaves custom links draggable around the pinned and the fixed', () => {
    expect(ids(swapById(list('hours', 'a', 'b'), c('a'), c('b'))))
      .toEqual(['hours', c('b'), c('a')]);
  });

  it('never loses or duplicates a block', () => {
    const start = list('a', 'b', 'c', 'd', 'e');
    const after = swapById(swapById(start, c('b'), c('e')), c('a'), c('d'));
    expect([...ids(after)].sort()).toEqual(['a', 'b', 'c', 'd', 'e'].map(c));
  });

  it('knows what can be dragged', () => {
    expect(canDrag('custom-1a2b')).toBe(true);
    expect(canDrag('hours')).toBe(false);
    expect(canDrag('menu')).toBe(false);
    expect(canDrag('offers')).toBe(false);
  });
});
