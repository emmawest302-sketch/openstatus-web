import { describe, it, expect } from 'vitest';
import { PAGE_METRICS_CSS, PAGE_CONTAINER_CLASS, fontScaleStyle } from './page-metrics';

describe('the page scale', () => {
  it('drives every container-query size through one multiplier', () => {
    // If a raw `NNcqw` slips back in, that size stops responding to the
    // owner's density choice while everything around it moves — which reads as
    // a layout bug, not a setting.
    const bare = PAGE_METRICS_CSS.match(/(?<!calc\()\b\d+(\.\d+)?cqw(?! \* var)/g) ?? [];
    expect(bare).toEqual([]);
  });

  it('declares the multiplier on the container itself', () => {
    expect(PAGE_METRICS_CSS).toContain('--os-scale: 1;');
    expect(PAGE_METRICS_CSS).toContain(`.${PAGE_CONTAINER_CLASS}`);
  });

  it('keeps the floors and ceilings, so no scale can make the page unreadable', () => {
    // This used to pin two exact numbers, which meant any tuning pass had to
    // edit the test to say the same thing again. What actually matters is
    // that every piece of type on a customer's page has a floor, and that
    // the floor is big enough to read on a phone — measured on a real 390px
    // screen the subtitles had drifted to 11px and the header actions to
    // 11.3px, which is what this now guards.
    const MIN_TYPE_FLOOR: Record<string, number> = {
      '--os-name': 20,
      '--os-addr': 12,
      '--os-row-title': 14,
      '--os-row-sub': 12,
      '--os-hours-headline': 18,
      '--os-hours-detail': 12,
      '--os-action-fs': 12,
    };

    for (const [token, min] of Object.entries(MIN_TYPE_FLOOR)) {
      const match = new RegExp(`${token}: clamp\\(([0-9.]+)px,`).exec(PAGE_METRICS_CSS);
      expect(match, `${token} must be declared as a clamp with a floor`).not.toBeNull();
      expect(Number(match![1]), `${token} floor`).toBeGreaterThanOrEqual(min);
    }

    // The multiplier sits inside the clamp, not around it. Compact on a 320px
    // screen still cannot take the row title below its floor.
    for (const token of Object.keys(MIN_TYPE_FLOOR)) {
      const line = PAGE_METRICS_CSS.split('\n').find(l => l.includes(`${token}:`))!;
      expect(line, `${token} must scale inside its clamp`).toContain('var(--os-scale, 1)');
      expect(line.indexOf('var(--os-scale, 1)')).toBeGreaterThan(line.indexOf('clamp('));
    }

    // The hours headline is the sentence the product exists to deliver. It
    // shipped smaller than the business name above it, which read as the
    // page not knowing what it was for.
    const floorOf = (t: string) => Number(new RegExp(`${t}: clamp\\(([0-9.]+)px,`).exec(PAGE_METRICS_CSS)![1]);
    expect(floorOf('--os-hours-headline')).toBeGreaterThan(floorOf('--os-row-title'));
  });
});

describe('fontScaleStyle', () => {
  it('writes nothing at all for the default', () => {
    // An inline custom property that equals the stylesheet's own value is
    // noise in the DOM and a thing to keep in sync for no gain.
    expect(fontScaleStyle('standard')).toEqual({});
    expect(fontScaleStyle(undefined)).toEqual({});
  });

  it('tightens for compact and opens up for large', () => {
    expect(fontScaleStyle('compact')).toEqual({ '--os-scale': '0.92' });
    expect(fontScaleStyle('large')).toEqual({ '--os-scale': '1.09' });
  });

  it('stays gentle — this is a nudge, not a zoom control', () => {
    const compact = Number((fontScaleStyle('compact') as Record<string, string>)['--os-scale']);
    const large = Number((fontScaleStyle('large') as Record<string, string>)['--os-scale']);
    expect(compact).toBeGreaterThan(0.85);
    expect(large).toBeLessThan(1.15);
  });
});
