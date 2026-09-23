/**
 * The single place that decides whether a business is open.
 *
 * Before this existed there were two clocks and two rules: the builder preview
 * computed "open" from the visitor's device time, while the public page used the
 * business row's timezone (falling back to America/Chicago, which nothing ever
 * set). An owner in New York editing a California shop could see a different
 * answer than their customers. Both now call this.
 *
 * It is a pure function of (instant, timezone, schedule) so it can be tested
 * without a browser, a database or a deployed page. See business-status.test.ts.
 */

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export type DayHours = { open?: string | null; close?: string | null; closed?: boolean };
export type WeeklySchedule = Partial<Record<DayKey, DayHours>>;

export type BusinessStatus = {
  /** 'unknown' means we have no schedule at all — never assert "closed" from missing data. */
  state: 'open' | 'closed' | 'unknown';
  /** "HH:MM" the business closes, when currently open. */
  closesAt: string | null;
  /** "HH:MM" it next opens, when currently closed and it opens later today. */
  opensAt: string | null;
  /** True when the current open period began yesterday (e.g. a bar open until 2am). */
  overnight: boolean;
  /** Local day in the business's timezone, 0 = Sunday. */
  dayIndex: number;
  /** Minutes past local midnight, in the business's timezone. */
  minutesNow: number;
};

/** "09:30" | "09:30:00" -> 570. Returns null for anything unparseable. */
export function toMinutes(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** 1500 -> "01:00" (wraps past midnight), so overnight closing times render sanely. */
export function fromMinutes(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/**
 * Where the clock actually is for this business, not for whoever is looking.
 * Falls back to the caller's own timezone only if the given one is invalid,
 * which is still better than silently pretending everyone is in Chicago.
 */
export function localParts(now: Date, timeZone: string): { dayIndex: number; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  }
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  const names: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    dayIndex: names[get('weekday')] ?? 0,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

type Period = { openMins: number; closeMins: number; overnight: boolean };

/** A day's opening window, or null if closed/invalid. closeMins may exceed 1440. */
function periodFor(day: DayHours | undefined): Period | null {
  if (!day || day.closed) return null;
  const openMins = toMinutes(day.open ?? '09:00');
  const rawClose = toMinutes(day.close ?? '17:00');
  if (openMins === null || rawClose === null) return null;
  if (rawClose === openMins) return null; // zero-length window is not "open"
  // A closing time at or before the opening time means it closes the next day:
  // 18:00 -> 02:00 is a real 8-hour period, not an invalid range.
  const overnight = rawClose < openMins;
  return { openMins, closeMins: overnight ? rawClose + 1440 : rawClose, overnight };
}

/**
 * Decide open/closed at a moment in time.
 *
 * Checks today's window and also yesterday's, because a period that started
 * yesterday evening can still be running now — the case that made a bar open
 * 6pm–2am show as closed at 1am.
 */
export function getBusinessStatus(
  now: Date,
  timeZone: string,
  weekly: WeeklySchedule | null | undefined
): BusinessStatus {
  const { dayIndex, minutes } = localParts(now, timeZone);

  if (!weekly || Object.keys(weekly).length === 0) {
    return { state: 'unknown', closesAt: null, opensAt: null, overnight: false, dayIndex, minutesNow: minutes };
  }

  // Still inside a window that opened yesterday?
  const yesterday = periodFor(weekly[DAY_KEYS[(dayIndex + 6) % 7]]);
  if (yesterday?.overnight && minutes < yesterday.closeMins - 1440) {
    return {
      state: 'open',
      closesAt: fromMinutes(yesterday.closeMins),
      opensAt: null,
      overnight: true,
      dayIndex,
      minutesNow: minutes,
    };
  }

  const today = periodFor(weekly[DAY_KEYS[dayIndex]]);
  if (!today) {
    return { state: 'closed', closesAt: null, opensAt: null, overnight: false, dayIndex, minutesNow: minutes };
  }

  if (minutes >= today.openMins && minutes < today.closeMins) {
    return {
      state: 'open',
      closesAt: fromMinutes(today.closeMins),
      opensAt: null,
      overnight: today.overnight,
      dayIndex,
      minutesNow: minutes,
    };
  }

  return {
    state: 'closed',
    closesAt: null,
    opensAt: minutes < today.openMins ? fromMinutes(today.openMins) : null,
    overnight: false,
    dayIndex,
    minutesNow: minutes,
  };
}

/** Rows as stored in business_hours -> the shape this module works with. */
export function weeklyFromRows(
  rows: { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean }[]
): WeeklySchedule | null {
  if (!rows.length) return null;
  const weekly: WeeklySchedule = {};
  for (const row of rows) {
    const key = DAY_KEYS[row.day_of_week];
    if (!key) continue;
    weekly[key] = { open: row.opens_at, close: row.closes_at, closed: row.is_closed };
  }
  return weekly;
}
