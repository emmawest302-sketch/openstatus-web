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
