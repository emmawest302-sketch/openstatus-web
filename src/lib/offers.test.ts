import { describe, it, expect } from 'vitest';
import { activeOffers, isExpired, expiryLabel, offersLabel, localDay, newOfferId, type Offer } from './offers';

const o = (x: Partial<Offer>): Offer => ({ id: 'o1', title: '10% off', ...x });

describe('expiry', () => {
  it('is inclusive of the last day', () => {
    // "Valid through Nov 30" has to still work on Nov 30, because that is what
    // the customer will say at the counter.
    expect(isExpired(o({ expiresAt: '2026-11-30' }), '2026-11-30')).toBe(false);
    expect(isExpired(o({ expiresAt: '2026-11-30' }), '2026-12-01')).toBe(true);
  });

  it('treats no expiry as never expiring', () => {
    expect(isExpired(o({}), '2026-11-30')).toBe(false);
    expect(isExpired(o({ expiresAt: '   ' }), '2026-11-30')).toBe(false);
  });

  it('keeps an offer whose date is malformed rather than silently dropping it', () => {
    expect(isExpired(o({ expiresAt: '30/11/2026' }), '2026-12-25')).toBe(false);
  });
});

describe('activeOffers', () => {
  it('hides expired, switched-off and untitled offers', () => {
    const list = [
      o({ id: 'a', title: 'Live one' }),
      o({ id: 'b', title: 'Old one', expiresAt: '2020-01-01' }),
      o({ id: 'c', title: 'Paused', on: false }),
      o({ id: 'd', title: '   ' }),
    ];
    expect(activeOffers(list, '2026-06-01').map(x => x.id)).toEqual(['a']);
  });

  it('keeps the owner’s order', () => {
    const list = [o({ id: 'x', title: 'X' }), o({ id: 'y', title: 'Y' })];
    expect(activeOffers(list, '2026-06-01').map(x => x.id)).toEqual(['x', 'y']);
  });

  it('is empty, not a crash, for a config with no offers', () => {
    expect(activeOffers(undefined, '2026-06-01')).toEqual([]);
    expect(activeOffers([], '2026-06-01')).toEqual([]);
  });
});

describe('expiryLabel', () => {
  it('drops the year when it is this year', () => {
    expect(expiryLabel('2026-11-30', '2026-06-01')).toBe('Valid through Nov 30');
  });

  it('keeps the year when it is not', () => {
    expect(expiryLabel('2027-01-05', '2026-06-01')).toBe('Valid through Jan 5, 2027');
  });

  it('does not let a timezone move the date backwards', () => {
    // A calendar date has no time. Formatting it in a western zone used to
    // turn Nov 30 into Nov 29.
    expect(expiryLabel('2026-11-30', '2026-01-01')).toContain('Nov 30');
  });

  it('is null for nothing and for nonsense', () => {
    expect(expiryLabel(undefined, '2026-06-01')).toBeNull();
    expect(expiryLabel('soon', '2026-06-01')).toBeNull();
  });
});

describe('the small stuff', () => {
  it('labels the count plainly', () => {
    expect(offersLabel(1)).toBe('1 available');
    expect(offersLabel(2)).toBe('2 available');
  });

  it('reads today in the business timezone, not the server’s', () => {
    // 03:00 UTC is still the previous day in Chicago.
    const at = new Date('2026-01-06T03:00:00Z');
    expect(localDay(at, 'America/Chicago')).toBe('2026-01-05');
    expect(localDay(at, 'UTC')).toBe('2026-01-06');
  });

  it('mints ids that do not collide', () => {
    expect(new Set(Array.from({ length: 200 }, newOfferId)).size).toBe(200);
  });
});
