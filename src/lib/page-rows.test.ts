import { describe, it, expect } from 'vitest';
import {
  publishedBlocks, blockHasDestination, rowRank, isCustomRow,
  ROW_ORDER, HEADER_ACTION_IDS, PINNED_ROWS, type RowSource,
} from './page-rows';

describe('the hierarchy', () => {
  it('has no duplicates', () => {
    expect(new Set(ROW_ORDER).size).toBe(ROW_ORDER.length);
  });

  it('puts hours first and pins it', () => {
    expect(ROW_ORDER[0]).toBe('hours');
    expect(PINNED_ROWS.has('hours')).toBe(true);
  });

  it('is the order we decided', () => {
    expect([...ROW_ORDER]).toEqual([
      'hours', 'gallery', 'menu', 'offers', 'shop', 'order', 'book', 'reviews', 'updates',
    ]);
  });

  it('sorts anything unknown after every built-in', () => {
    expect(rowRank('custom-abc')).toBeGreaterThanOrEqual(ROW_ORDER.length);
    expect(rowRank('gallery')).toBeLessThan(rowRank('reviews'));
  });

  it('knows a custom link when it sees one', () => {
    expect(isCustomRow('custom-1a2b')).toBe(true);
    expect(isCustomRow('menu')).toBe(false);
  });

  it('keeps Website and Directions out of the rows', () => {
    expect(HEADER_ACTION_IDS.has('website')).toBe(true);
    expect(HEADER_ACTION_IDS.has('location')).toBe(true);
    expect(HEADER_ACTION_IDS.has('menu')).toBe(false);
  });
});

describe('publishedBlocks — the one filter the page and the preview share', () => {
  it('keeps a block whose destination is a plain url', () => {
    expect(publishedBlocks([{ id: 'menu', on: true, url: 'https://x.test/menu' }])).toHaveLength(1);
  });

  it('keeps a Reviews block that only has a Google link', () => {
    // This is the regression: the old filter looked at url and menuFile only,
    // so an owner switched Reviews on, saw it in the builder, and it never
    // appeared on the page.
    const rows = publishedBlocks([{ id: 'reviews', on: true, googleUrl: 'https://maps.google.com/x' }]);
    expect(rows.map(r => r.id)).toEqual(['reviews']);
  });

  it('keeps a listing that only has Yelp or TripAdvisor', () => {
    expect(publishedBlocks([{ id: 'reviews', on: true, yelpUrl: 'https://yelp.com/x' }])).toHaveLength(1);
    expect(publishedBlocks([{ id: 'reviews', on: true, tripAdvisorUrl: 'https://ta.com/x' }])).toHaveLength(1);
  });

  it('keeps self-contained rows with no link at all', () => {
    const rows = publishedBlocks([{ id: 'gallery', on: true }, { id: 'updates', on: true }]);
    expect(rows.map(r => r.id)).toEqual(['gallery', 'updates']);
  });

  it('drops a block that goes nowhere', () => {
    expect(publishedBlocks([{ id: 'order', on: true, url: '   ' }])).toEqual([]);
  });

  it('drops hours, header actions and retired rows', () => {
    const rows = publishedBlocks([
      { id: 'hours', on: true },
      { id: 'website', on: true, url: 'https://x.test' },
      { id: 'location', on: true, url: 'https://maps.test' },
      { id: 'socials', on: true, url: 'https://instagram.test' },
      { id: 'book', on: true, url: 'https://resy.test' },
    ]);
    expect(rows.map(r => r.id)).toEqual(['book']);
  });

  it('drops anything switched off', () => {
    expect(publishedBlocks([{ id: 'menu', on: false, url: 'https://x.test' }])).toEqual([]);
  });

  it('treats a missing `on` as on, the way a legacy save does', () => {
    expect(publishedBlocks([{ id: 'menu', url: 'https://x.test' }])).toHaveLength(1);
  });

  it('publishes built-ins in the order the owner saved them', () => {
    // A florist wants photos at the top and a takeaway wants the menu there.
    // Whatever order the builder saved is the order that goes live — there is
    // no second opinion applied on the way out.
    const rows = publishedBlocks([
      { id: 'book', on: true, url: 'https://b.test' },
      { id: 'menu', on: true, url: 'https://m.test' },
      { id: 'order', on: true, url: 'https://o.test' },
    ]);
    expect(rows.map(r => r.id)).toEqual(['book', 'menu', 'order']);
  });

  it('never publishes a row a customer could tap into nothing', () => {
    const noisy: RowSource[] = [
      { id: 'menu', on: true, url: '' },
      { id: 'order', on: true },
      { id: 'custom-1', on: true, url: '\n  ' },
    ];
    expect(publishedBlocks(noisy)).toEqual([]);
    expect(noisy.every(b => !blockHasDestination(b))).toBe(true);
  });
});

/** A saved config of switched-on rows that all go somewhere. */
const L = (...ids: string[]): RowSource[] =>
  ids.map(id => ({ id, on: true, url: 'https://x.test' }));

describe('ordering \u2014 the owner\u2019s, and nobody else\u2019s', () => {

  it('is the saved order, exactly', () => {
    const saved = L('reviews', 'order', 'menu', 'offers', 'shop', 'book', 'gallery');
    expect(publishedBlocks(saved).map(b => b.id))
      .toEqual(['reviews', 'order', 'menu', 'offers', 'shop', 'book', 'gallery']);
  });

  it('does not reshuffle a page whose owner has never touched the order', () => {
    // ROW_ORDER is what a NEW page starts in (see DEFAULT_BLOCKS); it is not
    // re-applied afterwards, or dragging a row would be undone on publish.
    const saved = L('menu', 'order', 'offers');
    expect(publishedBlocks(saved).map(b => b.id)).toEqual(['menu', 'order', 'offers']);
  });

  it('lets a custom link sit above a built-in if that is where it was put', () => {
    const saved = L('custom-z', 'reviews', 'custom-a', 'menu');
    expect(publishedBlocks(saved).map(b => b.id))
      .toEqual(['custom-z', 'reviews', 'custom-a', 'menu']);
  });

  it('never returns hours \u2014 the page renders it itself, pinned to the top', () => {
    expect(publishedBlocks(L('hours', 'menu')).map(b => b.id)).toEqual(['menu']);
  });
});

describe('offers as a row', () => {
  it('earns a row without a url, like photos and reviews', () => {
    expect(blockHasDestination({ id: 'offers' })).toBe(true);
    expect(publishedBlocks([{ id: 'offers', on: true }]).map(b => b.id)).toEqual(['offers']);
  });

  it('is dropped when switched off', () => {
    expect(publishedBlocks([{ id: 'offers', on: false }])).toEqual([]);
  });
});

describe('shop as a row', () => {
  it('needs a url, because it sends the customer away', () => {
    expect(blockHasDestination({ id: 'shop' })).toBe(false);
    expect(blockHasDestination({ id: 'shop', url: 'https://shop.test' })).toBe(true);
  });

  it('publishes wherever the owner put it', () => {
    const rows = publishedBlocks(L('order', 'shop', 'offers'));
    expect(rows.map(b => b.id)).toEqual(['order', 'shop', 'offers']);
  });
});
