/**
 * Does Google agree with the page?
 *
 * OpenStatus pushes to Google and never reads back, so the two drift in ways
 * nobody notices until a customer does. The case that bit: "Closed today" wrote
 * a dated closure onto the listing, "I'm open again" cleared the OpenStatus row
 * and left the listing shut. Google Maps said closed, the page said open, and
 * nothing anywhere said they disagreed.
 *
 * Pushing harder is not the fix — a one-way sync that is wrong is wrong
 * silently. So this compares the two and lets the UI say so out loud.
 *
 * Deliberately narrow. We compare only what Google's status read actually
 * returns: today's specialHours exception, and the temporarily-closed flag.
 * Regular weekly hours are pushed on every save and are not re-read, so
 * pretending to compare them would mean inventing Google's side of it.
 */

export type GDate = { year: number; month: number; day: number };

export interface GooglePeriod {
  startDate?: GDate | null;
  endDate?: GDate | null;
  closed?: boolean | null;
  openTime?: { hours?: number; minutes?: number } | null;
  closeTime?: { hours?: number; minutes?: number } | null;
}

/** What one surface says about today. */
export type DayPlan =
  | { kind: 'normal' }
  | { kind: 'closed' }
  | { kind: 'hours'; open: string; close: string };

const NORMAL: DayPlan = { kind: 'normal' };

function ord(d: GDate | null | undefined): number | null {
  if (!d || !d.year || !d.month || !d.day) return null;
  return d.year * 10000 + d.month * 100 + d.day;
}

/** Google omits endDate on a single-day period, meaning "same as start". */
function covers(p: GooglePeriod, day: number): boolean {
  const start = ord(p.startDate);
  if (start === null) return false;
  const end = ord(p.endDate) ?? start;
  return day >= start && day <= end;
}

function hhmm(t: { hours?: number; minutes?: number } | null | undefined): string | null {
  if (!t) return null;
  const h = t.hours ?? 0;
  const m = t.minutes ?? 0;
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * What Google will tell a customer today.
 *
 * `temporarilyClosed` wins over everything: a listing in that state reads as
 * shut whatever its hours say, which is exactly why the product never sets it.
 */
export function googlePlanForToday(
  periods: GooglePeriod[] | null | undefined,
  today: GDate,
  temporarilyClosed = false,
): DayPlan {
  if (temporarilyClosed) return { kind: 'closed' };
  const day = ord(today);
  if (day === null) return NORMAL;
  // Last match wins, which is how Google resolves overlapping periods.
  let plan: DayPlan = NORMAL;
  for (const p of periods ?? []) {
    if (!covers(p, day)) continue;
    if (p.closed) { plan = { kind: 'closed' }; continue; }
    const open = hhmm(p.openTime);
    const close = hhmm(p.closeTime);
    plan = open && close ? { kind: 'hours', open, close } : { kind: 'closed' };
  }
  return plan;
}

/**
 * What the OpenStatus page says about today.
 *
 * An early close carries only a closing time — the day still opens on the
 * regular schedule — so the regular opening is passed in rather than guessed.
 */
/**
 * Reduce a clock time to HH:MM.
 *
 * Postgres hands back a `time` column as "19:30:00". Google's API gives
 * {hours:19, minutes:30}, which we render as "19:30". Both describe the same
 * moment and both printed "7:30 PM" on screen, so the mismatch card announced
 * that Google and the page disagreed and then quoted two identical times at
 * the owner. Comparing formatted strings is the bug; comparing normalised ones
 * is the fix.
 */
function hhmmOnly(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export function pagePlanForToday(
  override: { kind?: string | null; opensAt?: string | null; closesAt?: string | null } | null | undefined,
  regularOpen?: string | null,
): DayPlan {
  if (!override) return NORMAL;
  if (override.kind === 'closed') return { kind: 'closed' };
  const open = hhmmOnly(override.opensAt) ?? hhmmOnly(regularOpen);
  const close = hhmmOnly(override.closesAt);
  if (open && close) return { kind: 'hours', open, close };
  // A note for today is not an hours change.
  return NORMAL;
}

export function samePlan(a: DayPlan, b: DayPlan): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'hours' && b.kind === 'hours') return a.open === b.open && a.close === b.close;
  return true;
}

function pretty(t: string): string {
  const [hs, ms] = t.split(':');
  let h = Number(hs);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${ms} ${meridiem}`;
}

/** One phrase, for a sentence that already says whose side it is. */
export function describePlan(p: DayPlan): string {
  if (p.kind === 'closed') return 'closed today';
  if (p.kind === 'hours') return `open ${pretty(p.open)} – ${pretty(p.close)}`;
  return 'your normal hours';
}
