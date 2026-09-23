/**
 * Reads a social post caption and works out whether the business is telling
 * its customers about a change to TODAY's hours.
 *
 * Design notes, because the rules here are deliberate rather than obvious:
 *
 * 1. This file is pure. No network, no API keys, no database. That means the
 *    whole thing can be tested offline against real captions, and anyone can
 *    read it and see exactly what it will do. No AI is required to maintain it.
 *
 * 2. It will never say a business is permanently or indefinitely closed.
 *    OpenStatus once pushed a "temporarily closed" state to a real Google
 *    listing and the owner had to file a Suggest An Edit appeal to undo it.
 *    That must not be possible again, so permanent-sounding captions are
 *    detected and then deliberately dropped. Only today's opening and closing
 *    times can ever change.
 *
 * 3. It is built to be wrong in the safe direction. A missed "closing early"
 *    costs a customer a wasted trip. A false one closes a shop that is open
 *    and full of people. So anything short of clear gets handed back to the
 *    owner to confirm rather than applied.
 */

import type { DayKey } from './business-status';

export type IntentAction =
  | 'none'
  | 'close_today'
  | 'close_early'
  | 'open_late'
  | 'custom_hours'
  | 'reopen';

export type BlockedReason = 'permanent_closure' | 'future_date' | 'ambiguous';

export type HoursIntent = {
  action: IntentAction;
  /** 0 to 1. See AUTO_APPLY_THRESHOLD. */
  confidence: number;
  /** "HH:MM" local time, or null when this intent does not set one. */
  opensAt: string | null;
  closesAt: string | null;
  /** Plain English, shown to the owner and written to the audit log. */
  reason: string;
  /**
   * True only when we are confident enough to change Google without asking.
   * Everything else becomes a suggestion the owner taps to confirm.
   */
  autoApply: boolean;
  /** Set when a signal was found but deliberately not acted on. */
  blocked?: BlockedReason;
};

/**
 * Below this, the owner confirms. Set high on purpose: the cost of a false
 * closure is far higher than the cost of asking.
 */
export const AUTO_APPLY_THRESHOLD = 0.8;

const NOTHING: HoursIntent = {
  action: 'none',
  confidence: 0,
  opensAt: null,
  closesAt: null,
  reason: 'No mention of opening or closing times.',
  autoApply: false,
};

/**
 * Phrases that contain "open" or "close" but say nothing about trading hours.
 * These are removed before any matching, because "closed toe shoes required"
 * must never read as a closure. This list is the main defence against false
 * positives and is expected to grow as real captions come in.
 */
const FALSE_FRIENDS = [
  'closed toe', 'closed-toe', 'close toe',
  'close call', 'close up', 'close second', 'close friend',
  'closet', 'closely', 'closer look', 'closing the gap',
  'closed caption', 'disclosed', 'enclosed', 'close to',
  'open house', 'open mic', 'open call', 'open water', 'open air',
  'open minded', 'open-minded', 'eye opener', 'opening act',
  'job opening', 'openings', 'open to', 'opened up',
  'opening soon', 'coming soon', 'grand opening',
  'never close', 'never closed', 'we never close', 'always open',
];

/**
 * Captions that mean the business is shut for an unknown length of time.
 * These are detected so they can be explicitly IGNORED. Changing today's
 * hours cannot express "closed for two months", and guessing is how a live
 * listing gets marked Temporarily Closed.
 */
const PERMANENT_MARKERS = [
  'closing down', 'closed down', 'shutting down', 'shutting our doors',
  'closing our doors', 'permanently closed', 'closed for good',
  'closed permanently', 'last day', 'final day', 'going out of business',
  'until further notice', 'indefinitely', 'closed indefinitely',
  'closed for renovation', 'closed for renovations', 'closed for the season',
  'on hiatus', 'temporarily closed', 'closed until further',
  'end of an era', 'thank you for 10 years', 'our final',
];

/** Words that place the caption in the future rather than today. */
const FUTURE_MARKERS = [
  'tomorrow', 'next week', 'next month', 'this weekend', 'next weekend',
  'starting monday', 'from monday', 'upcoming', 'this coming',
];

const WEEKDAYS: Record<string, DayKey> = {
  sunday: 'sun', sun: 'sun',
  monday: 'mon', mon: 'mon',
  tuesday: 'tue', tues: 'tue', tue: 'tue',
  wednesday: 'wed', weds: 'wed', wed: 'wed',
  thursday: 'thu', thurs: 'thu', thu: 'thu',
  friday: 'fri', fri: 'fri',
  saturday: 'sat', sat: 'sat',
};

