import { describe, it, expect } from 'vitest';
import { detectHoursIntent, AUTO_APPLY_THRESHOLD } from './hours-intent';

describe('captions that should change today\'s hours', () => {
  it('reads the most common caption there is', () => {
    const r = detectHoursIntent('Closed today ❤️');
    expect(r.action).toBe('close_today');
    expect(r.autoApply).toBe(true);
  });

  it('picks up an early close with a stated time', () => {
    const r = detectHoursIntent('Closing early at 3pm today!');
    expect(r.action).toBe('close_early');
    expect(r.closesAt).toBe('15:00');
    expect(r.autoApply).toBe(true);
  });

  it('treats a bare afternoon hour as pm', () => {
    const r = detectHoursIntent('closing at 4 today');
    expect(r.closesAt).toBe('16:00');
  });

  it('handles 24 hour times', () => {
    const r = detectHoursIntent('closing early at 15:30 today');
    expect(r.closesAt).toBe('15:30');
  });

  it('understands staying open late', () => {
    const r = detectHoursIntent('Open late tonight til 10!');
    expect(r.action).toBe('open_late');
    expect(r.closesAt).toBe('22:00');
  });

  it('reads a one-off range as custom hours', () => {
    const r = detectHoursIntent('Just open 12-4 today');
    expect(r.action).toBe('custom_hours');
    expect(r.opensAt).toBe('12:00');
    expect(r.closesAt).toBe('16:00');
  });

  it('never reads a bare 12 as midnight', () => {
    const r = detectHoursIntent('open 12-4 today');
    expect(r.opensAt).not.toBe('00:00');
  });

  it('recognises reopening', () => {
    const r = detectHoursIntent('We are open today, back to normal!');
    expect(r.action).toBe('reopen');
  });
});

describe('the dangerous false positives', () => {
  it('does not close a shop over a dress code', () => {
    expect(detectHoursIntent('Closed toe shoes required today').action).toBe('none');
  });

  it('ignores an open house', () => {
    expect(detectHoursIntent('Open house this Saturday!').action).toBe('none');
  });

  it('ignores job openings', () => {
    expect(detectHoursIntent('We have openings today for a barista').action).toBe('none');
  });

  it('does not act on "we never close"', () => {
    expect(detectHoursIntent('We never close, come on in').action).toBe('none');
  });
});

describe('permanent closures are detected and then deliberately ignored', () => {
  const permanent = [
    'Closing down after 10 years. Thank you all.',
    'Closed for renovations until further notice',
    'We are permanently closed',
    'Our last day is today',
    'Closed for the season, see you in spring',
  ];

  for (const caption of permanent) {
    it('refuses to act on: ' + caption, () => {
      const r = detectHoursIntent(caption);
      expect(r.action).toBe('none');
      expect(r.blocked).toBe('permanent_closure');
      expect(r.autoApply).toBe(false);
    });
  }

  it('wins over an early-close signal in the same caption', () => {
    const r = detectHoursIntent('Closing early today, and closing down for good next month');
    expect(r.blocked).toBe('permanent_closure');
    expect(r.autoApply).toBe(false);
  });
});

describe('other days are never applied to today', () => {
  it('leaves tomorrow alone', () => {
    const r = detectHoursIntent('Closed tomorrow for the holiday');
    expect(r.blocked).toBe('future_date');
    expect(r.autoApply).toBe(false);
  });

  it('leaves a named weekday alone when it is not today', () => {
    const r = detectHoursIntent('We are closed Monday', { todayDayKey: 'tue' });
    expect(r.blocked).toBe('future_date');
  });

  it('but acts when the named weekday IS today', () => {
    const r = detectHoursIntent('We are closed Monday', { todayDayKey: 'mon' });
    expect(r.action).toBe('close_today');
    expect(r.autoApply).toBe(true);
  });
});

describe('unclear captions are handed back to the owner', () => {
  it('flags a closure with no day', () => {
    const r = detectHoursIntent('Sorry, we are closed');
    expect(r.autoApply).toBe(false);
    expect(r.confidence).toBeLessThan(AUTO_APPLY_THRESHOLD);
  });

  it('flags closing early with no time given', () => {
    const r = detectHoursIntent('Closing early today, sorry!');
    expect(r.action).toBe('close_early');
    expect(r.closesAt).toBe(null);
    expect(r.autoApply).toBe(false);
  });

  it('does not confidently close the whole venue when only part closes', () => {
    const r = detectHoursIntent('Kitchen closes at 9 but the bar is open til midnight');
    expect(r.autoApply).toBe(false);
  });

  it('says nothing about a caption with no hours in it', () => {
    const r = detectHoursIntent('New seasonal menu dropped, come try the pumpkin latte');
    expect(r.action).toBe('none');
  });

  it('handles empty input', () => {
    expect(detectHoursIntent('').action).toBe('none');
  });
});

describe('the safety contract holds across every case', () => {
  const captions = [
    'Closed today', 'Closing early at 3', 'Open house Saturday',
    'Closing down for good', 'Closed toe shoes', 'open 12-4 today',
    '', 'Closed tomorrow', 'We never close', 'back open!',
  ];

  it('never auto-applies below the threshold', () => {
    for (const c of captions) {
      const r = detectHoursIntent(c);
      if (r.autoApply) expect(r.confidence).toBeGreaterThanOrEqual(AUTO_APPLY_THRESHOLD);
    }
  });

  it('never returns a closesAt without an action that uses it', () => {
    for (const c of captions) {
      const r = detectHoursIntent(c);
      if (r.action === 'none') expect(r.closesAt).toBe(null);
    }
  });
});
