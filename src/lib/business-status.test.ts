import { describe, it, expect } from 'vitest';
import { getBusinessStatus, applyOverride, toMinutes, fromMinutes, weeklyFromRows, type WeeklySchedule } from './business-status';

/**
 * These cases are the ones that can make OpenStatus tell a customer something
 * untrue. They are written as real-world scenarios rather than unit trivia,
 * because that is how the bugs actually showed up.
 */

const NINE_TO_FIVE: WeeklySchedule = {
  sun: { closed: true },
  mon: { open: '09:00', close: '17:00' },
  tue: { open: '09:00', close: '17:00' },
  wed: { open: '09:00', close: '17:00' },
  thu: { open: '09:00', close: '17:00' },
  fri: { open: '09:00', close: '17:00' },
  sat: { open: '09:00', close: '17:00' },
};

// A bar: opens in the evening, closes at 2am the following morning.
const LATE_BAR: WeeklySchedule = {
  sun: { closed: true },
  mon: { closed: true },
  tue: { closed: true },
  wed: { closed: true },
  thu: { closed: true },
  fri: { open: '18:00', close: '02:00' },
  sat: { open: '18:00', close: '02:00' },
};

describe('time parsing', () => {
  it('reads both HH:MM and HH:MM:SS, as stored in business_hours', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('09:30:00')).toBe(570);
  });

  it('rejects nonsense rather than guessing', () => {
    expect(toMinutes('')).toBeNull();
    expect(toMinutes('25:00')).toBeNull();
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes(undefined)).toBeNull();
  });

  it('wraps past midnight when formatting', () => {
    expect(fromMinutes(1560)).toBe('02:00'); // 26:00 -> 2am
  });
});

describe('a normal 9-5 shop', () => {
  it('is open at 10am local time', () => {
    // 2026-09-23 is a Wednesday. 15:00 UTC = 10:00 in Nashville (CDT).
    const s = getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'America/Chicago', NINE_TO_FIVE);
    expect(s.state).toBe('open');
    expect(s.closesAt).toBe('17:00');
  });

  it('is closed at 8am, and says when it opens', () => {
    const s = getBusinessStatus(new Date('2026-09-23T13:00:00Z'), 'America/Chicago', NINE_TO_FIVE);
    expect(s.state).toBe('closed');
    expect(s.opensAt).toBe('09:00');
  });

  it('is closed on its closed day', () => {
    // Sunday 2026-09-20, 16:00 UTC = 11:00 Chicago.
    const s = getBusinessStatus(new Date('2026-09-20T16:00:00Z'), 'America/Chicago', NINE_TO_FIVE);
    expect(s.state).toBe('closed');
  });
});

describe('timezone is the business’s, not the viewer’s', () => {
  it('a California shop is still shut at 8am Pacific, even though it is 11am Eastern', () => {
    // 15:00 UTC = 08:00 Los Angeles = 11:00 New York.
    const instant = new Date('2026-09-23T15:00:00Z');
    expect(getBusinessStatus(instant, 'America/Los_Angeles', NINE_TO_FIVE).state).toBe('closed');
    expect(getBusinessStatus(instant, 'America/New_York', NINE_TO_FIVE).state).toBe('open');
  });

  it('falls back sanely instead of throwing on a bad timezone', () => {
    const s = getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'Not/AZone', NINE_TO_FIVE);
    expect(['open', 'closed']).toContain(s.state);
  });
});

describe('overnight hours (the 6pm–2am case)', () => {
  it('is open at 8pm Friday', () => {
    // Friday 2026-09-25, 01:00 UTC Sat = 20:00 Fri Chicago.
    const s = getBusinessStatus(new Date('2026-09-26T01:00:00Z'), 'America/Chicago', LATE_BAR);
    expect(s.state).toBe('open');
  });

  it('is STILL open at 1am Saturday — this is the bug that showed bars as closed', () => {
    // 06:00 UTC Sat = 01:00 Sat Chicago, inside Friday's 18:00->02:00 window.
    const s = getBusinessStatus(new Date('2026-09-26T06:00:00Z'), 'America/Chicago', LATE_BAR);
    expect(s.state).toBe('open');
    expect(s.overnight).toBe(true);
    expect(s.closesAt).toBe('02:00');
  });

  it('is closed at 3am Saturday, after the window ends', () => {
    const s = getBusinessStatus(new Date('2026-09-26T08:00:00Z'), 'America/Chicago', LATE_BAR);
    expect(s.state).toBe('closed');
  });

  it('is closed at 1am Friday — Thursday never opened, so nothing spills over', () => {
    // 06:00 UTC Fri = 01:00 Fri Chicago. Thursday is closed.
    const s = getBusinessStatus(new Date('2026-09-25T06:00:00Z'), 'America/Chicago', LATE_BAR);
    expect(s.state).toBe('closed');
  });
});

describe('missing or broken data', () => {
  it('reports unknown rather than asserting closed when there is no schedule', () => {
    expect(getBusinessStatus(new Date(), 'America/Chicago', null).state).toBe('unknown');
    expect(getBusinessStatus(new Date(), 'America/Chicago', {}).state).toBe('unknown');
  });

  it('treats a zero-length window as closed, not open all day', () => {
    const weird: WeeklySchedule = { wed: { open: '09:00', close: '09:00' } };
    expect(getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'America/Chicago', weird).state).toBe('closed');
  });
});

