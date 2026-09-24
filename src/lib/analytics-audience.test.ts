import { describe, it, expect, vi } from 'vitest';
import { AudienceGate, MAX_QUEUED } from './analytics-audience';

const gate = () => {
  const send = vi.fn();
  return { send, g: new AudienceGate(send) };
};

describe('the race that produced "0 views, 7 actions"', () => {
  it('holds a tap that happens before we know who is looking', () => {
    // This is the exact sequence. The page renders, the owner taps a row, and
    // only then does getSession() come back and say "this is the owner".
    // Before the gate, that tap was already gone.
    const { send, g } = gate();
    expect(g.emit({ eventType: 'block_click', blockId: 'menu' })).toBe('queued');
    expect(send).not.toHaveBeenCalled();

    g.resolve('excluded');
    expect(send).not.toHaveBeenCalled();
    expect(g.queued).toBe(0);
  });

  it('cannot produce actions without the view that came with them', () => {
    // The invariant the old code broke. A visitor's early taps and their page
    // view are decided together, so views can never be zero while actions are
    // not.
    const { send, g } = gate();
    g.emit({ eventType: 'block_click', blockId: 'menu' });
    g.emit({ eventType: 'directions_click', blockId: 'map' });
    g.resolve('visitor');
    g.emit({ eventType: 'page_view' });

    const kinds = send.mock.calls.map(([e]) => e.eventType);
    expect(kinds).toEqual(['block_click', 'directions_click', 'page_view']);
    expect(kinds.filter(k => k === 'page_view')).toHaveLength(1);
  });

  it('keeps held events in the order they happened', () => {
    const { send, g } = gate();
    g.emit({ eventType: 'block_click', blockId: 'a' });
    g.emit({ eventType: 'block_click', blockId: 'b' });
    g.emit({ eventType: 'share_click' });
    g.resolve('visitor');
    expect(send.mock.calls.map(([e]) => e.blockId ?? e.eventType))
      .toEqual(['a', 'b', 'share_click']);
  });
});

describe('once the audience is known', () => {
  it('sends straight through for a visitor', () => {
    const { send, g } = gate();
    g.resolve('visitor');
    expect(g.emit({ eventType: 'page_view' })).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('drops everything for an excluded audience, quietly', () => {
    const { send, g } = gate();
    g.resolve('excluded');
    expect(g.emit({ eventType: 'page_view' })).toBe('dropped');
    expect(g.emit({ eventType: 'block_click', blockId: 'menu' })).toBe('dropped');
    expect(send).not.toHaveBeenCalled();
  });
});

describe('the queue has a ceiling', () => {
  it('stops growing when the decision never arrives', () => {
    const { send, g } = gate();
    for (let i = 0; i < MAX_QUEUED; i++) {
      expect(g.emit({ eventType: 'block_click', blockId: String(i) })).toBe('queued');
    }
    expect(g.emit({ eventType: 'block_click', blockId: 'overflow' })).toBe('dropped');
    expect(g.queued).toBe(MAX_QUEUED);
    g.resolve('visitor');
    expect(send).toHaveBeenCalledTimes(MAX_QUEUED);
  });
});

describe('navigating to another page', () => {
  it('forgets the previous page’s decision', () => {
    // A decision made on the owner's own page used to leak across a client
    // navigation and mute every page after it.
    const { send, g } = gate();
    g.resolve('excluded');
    g.reset();
    expect(g.state).toBe('pending');
    expect(g.emit({ eventType: 'page_view' })).toBe('queued');
    g.resolve('visitor');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('throws away anything still held when the page goes', () => {
    const { send, g } = gate();
    g.emit({ eventType: 'block_click', blockId: 'menu' });
    g.reset();
    g.resolve('visitor');
    expect(send).not.toHaveBeenCalled();
  });
});
