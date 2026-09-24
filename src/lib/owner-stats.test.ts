import { describe, it, expect } from 'vitest';
import { summarise, formatCount, type OwnerEvent } from './owner-stats';

const e = (event_type: string, extra: Partial<OwnerEvent> = {}): OwnerEvent =>
  ({ event_type, ...extra });

describe('summarise', () => {
  it('is all zeroes for a page nobody has visited', () => {
    expect(summarise([])).toEqual({ views: 0, visitors: 0, directions: 0, taps: 0 });
  });

  it('counts a returning visitor once', () => {
    const events = [
      e('page_view', { visitor_id: 'a' }),
      e('page_view', { visitor_id: 'a' }),
      e('page_view', { visitor_id: 'b' }),
    ];
    expect(summarise(events)).toMatchObject({ views: 3, visitors: 2 });
  });

  it('does not collapse anonymous visits into one person', () => {
    // Three unidentified visits are three views and zero *known* visitors —
    // never one visitor, which is what bucketing them under "" would give.
    const events = [
      e('page_view', { visitor_id: null }),
      e('page_view', { visitor_id: null }),
      e('page_view', { visitor_id: 'a' }),
    ];
    expect(summarise(events)).toMatchObject({ views: 3, visitors: 1 });
  });

  it('separates directions from every other tap', () => {
    const events = [
      e('directions_click'),
      e('directions_click'),
      e('block_click', { block_id: 'menu' }),
      e('social_click'),
      e('share_click'),
    ];
    expect(summarise(events)).toMatchObject({ directions: 2, taps: 3 });
  });

  it('ignores event types it does not know', () => {
    expect(summarise([e('something_new'), e('page_view', { visitor_id: 'a' })]))
      .toEqual({ views: 1, visitors: 1, directions: 0, taps: 0 });
  });
});

describe('formatCount', () => {
  it('groups thousands rather than abbreviating', () => {
    expect(formatCount(1204)).toBe('1,204');
    expect(formatCount(0)).toBe('0');
  });
});
