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
    // The multiplier sits inside the clamp, not around it. Compact on a 320px
    // screen still cannot take the row title below its floor.
    expect(PAGE_METRICS_CSS).toMatch(/--os-row-title: clamp\(13px,/);
    expect(PAGE_METRICS_CSS).toMatch(/--os-name: clamp\(19px,/);
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