const TODAY_MARKERS = [
  'today', 'tonight', 'this morning', 'this afternoon', 'this evening',
  'right now', 'as of now', 'currently', 'at the moment',
];

function normalize(caption: string): string {
  return caption
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * Removed with word boundaries on both ends, not a plain substring match.
 * A naive replace makes "open to" eat the "open to" inside "open today",
 * which silently turned a reopening caption into nothing at all.
 */
function stripFalseFriends(text: string): string {
  let out = text;
  for (const phrase of FALSE_FRIENDS) {
    out = out.replace(new RegExp('\\b' + escapeRegex(phrase) + '\\b', 'g'), ' ');
  }
  return out;
}

function containsAny(text: string, needles: string[]): string | null {
  for (const needle of needles) {
    if (text.includes(needle)) return needle;
  }
  return null;
}

/**
 * Pulls a clock time out of a caption.
 *
 * `assume` decides what a bare hour means. "closing at 3" is three in the
 * afternoon, "open at 8" is eight in the morning. Businesses write it this
 * way constantly, so guessing is necessary, but a guessed meridiem lowers
 * confidence rather than being treated as certain.
 */
function extractTime(
  text: string,
  assume: 'pm' | 'am'
): { value: string; guessedMeridiem: boolean } | null {
  // Whichever comes FIRST wins. Checking the words unconditionally meant
  // "closes at 9 but the bar is open til midnight" returned midnight.
  const noonAt = text.search(/\bnoon\b|\bmidday\b/);
  const midnightAt = text.search(/\bmidnight\b/);
  const match = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
  const numberAt = match?.index ?? -1;

  const candidates: Array<[number, string]> = [];
  if (noonAt >= 0) candidates.push([noonAt, '12:00']);
  if (midnightAt >= 0) candidates.push([midnightAt, '00:00']);
  candidates.sort((a, b) => a[0] - b[0]);

  if (candidates.length > 0 && (numberAt < 0 || candidates[0][0] < numberAt)) {
    return { value: candidates[0][1], guessedMeridiem: false };
  }

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const rawMeridiem = match[3]?.replace(/\./g, '') ?? null;

  if (hour > 23 || minute > 59) return null;

  // A 24-hour time like 17:30 needs no interpretation.
  const looksTwentyFour = !rawMeridiem && Boolean(match[2]) && hour > 12;
  if (looksTwentyFour) {
    return { value: pad(hour) + ':' + pad(minute), guessedMeridiem: false };
  }

  let guessed = false;
  if (rawMeridiem === 'pm') {
    if (hour < 12) hour += 12;
  } else if (rawMeridiem === 'am') {
    if (hour === 12) hour = 0;
  } else {
    guessed = true;
    if (assume === 'pm' && hour < 12) hour += 12;
    // A bare "12" means noon, never midnight. "open 12-4" is a lunch shift,
    // and reading it as 00:00 would open the shop in the middle of the night.
  }

  if (hour > 23) return null;
  return { value: pad(hour) + ':' + pad(minute), guessedMeridiem: guessed };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export type IntentContext = {
  /** Today's weekday, so "closed Monday" can be recognised as today. */
  todayDayKey?: DayKey;
};

/**
 * Turn a caption into an intent. Pure: same input, same output, always.
 */
export function detectHoursIntent(
  caption: string,
  context: IntentContext = {}
): HoursIntent {
  if (!caption || caption.trim().length < 2) return NOTHING;

  const raw = normalize(caption);
  const text = stripFalseFriends(raw);

  // --- Rule 1: never express an indefinite closure. Checked first, so that
  // "closed for renovations, back in June" cannot fall through to close_today.
  const permanent = containsAny(raw, PERMANENT_MARKERS);
  if (permanent) {
    return {
      ...NOTHING,
      reason:
        'Looks like a long-term or permanent closure ("' + permanent + '"). ' +
        'OpenStatus only changes today\'s hours, so this was left alone.',
      blocked: 'permanent_closure',
    };
  }

  const mentionsClosing = /\bclos(e|ed|es|ing)\b|\bshut\b|\bnot open\b/.test(text);
  const mentionsOpening = /\bopen(ing|s|ed)?\b|\bback\b/.test(text);
  if (!mentionsClosing && !mentionsOpening) return NOTHING;

  // --- Rule 2: is this about today?
  const futureWord = containsAny(text, FUTURE_MARKERS);
  const todayWord = containsAny(text, TODAY_MARKERS);

  let namedDayIsToday = false;
  let namedDay: string | null = null;
  for (const [word, key] of Object.entries(WEEKDAYS)) {
    if (new RegExp('\\b' + word + '\\b').test(text)) {
      namedDay = word;
      if (context.todayDayKey && context.todayDayKey === key) namedDayIsToday = true;
      break;
    }
  }

  // "Closed today, see you tomorrow!" contains a future word but is plainly
  // about today. An explicit today marker always wins over an incidental one.
  if (!todayWord && (futureWord || (namedDay && !namedDayIsToday))) {
    return {
      ...NOTHING,
      reason:
        'Mentions hours but for another day (' + (futureWord ?? namedDay) + '). ' +
        'Only today can be changed automatically.',
      blocked: 'future_date',
    };
  }

  const isAboutToday = Boolean(todayWord) || namedDayIsToday;

  // --- Rule 3: reopening.
  if (/\b(back open|reopened|reopening|we're open|we are open|now open|open as (normal|usual))\b/.test(text)) {
    return {
      action: 'reopen',
      confidence: isAboutToday ? 0.85 : 0.7,
      opensAt: null,
      closesAt: null,
      reason: 'Reads as the business reopening.',
      autoApply: isAboutToday,
    };
  }

  // --- Rule 4: closing early at a stated time.
  const earlyClose =
    /\bclos(e|ing|es)\b[^.!?]{0,20}\b(early|at)\b/.test(text) ||
    /\b(early closure|closing early)\b/.test(text);

  if (earlyClose) {
    const after = text.slice(text.search(/\bclos(e|ing|es)\b/));
    const time = extractTime(after, 'pm');
    if (time) {
      const confidence = (isAboutToday ? 0.9 : 0.7) - (time.guessedMeridiem ? 0.08 : 0);
      return {
        action: 'close_early',
        confidence: round(confidence),
        opensAt: null,
        closesAt: time.value,
        reason:
          'Closing early at ' + time.value +
          (time.guessedMeridiem ? ' (assumed afternoon).' : '.'),
        autoApply: confidence >= AUTO_APPLY_THRESHOLD,
      };
    }
    return {
      ...NOTHING,
      action: 'close_early',
      confidence: 0.45,
      reason: 'Says closing early but gives no time. Needs a time from the owner.',
      blocked: 'ambiguous',
    };
  }

  // --- Rule 5: open later than usual.
  if (/\bopen\b[^.!?]{0,20}\b(late|til|till|until)\b/.test(text)) {
    const after = text.slice(text.search(/\b(late|til|till|until)\b/));
    const time = extractTime(after, 'pm');
    if (time) {
      const confidence = (isAboutToday ? 0.88 : 0.68) - (time.guessedMeridiem ? 0.08 : 0);
      return {
        action: 'open_late',
        confidence: round(confidence),
        opensAt: null,
        closesAt: time.value,
        reason: 'Open later than usual, until ' + time.value + '.',
        autoApply: confidence >= AUTO_APPLY_THRESHOLD,
      };
    }
  }

  // --- Rule 6: different hours today, both ends given. "open 12-4 today"
  const range = text.match(
    /\b(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*(?:-|–|to|til|till|until)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?)/
  );
  if (range && mentionsOpening) {
    const opens = extractTime(range[1], 'am');
    const closes = extractTime(range[2], 'pm');
    if (opens && closes) {
      const guessed = opens.guessedMeridiem || closes.guessedMeridiem;
      const confidence = (isAboutToday ? 0.87 : 0.65) - (guessed ? 0.1 : 0);
      return {
        action: 'custom_hours',
        confidence: round(confidence),
        opensAt: opens.value,
        closesAt: closes.value,
        reason: 'Different hours today: ' + opens.value + ' to ' + closes.value + '.',
        autoApply: confidence >= AUTO_APPLY_THRESHOLD,
      };
    }
  }

  // --- Rule 7: plainly closed today.
  if (mentionsClosing) {
    // "closed" on its own, with a today marker, is the single most common
    // real caption: "closed today ❤️", "CLOSED due to snow".
    const confidence = isAboutToday ? 0.86 : 0.5;
    return {
      action: 'close_today',
      confidence: round(confidence),
      opensAt: null,
      closesAt: null,
      reason: isAboutToday
        ? 'Reads as closed for the rest of today.'
        : 'Mentions being closed but does not say when. Needs confirming.',
      autoApply: confidence >= AUTO_APPLY_THRESHOLD,
      ...(isAboutToday ? {} : { blocked: 'ambiguous' as const }),
    };
  }

  return NOTHING;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
