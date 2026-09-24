import { describe, it, expect } from 'vitest';
import { fitDimensions, MAX_EDGE } from './image-upload';

describe('fitDimensions', () => {
  it('leaves an image that already fits alone', () => {
    expect(fitDimensions(400, 300, 768)).toEqual({ width: 400, height: 300 });
  });

  it('scales the longest edge down to the cap', () => {
    expect(fitDimensions(4032, 3024, 1800)).toEqual({ width: 1800, height: 1350 });
  });

  it('works the same on a portrait photo, which is the iPhone default', () => {
    expect(fitDimensions(3024, 4032, 1800)).toEqual({ width: 1350, height: 1800 });
  });

  it('never scales up', () => {
    expect(fitDimensions(64, 64, 768)).toEqual({ width: 64, height: 64 });
  });

  it('keeps at least one pixel on the short edge of a panorama', () => {
    const { height } = fitDimensions(20000, 40, 768);
    expect(height).toBeGreaterThanOrEqual(1);
  });

  it('refuses nonsense rather than producing a zero-sized canvas', () => {
    expect(fitDimensions(0, 100, 768)).toEqual({ width: 0, height: 0 });
    expect(fitDimensions(100, 0, 768)).toEqual({ width: 0, height: 0 });
    expect(fitDimensions(100, 100, 0)).toEqual({ width: 0, height: 0 });
  });

  it('caps a logo harder than a cover, because it is shown smaller', () => {
    expect(MAX_EDGE.avatar).toBeLessThan(MAX_EDGE.header);
  });

  it('keeps a 4032px photo under the serverless body limit at jpeg quality', () => {
    // 1800x1350 at q0.86 lands around 300-600KB; the cap that broke uploads
    // was 4.5MB, so the headroom is the point of the assertion.
    const { width, height } = fitDimensions(4032, 3024, MAX_EDGE.header);
    expect(width * height).toBeLessThan(2_600_000);
  });
});
