import { describe, it, expect } from 'vitest';
import {
  googlePlanForToday, pagePlanForToday, samePlan, describePlan,
  type GooglePeriod,
} from './google-sync';

const TODAY = { year: 2026, month: 9, day: 24 };
const d = (year: number, month: number, day: number) => ({ year, month, day });

describe('what Google says about today', () => {
  it('is normal hours when there is no exception', () => {
    expect(googlePlanForToday([], TODAY)).toEqual({ kind: 'normal' });
  });

  it('is closed when today carries a closed period', () => {
    const periods: GooglePeriod[] = [{ startDate: TODAY, endDate: TODAY, closed: true }];
    expect(googlePlanForToday(periods, TODAY)).toEqual({ kind: 'closed' });
  });

  it('treats a single-day period with no endDate as covering that day', () => {
    expect(googlePlanForToday([{ startDate: TODAY, closed: true }], TODAY))
      .toEqual({ kind: 'closed' });
  });

  it('reads a timed exception as those hours', () => {
    const periods: GooglePeriod[] = [{
      startDate: TODAY, endDate: TODAY,
      openTime: { hours: 9, minutes: 0 }, closeTime: { hours: 14, minutes: 30 },
    }];
    expect(googlePlanForToday(periods, TODAY)).toEqual({ kind: 'hours', open: '09:00', close: '14:30' });
  });

  it('ignores a period for another day', () => {
    const periods: GooglePeriod[] = [{ startDate: d(2026, 12, 25), endDate: d(2026, 12, 25), closed: true }];
    expect(googlePlanForToday(periods, TODAY)).toEqual({ kind: 'normal' });
  });

  it('honours a multi-day range that spans today', () => {
    const periods: GooglePeriod[] = [{ startDate: d(2026, 9, 20), endDate: d(2026, 9, 28), closed: true }];
    expect(googlePlanForToday(periods, TODAY)).toEqual({ kind: 'closed' });
  });

  it('lets the later period win when two overlap, the way Google does', () => {
    const periods: GooglePeriod[] = [
      { startDate: TODAY, endDate: TODAY, closed: true },
      { startDate: TODAY, endDate: TODAY, openTime: { hours: 10 }, closeTime: { hours: 16 } },
    ];
    expect(googlePlanForToday(periods, TODAY)).toEqual({ kind: 'hours', open: '10:00', close: '16:00' });
  });

  it('is closed outright when the listing is temporarily closed, whatever the hours say', () => {
    const periods: GooglePeriod[] = [{ startDate: TODAY, openTime: { hours: 9 }, closeTime: { hours: 17 } }];
    expect(googlePlanForToday(periods, TODAY, true)).toEqual({ kind: 'closed' });
  });

  it('treats an exception with no usable times as a closure, not as open', () => {
    // Safer to over-report a closure than to tell an owner they match when a
    // customer is being shown something we could not parse.
    expect(googlePlanForToday([{ startDate: TODAY, closed: false }], TODAY))
      .toEqual({ kind: 'closed' });
  });
});

describe('what the page says about today', () => {
  it('is normal with no override', () => {
    expect(pagePlanForToday(null)).toEqual({ kind: 'normal' });
  });

  it('is closed for a closed_today override', () => {
    expect(pagePlanForToday({ kind: 'closed' })).toEqual({ kind: 'closed' });
  });

  it('fills an early close from the regular opening time', () => {
    expect(pagePlanForToday({ kind: 'hours', closesAt: '15:00' }, '08:00'))
      .toEqual({ kind: 'hours', open: '08:00', close: '15:00' });
  });

  it('uses both ends when the owner set both', () => {
    expect(pagePlanForToday({ kind: 'hours', opensAt: '11:00', closesAt: '15:00' }, '08:00'))
      .toEqual({ kind: 'hours', open: '11:00', close: '15:00' });
  });

  it('treats a note for today as no hours change at all', () => {
    expect(pagePlanForToday({ kind: 'other' })).toEqual({ kind: 'normal' });
  });
});

describe('the comparison itself', () => {
  it('catches the bug that started this: Google shut, page open', () => {
    const google = googlePlanForToday([{ startDate: TODAY, closed: true }], TODAY);
    const page = pagePlanForToday(null);
    expect(samePlan(google, page)).toBe(false);
    expect(describePlan(google)).toBe('closed today');
    expect(describePlan(page)).toBe('your normal hours');
  });

  it('agrees when both are closed', () => {
    expect(samePlan({ kind: 'closed' }, { kind: 'closed' })).toBe(true);
  });

  it('agrees when both carry the same window', () => {
    expect(samePlan({ kind: 'hours', open: '09:00', close: '15:00' },
                    { kind: 'hours', open: '09:00', close: '15:00' })).toBe(true);
  });

  it('disagrees on different closing times', () => {
    expect(samePlan({ kind: 'hours', open: '09:00', close: '15:00' },
                    { kind: 'hours', open: '09:00', close: '17:00' })).toBe(false);
  });

  it('reads the times back the way an owner writes them', () => {
    expect(describePlan({ kind: 'hours', open: '09:00', close: '14:30' })).toBe('open 9:00 AM – 2:30 PM');
    expect(describePlan({ kind: 'hours', open: '00:00', close: '12:05' })).toBe('open 12:00 AM – 12:05 PM');
  });
});

describe('the two sides speak different time dialects', () => {
  it('treats a Postgres time and a Google time as the same moment', () => {
    // status_updates.closes_at is a `time` column, so it arrives as
    // "19:30:00". Google gives {hours:19, minutes:30}. Both rendered "7:30 PM"
    // on screen, so the card told an owner the two disagreed and then quoted
    // her identical times.
    const google = googlePlanForToday(
      [{ startDate: TODAY, openTime: { hours: 9, minutes: 0 }, closeTime: { hours: 19, minutes: 30 } }],
      TODAY,
    );
    const page = pagePlanForToday({ kind: 'hours', opensAt: '09:00:00', closesAt: '19:30:00' });
    expect(page).toEqual({ kind: 'hours', open: '09:00', close: '19:30' });
    expect(samePlan(google, page)).toBe(true);
  });

  it('pads a single-digit hour', () => {
    expect(pagePlanForToday({ kind: 'hours', opensAt: '9:00', closesAt: '17:00' }))
      .toEqual({ kind: 'hours', open: '09:00', close: '17:00' });
  });

  it('normalises the regular opening time it falls back to', () => {
    // An early close carries only a closing time, so the opening comes from
    // the weekly schedule — a different table, and not necessarily the same
    // string format.
    expect(pagePlanForToday({ kind: 'hours', closesAt: '15:00:00' }, '08:00:00'))
      .toEqual({ kind: 'hours', open: '08:00', close: '15:00' });
  });

  it('still reports a real difference', () => {
    const google = googlePlanForToday([{ startDate: TODAY, openTime: { hours: 9 }, closeTime: { hours: 17 } }], TODAY);
    const page = pagePlanForToday({ kind: 'hours', opensAt: '09:00:00', closesAt: '19:30:00' });
    expect(samePlan(google, page)).toBe(false);
  });

  it('ignores junk rather than inventing a window from it', () => {
    expect(pagePlanForToday({ kind: 'hours', opensAt: 'later', closesAt: '19:30:00' })).toEqual({ kind: 'normal' });
  });
});
