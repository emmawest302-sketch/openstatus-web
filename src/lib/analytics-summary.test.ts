import { describe, it, expect } from 'vitest';
import { summariseEvents, type StoredEvent } from './analytics-summary';

const at = '2026-09-24T10:00:00.000Z';
const view = (visitor: string | null, referrer = 'Direct'): StoredEvent =>
  ({ event_type: 'page_view', visitor_id: visitor, referrer, created_at: at });
const click = (block: string, type = 'block_click'): StoredEvent =>
  ({ event_type: type, block_id: block, created_at: at });

describe('views and visitors mean different things', () => {
  it('counts every load as a view', () => {
    expect(summariseEvents([view('a'), view('a'), view('a')]).metrics.views).toBe(3);
  });

  it('counts one person once, however many times they come back', () => {
    // This is the definition a refresh has to obey. Views used to be
    // de-duplicated per browser session too, which made the two numbers
    // measure almost the same thing and left neither meaning anything.
    const s = summariseEvents([view('a'), view('a'), view('b')]);
    expect(s.metrics.views).toBe(3);
    expect(s.metrics.uniqueVisitors).toBe(2);
  });

  it('does not collapse unidentifiable visitors into one person', () => {
    // Private windows and blocked storage return no id. Bucketing them under
    // "" would report a hundred people as one.
    const s = summariseEvents([view(null), view(null), view('a')]);
    expect(s.metrics.views).toBe(3);
    expect(s.metrics.uniqueVisitors).toBe(1);
  });
});

describe('directions, wherever they were tapped', () => {
  it('counts the header button, which used not to be counted at all', () => {
    expect(summariseEvents([click('directions', 'directions_click')]).metrics.directions).toBe(1);
  });

  it('counts the map block too', () => {
    expect(summariseEvents([click('map', 'directions_click')]).metrics.directions).toBe(1);
  });

  it('counts a directions event with no block id', () => {
    expect(summariseEvents([{ event_type: 'directions_click', created_at: at }]).metrics.directions).toBe(1);
  });

  it('does not double-count one tap', () => {
    // The event is both a directions_click AND carries a directions block id.
    expect(summariseEvents([click('directions', 'directions_click')]).metrics.directions).toBe(1);
  });

  it('leaves other blocks out of it', () => {
    expect(summariseEvents([click('menu'), click('order')]).metrics.directions).toBe(0);
  });
});

describe('the other metrics', () => {
  it('counts menu and ordering taps by block id', () => {
    const s = summariseEvents([click('menu'), click('menu'), click('order')]);
    expect(s.metrics.menu).toBe(2);
    expect(s.metrics.orders).toBe(1);
  });

  it('counts offers, shares and socials as actions even without their own metric', () => {
    const s = summariseEvents([
      click('offers:code'), click('offers:redeem'),
      { event_type: 'share_click', created_at: at },
      click('instagram', 'social_click'),
    ]);
    expect(s.metrics.clicks).toBe(4);
    expect(s.metrics.views).toBe(0);
  });

  it('treats clicks as everything that is not a view', () => {
    const s = summariseEvents([view('a'), click('menu'), click('map', 'directions_click')]);
    expect(s.metrics.views).toBe(1);
    expect(s.metrics.clicks).toBe(2);
  });

  it('ranks the top blocks', () => {
    const s = summariseEvents([click('menu'), click('menu'), click('order')]);
    expect(s.topActions[0]).toEqual({ id: 'menu', count: 2 });
  });

  it('attributes traffic only from views, not from clicks', () => {
    const s = summariseEvents([view('a', 'Instagram'), click('menu')]);
    expect(s.trafficSources).toEqual([{ source: 'Instagram', count: 1 }]);
  });

  it('is empty rather than broken with nothing to summarise', () => {
    const s = summariseEvents([]);
    expect(s.metrics).toEqual({ views: 0, uniqueVisitors: 0, directions: 0, menu: 0, orders: 0, clicks: 0 });
    expect(s.trend).toEqual([]);
  });
});
