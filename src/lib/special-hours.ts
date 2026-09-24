/**
 * Merging dated exceptions into a Google Business Profile.
 *
 * Google's PATCH with updateMask=specialHours REPLACES the whole
 * specialHourPeriods array. It does not merge entries. So sending just
 * "closed today" silently deletes every other exception the business has —
 * Christmas, Thanksgiving, the week they're on holiday in March.
 *
 * Worse, clearing today's override used to send an empty array, which wiped
 * the lot. A business could lose a year of carefully entered holiday closures
 * by tapping "back to normal".
 *
 * So: read what Google has, change only the dates we mean to change, and
 * write the whole array back.
 */

export type GDate = { year: number; month: number; day: number };
export type GTime = { hours: number; minutes: number };

export type SpecialPeriod = {
  startDate: GDate;
  endDate: GDate;
  openTime?: GTime;
  closeTime?: GTime;
  closed?: boolean;
};

/** Sortable YYYYMMDD. */
export function dateKey(d: GDate): number {
  return d.year * 10000 + d.month * 100 + d.day;
}

export function sameDate(a: GDate, b: GDate): boolean {
  return dateKey(a) === dateKey(b);
}

/** True when the period covers the given day. */
function covers(period: SpecialPeriod, day: GDate): boolean {
  const k = dateKey(day);
  return dateKey(period.startDate) <= k && k <= dateKey(period.endDate);
}

/**
 * True when two periods share any day.
 *
 * Checking only whether one contains the other's start or end date is not
 * enough: a one-day exception sitting in the MIDDLE of a new week-long
 * closure matches neither endpoint, so it survived and Google was left
 * holding two contradictory entries for that day.
 */
function overlaps(a: SpecialPeriod, b: SpecialPeriod): boolean {
  return dateKey(a.startDate) <= dateKey(b.endDate)
      && dateKey(b.startDate) <= dateKey(a.endDate);
}

export type MergeInput = {
  /** What Google currently holds. */
  existing: SpecialPeriod[];
  /** Exceptions to add or replace. */
  incoming: SpecialPeriod[];
  /** Dates whose exception should be removed. */
  clearDates?: GDate[];
  /** Today in the business's own timezone; anything ending before it is dropped. */
  today?: GDate;
};

export function mergeSpecialPeriods({
  existing, incoming, clearDates = [], today,
}: MergeInput): SpecialPeriod[] {
  const valid = (p: SpecialPeriod | undefined | null): p is SpecialPeriod =>
    !!p && !!p.startDate && !!p.endDate && Number.isFinite(dateKey(p.startDate));

  const kept = existing.filter((p) => {
    if (!valid(p)) return false;

    // Expired. Google keeps these forever otherwise, and the list only grows.
    if (today && dateKey(p.endDate) < dateKey(today)) return false;

    // Explicitly cleared.
    if (clearDates.some((d) => covers(p, d))) return false;

    // Superseded by something we are writing now.
    if (incoming.some((n) => overlaps(p, n))) return false;

    return true;
  });

  return [...kept, ...incoming.filter(valid)]
    .sort((a, b) => dateKey(a.startDate) - dateKey(b.startDate));
}