describe('weeklyFromRows', () => {
  it('maps business_hours rows onto day keys', () => {
    const weekly = weeklyFromRows([
      { day_of_week: 3, opens_at: '09:00:00', closes_at: '17:00:00', is_closed: false },
    ]);
    expect(weekly?.wed).toEqual({ open: '09:00:00', close: '17:00:00', closed: false });
  });

  it('returns null for an empty table, so callers can say "hours not set"', () => {
    expect(weeklyFromRows([])).toBeNull();
  });
});

describe('today’s override folded onto the schedule', () => {
  const base = () => getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'America/Chicago', NINE_TO_FIVE); // 10am, open

  it('leaves the schedule alone when there is no override', () => {
    expect(applyOverride(base(), null).state).toBe('open');
    expect(applyOverride(base(), undefined).state).toBe('open');
  });

  it('"closed today" closes a shop that is otherwise open', () => {
    // This is the case the builder preview was missing: Status said closed,
    // the Hours block still said Open.
    const s = applyOverride(base(), { kind: 'closed' });
    expect(s.state).toBe('closed');
    expect(s.closesAt).toBeNull();
  });

  it('an early close before now closes the shop', () => {
    const s = applyOverride(base(), { closesAt: '09:30' }); // now is 10:00
    expect(s.state).toBe('closed');
  });

  it('an early close later today keeps it open, with the new closing time', () => {
    const s = applyOverride(base(), { closesAt: '15:00' });
    expect(s.state).toBe('open');
    expect(s.closesAt).toBe('15:00');
  });

  it('custom hours for today can open a shop later than usual', () => {
    const s = applyOverride(base(), { opensAt: '12:00', closesAt: '16:00' }); // now 10:00
    expect(s.state).toBe('closed');
    expect(s.opensAt).toBe('12:00');
  });

  it('custom hours covering now report open', () => {
    const s = applyOverride(base(), { opensAt: '08:00', closesAt: '16:00' });
    expect(s.state).toBe('open');
    expect(s.closesAt).toBe('16:00');
  });

  it('never invents a schedule when hours are unknown', () => {
    const unknown = getBusinessStatus(new Date(), 'America/Chicago', null);
    expect(applyOverride(unknown, { closesAt: '15:00' }).state).toBe('unknown');
  });
});

/**
 * Both cases below were found by review, not by these tests — they are here so
 * they cannot come back. The distinction that matters: one end of an override
 * NARROWS the regular schedule, both ends REPLACE it.
 */
describe('partial override narrows, it never opens a closed shop', () => {
  it('an early close at 3 does not make a 9-5 shop open at 8am', () => {
    // 13:00 UTC = 08:00 Chicago, before the 09:00 opening.
    const base = getBusinessStatus(new Date('2026-09-23T13:00:00Z'), 'America/Chicago', NINE_TO_FIVE);
    expect(base.state).toBe('closed');
    const s = applyOverride(base, { closesAt: '15:00' });
    expect(s.state).toBe('closed');
    expect(s.opensAt).toBe('09:00');
  });

  it('an early close still closes the shop once the new time passes', () => {
    // 21:00 UTC = 16:00 Chicago, after a 15:00 early close.
    const base = getBusinessStatus(new Date('2026-09-23T21:00:00Z'), 'America/Chicago', NINE_TO_FIVE);
    expect(applyOverride(base, { closesAt: '15:00' }).state).toBe('closed');
  });

  it('an early close leaves the shop open before it, with the earlier time', () => {
    const base = getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'America/Chicago', NINE_TO_FIVE); // 10am
    const s = applyOverride(base, { closesAt: '15:00' });
    expect(s.state).toBe('open');
    expect(s.closesAt).toBe('15:00');
  });

  it('opening late does not open the shop before the later time', () => {
    const base = getBusinessStatus(new Date('2026-09-23T15:00:00Z'), 'America/Chicago', NINE_TO_FIVE); // 10am
    const s = applyOverride(base, { opensAt: '11:00' });
    expect(s.state).toBe('closed');
    expect(s.opensAt).toBe('11:00');
  });
});

describe('full override replaces the schedule', () => {
  // Sunday is closed in NINE_TO_FIVE.
  const sundayAt = (utc: string) => getBusinessStatus(new Date(utc), 'America/Chicago', NINE_TO_FIVE);

  it('custom hours 12-4 open a normally closed day, at 1pm', () => {
    // Sunday 2026-09-20, 18:00 UTC = 13:00 Chicago.
    const base = sundayAt('2026-09-20T18:00:00Z');
    expect(base.state).toBe('closed');
    const s = applyOverride(base, { opensAt: '12:00', closesAt: '16:00' });
    expect(s.state).toBe('open');
    expect(s.closesAt).toBe('16:00');
  });

  it('but not before those hours start', () => {
    // Sunday 15:00 UTC = 10:00 Chicago.
    const s = applyOverride(sundayAt('2026-09-20T15:00:00Z'), { opensAt: '12:00', closesAt: '16:00' });
    expect(s.state).toBe('closed');
    expect(s.opensAt).toBe('12:00');
  });

  it('and not after they end', () => {
    // Sunday 22:00 UTC = 17:00 Chicago.
    expect(applyOverride(sundayAt('2026-09-20T22:00:00Z'), { opensAt: '12:00', closesAt: '16:00' }).state).toBe('closed');
  });

  it('"closed today" still wins over custom hours', () => {
    const s = applyOverride(sundayAt('2026-09-20T18:00:00Z'), { kind: 'closed', opensAt: '12:00', closesAt: '16:00' });
    expect(s.state).toBe('closed');
  });
});
