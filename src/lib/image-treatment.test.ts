import { describe, it, expect } from 'vitest';
import {
  blurPx, blurScale, intensityToOpacity, resolveOverlay, overlayColor,
  imageTreatment, isImageBlur, isImageOverlay, DEFAULT_INTENSITY,
} from './image-treatment';

describe('blur', () => {
  it('stays in the restrained range', () => {
    expect(blurPx('none')).toBe(0);
    expect(blurPx('soft')).toBe(4);
    expect(blurPx('strong')).toBe(10);
    expect(blurPx(undefined)).toBe(0);
  });

  it('scales the image up so blurred edges stay hidden', () => {
    expect(blurScale(0)).toBe(1);
    expect(blurScale(4)).toBeGreaterThan(1);
    expect(blurScale(10)).toBeGreaterThan(blurScale(4));
  });

  it('never scales so far the photo is unrecognisable', () => {
    expect(blurScale(10)).toBeLessThan(1.5);
  });
});

describe('intensity', () => {
  it('maps a percentage to an opacity', () => {
    expect(intensityToOpacity(0)).toBe(0);
    expect(intensityToOpacity(50)).toBe(0.5);
    expect(intensityToOpacity(100)).toBe(1);
  });

  it('clamps nonsense rather than producing an invalid opacity', () => {
    expect(intensityToOpacity(-20)).toBe(0);
    expect(intensityToOpacity(500)).toBe(1);
    expect(intensityToOpacity(NaN)).toBe(DEFAULT_INTENSITY / 100);
    expect(intensityToOpacity(undefined)).toBe(DEFAULT_INTENSITY / 100);
  });
});

describe('overlay', () => {
  it('auto darkens a page that prints white text', () => {
    expect(resolveOverlay('auto', true)).toBe('dark');
  });

  it('auto lightens a page that prints dark text', () => {
    expect(resolveOverlay('auto', false)).toBe('light');
  });

  it('respects an explicit choice whatever the page', () => {
    expect(resolveOverlay('light', true)).toBe('light');
    expect(resolveOverlay('dark', false)).toBe('dark');
    expect(resolveOverlay('none', true)).toBe('none');
  });

  it('renders nothing for none', () => {
    expect(overlayColor('none', 1)).toBe(null);
  });

  it('washes harder as the image is turned up', () => {
    const faint = overlayColor('dark', 0.2)!;
    const full = overlayColor('dark', 1)!;
    const alpha = (c: string) => Number(c.match(/([\d.]+)\)$/)![1]);
    expect(alpha(full)).toBeGreaterThan(alpha(faint));
  });

  it('never washes the image out completely', () => {
    const alpha = (c: string) => Number(c.match(/([\d.]+)\)$/)![1]);
    expect(alpha(overlayColor('dark', 1)!)).toBeLessThan(0.5);
  });
});

describe('imageTreatment', () => {
  it('gives sensible defaults with no settings at all', () => {
    const t = imageTreatment({ pageIsDark: false });
    expect(t.opacity).toBeCloseTo(0.78);
    expect(t.blur).toBe(0);
    expect(t.scale).toBe(1);
    expect(t.overlay).toContain('255,255,255');
  });

  it('a dark page gets a dark wash on automatic', () => {
    expect(imageTreatment({ pageIsDark: true }).overlay).toContain('rgba(0,0,0');
  });

  it('turning the image off leaves nothing showing', () => {
    expect(imageTreatment({ intensity: 0, pageIsDark: true }).opacity).toBe(0);
  });

  it('blur and scale move together', () => {
    const t = imageTreatment({ blur: 'strong', pageIsDark: false });
    expect(t.blur).toBe(10);
    expect(t.scale).toBeGreaterThan(1);
  });
});

describe('guards', () => {
  it('accepts only real values', () => {
    expect(isImageBlur('soft')).toBe(true);
    expect(isImageBlur('enormous')).toBe(false);
    expect(isImageOverlay('auto')).toBe(true);
    expect(isImageOverlay('rainbow')).toBe(false);
  });
});
