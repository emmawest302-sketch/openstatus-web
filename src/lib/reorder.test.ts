import { describe, it, expect } from 'vitest';
import { swapById, canDrag } from './reorder';

const list = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe('swapById', () => {
  it('swaps two blocks', () => {
    expect(ids(swapById(list('a', 'b', 'c'), 'a', 'c'))).toEqual(['c', 'b', 'a']);
  });

  it('crossing neighbours one at a time walks a block to the end', () => {
    // This is what the gesture actually does as the finger travels.
    let l = list('a', 'b', 'c', 'd');
    l = swapById(l, 'a', 'b');
    l = swapById(l, 'a', 'c');
    l = swapById(l, 'a', 'd');
    expect(ids(l)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('is its own inverse', () => {
    const start = list('a', 'b', 'c');
    expect(ids(swapById(swapById(start, 'a', 'c'), 'a', 'c'))).toEqual(['a', 'b', 'c']);
  });

  it('returns the same reference when nothing changes', () => {
    const start = list('a', 'b');
    expect(swapById(start, 'a', 'a')).toBe(start);
    expect(swapById(start, 'a', 'missing')).toBe(start);
  });

  it('refuses to move the pinned hours hero', () => {
    const start = list('hours', 'website');
    expect(swapById(start, 'hours', 'website')).toBe(start);
    expect(swapById(start, 'website', 'hours')).toBe(start);
  });

  it('leaves other blocks draggable around a pinned one', () => {
    expect(ids(swapById(list('hours', 'a', 'b'), 'a', 'b'))).toEqual(['hours', 'b', 'a']);
  });

  it('never loses or duplicates a block', () => {
    const start = list('a', 'b', 'c', 'd', 'e');
    const after = swapById(swapById(start, 'b', 'e'), 'a', 'd');
    expect([...ids(after)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('knows what can be dragged', () => {
    expect(canDrag('website')).toBe(true);
    expect(canDrag('hours')).toBe(false);
  });
});
