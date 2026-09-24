import { describe, it, expect } from 'vitest';
import { mergeSpecialPeriods, type SpecialPeriod } from './special-hours';

const d = (year: number, month: number, day: number) => ({ year, month, day });
const closedOn = (y: number, m: number, dd: number): SpecialPeriod =>
  ({ startDate: d(y, m, dd), endDate: d(y, m, dd), closed: true });
const dates = (ps: SpecialPeriod[]) => ps.map((p) => `${p.startDate.month}/${p.startDate.day}`);

const CHRISTMAS = closedOn(2026, 12, 25);
const THANKSGIVING = closedOn(2026, 11, 26);
const TODAY = d(2026, 9, 24);

describe('closing early today', () => {
  it('keeps the holidays the business already had', () => {
    const out = mergeSpecialPeriods({
      existing: [CHRISTMAS, THANKSGIVING],
      incoming: [closedOn(2026, 9, 24)],
      today: TODAY,
    });
    expect(dates(out)).toEqual(['9/24', '11/26', '12/25']);
  });

  it('replaces an exception already set for the same day', () => {
    const early = { startDate: d(2026,9,24), endDate: d(2026,9,24), openTime:{hours:9,minutes:0}, closeTime:{hours:15,minutes:0} };
    const out = mergeSpecialPeriods({
      existing: [closedOn(2026, 9, 24), CHRISTMAS],
      incoming: [early],
      today: TODAY,
    });
    expect(out).toHaveLength(2);
    expect(out[0].closeTime).toEqual({ hours: 15, minutes: 0 });
    expect(out[0].closed).toBeUndefined();
  });
});

describe('going back to normal', () => {
  it('removes only the cleared day, not the whole list', () => {
    // The bug: this used to send an empty array and delete everything.
    const out = mergeSpecialPeriods({
      existing: [closedOn(2026, 9, 24), CHRISTMAS, THANKSGIVING],
      incoming: [],
      clearDates: [d(2026, 9, 24)],
      today: TODAY,
    });
    expect(dates(out)).toEqual(['11/26', '12/25']);
  });

  it('clearing a day that has no exception changes nothing', () => {
    const out = mergeSpecialPeriods({
      existing: [CHRISTMAS], incoming: [], clearDates: [d(2026, 9, 24)], today: TODAY,
    });
    expect(dates(out)).toEqual(['12/25']);
  });
});

describe('housekeeping', () => {
  it('drops exceptions that have already passed', () => {
    const out = mergeSpecialPeriods({
      existing: [closedOn(2026, 1, 1), CHRISTMAS], incoming: [], today: TODAY,
    });
    expect(dates(out)).toEqual(['12/25']);
  });

  it('keeps an exception ending today', () => {
    const out = mergeSpecialPeriods({ existing: [closedOn(2026, 9, 24)], incoming: [], today: TODAY });
    expect(out).toHaveLength(1);
  });

  it('leaves everything alone when no today is given', () => {
    const out = mergeSpecialPeriods({ existing: [closedOn(2026, 1, 1), CHRISTMAS], incoming: [] });
    expect(out).toHaveLength(2);
  });

  it('returns them in date order', () => {
    const out = mergeSpecialPeriods({
      existing: [CHRISTMAS, THANKSGIVING], incoming: [closedOn(2026, 10, 5)], today: TODAY,
    });
    expect(dates(out)).toEqual(['10/5', '11/26', '12/25']);
  });

  it('discards malformed entries rather than sending them to Google', () => {
    const junk = [{ startDate: undefined, endDate: undefined } as unknown as SpecialPeriod, CHRISTMAS];
    expect(mergeSpecialPeriods({ existing: junk, incoming: [], today: TODAY })).toHaveLength(1);
  });
});

describe('multi-day closures', () => {
  it('a new range supersedes a single day inside it', () => {
    const week = { startDate: d(2026,10,1), endDate: d(2026,10,7), closed: true };
    const out = mergeSpecialPeriods({
      existing: [closedOn(2026, 10, 3), CHRISTMAS], incoming: [week], today: TODAY,
    });
    expect(dates(out)).toEqual(['10/1', '12/25']);
  });

  it('clearing a date inside a range removes that range', () => {
    const week = { startDate: d(2026,10,1), endDate: d(2026,10,7), closed: true };
    const out = mergeSpecialPeriods({
      existing: [week, CHRISTMAS], incoming: [], clearDates: [d(2026,10,4)], today: TODAY,
    });
    expect(dates(out)).toEqual(['12/25']);
  });
});
