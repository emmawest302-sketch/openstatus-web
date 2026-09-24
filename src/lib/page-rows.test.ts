import { describe, it, expect } from 'vitest';
import { resolveRows, affordanceFor, ROW_ORDER, HEADER_ACTION_IDS, type RowSource } from './page-rows';

const ids = (rows: ReturnType<typeof resolveRows>) => rows.map(r => r.block?.id ?? r.id);

const FULL: RowSource[] = [
  { id: 'hours', on: true },
  { id: 'menu', on: true, url: 'https://example.com/menu' },
  { id: 'order', on: true, url: 'https://doordash.com/x' },
  { id: 'book', on: true, url: 'https://resy.com/x' },
];

describe('a page only shows what it has', () => {
  it('hides Photos when there are none', () => {
    expect(ids(resolveRows(FULL, { photoCount: 0 }))).not.toContain('photos');
  });

  it('shows Photos once there are some, from Google or uploaded', () => {
    expect(ids(resolveRows(FULL, { photoCount: 4 }))).toContain('photos');
  });

  it('hides Reviews rather than rendering an empty one', () => {
    expect(ids(resolveRows(FULL, { reviewCount: 0 }))).not.toContain('reviews');
    expect(ids(resolveRows(FULL, { reviewCount: 1 }))).toContain('reviews');
  });

  it('hides a Menu row that opens nothing', () => {
    const noMenu = [{ id: 'hours', on: true }, { id: 'menu', on: true }];
    expect(ids(resolveRows(noMenu))).not.toContain('menu');
  });

  it('shows Menu for a PDF, a link, or structured Google data', () => {
    expect(ids(resolveRows([{ id: 'menu', on: true, menuFile: 'menu.pdf' }]))).toContain('menu');
    expect(ids(resolveRows([{ id: 'menu', on: true, url: 'https://x.com/m' }]))).toContain('menu');
    expect(ids(resolveRows([{ id: 'menu', on: true }], { hasMenu: true }))).toContain('menu');
  });

  it('hides ordering and booking with no provider link', () => {
    const bare = [{ id: 'order', on: true }, { id: 'book', on: true }];
    expect(ids(resolveRows(bare))).toEqual(['hours']);
  });
});

describe('hours is the product', () => {
  it('appears even when the owner has no hours block at all', () => {
    expect(ids(resolveRows([]))).toContain('hours');
  });

  it('cannot be switched off', () => {
    expect(ids(resolveRows([{ id: 'hours', on: false }]))).toContain('hours');
  });

  it('is always first', () => {
    const rows = resolveRows(FULL, { photoCount: 3, reviewCount: 9 });
    expect(rows[0].id).toBe('hours');
    expect(rows[0].pinned).toBe(true);
  });
});

describe('order', () => {
  it('follows the default regardless of how the blocks are stored', () => {
    const shuffled: RowSource[] = [
      { id: 'book', on: true, url: 'https://resy.com/x' },
      { id: 'menu', on: true, url: 'https://example.com/menu' },
      { id: 'hours', on: true },
      { id: 'order', on: true, url: 'https://doordash.com/x' },
    ];
    expect(ids(resolveRows(shuffled, { photoCount: 2, reviewCount: 5 })))
      .toEqual(['hours', 'photos', 'menu', 'order', 'book', 'reviews']);
  });

  it('puts custom links last, in the owner’s own order', () => {
    const withCustom: RowSource[] = [
      ...FULL,
      { id: 'custom-2', on: true, url: 'https://x.com/b' },
      { id: 'custom-1', on: true, url: 'https://x.com/a' },
    ];
    expect(ids(resolveRows(withCustom)).slice(-2)).toEqual(['custom-2', 'custom-1']);
  });

  it('respects a switched-off row', () => {
    const off = FULL.map(b => b.id === 'menu' ? { ...b, on: false } : b);
    expect(ids(resolveRows(off))).not.toContain('menu');
  });
});

describe('the header owns website and directions', () => {
  it('never renders them as rows', () => {
    const rows = ids(resolveRows([
      { id: 'website', on: true, url: 'https://example.com' },
      { id: 'location', on: true, url: 'https://maps.google.com/x' },
    ]));
    expect(rows).not.toContain('website');
    expect(rows).not.toContain('location');
  });

  it('names them so the page and the builder agree', () => {
    expect(HEADER_ACTION_IDS.has('website')).toBe(true);
    expect(HEADER_ACTION_IDS.has('location')).toBe(true);
    expect(HEADER_ACTION_IDS.has('menu')).toBe(false);
  });
});

describe('chevrons', () => {
  it('points down for anything that opens in place', () => {
    for (const id of ['hours', 'photos', 'menu', 'reviews'] as const) {
      expect(affordanceFor(id)).toBe('expand');
    }
  });

  it('uses an arrow only when the customer is leaving', () => {
    for (const id of ['order', 'book', 'custom'] as const) {
      expect(affordanceFor(id)).toBe('leave');
    }
  });
});

describe('the model itself', () => {
  it('has no duplicate rows in the default order', () => {
    expect(new Set(ROW_ORDER).size).toBe(ROW_ORDER.length);
  });

  it('never returns a row twice for one page', () => {
    const rows = ids(resolveRows(FULL, { photoCount: 3, reviewCount: 5 }));
    expect(new Set(rows).size).toBe(rows.length);
  });
});
