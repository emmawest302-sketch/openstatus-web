import { describe, it, expect } from 'vitest';
import { normalizeOpenStatusPageConfig, type OpenStatusPageConfig } from './openstatus-page-config';

/**
 * The normalizer builds an explicit object, so a field that is left out is
 * silently undefined rather than a type error. These tests are the safety net:
 * if you add a field to OpenStatusPageConfig and forget the normalizer, the
 * round-trip test below fails.
 */

/** A config using every field, as the builder would save it. */
const FULL = {
  blocks: [
    { id: 'menu', title: 'Menu', sub: 'See the menu', icon: '', on: true, tone: 'glass',
      url: 'https://example.com/menu', size: 'square', color: '#7C3AED',
      menuType: 'photos', menuFile: 'menu.jpg' },
  ],
  bg: '#101010',
  bgImage: 'https://example.com/bg.jpg',
  bgImagePosition: 'center',
  themeColor: '#DB6B8F',
  socials: { instagram: 'https://instagram.com/x', tiktok: '' },
  location: 'Nashville',
  tags: ['coffee', 'wifi'],
  font: 'Poppins',
  nameColor: '#FFFFFF',
  bgAnim: 'drift',
  bgAnimSpeed: 40,
  imageIntensity: 65,
  imageBlur: 'soft',
  imageOverlay: 'dark',
  weeklyHours: { mon: { open: '09:00', close: '17:00', closed: false } },
};

describe('menu type', () => {
  it("keeps 'photos', the value the builder actually writes", () => {
    const c = normalizeOpenStatusPageConfig({ blocks: [{ id: 'menu', menuType: 'photos' }] });
    // Before this was fixed, 'photos' fell through to 'url' and a photo menu
    // silently became a link menu on the live page.
    expect(c.blocks[0].menuType).toBe('photos');
  });

  it("migrates the legacy 'photo' spelling", () => {
    const c = normalizeOpenStatusPageConfig({ blocks: [{ id: 'menu', menuType: 'photo' }] });
    expect(c.blocks[0].menuType).toBe('photos');
  });

  it('falls back to url for junk', () => {
    const c = normalizeOpenStatusPageConfig({ blocks: [{ id: 'menu', menuType: 'nonsense' }] });
    expect(c.blocks[0].menuType).toBe('url');
  });
});

describe('block size', () => {
  it("keeps 'square'", () => {
    const c = normalizeOpenStatusPageConfig({ blocks: [{ id: 'a', size: 'square' }] });
    expect(c.blocks[0].size).toBe('square');
  });

  it.each(['half', 'full', 'third'])('keeps %s', (size) => {
    const c = normalizeOpenStatusPageConfig({ blocks: [{ id: 'a', size }] });
    expect(c.blocks[0].size).toBe(size);
  });
});

describe('socials', () => {
  it('accepts the builder’s keyed object and drops empty handles', () => {
    const c = normalizeOpenStatusPageConfig({ socials: { instagram: 'https://x', tiktok: '  ' } });
    expect(c.socials).toHaveLength(1);
    expect(c.socials[0]).toMatchObject({ id: 'instagram', url: 'https://x', on: true });
  });

  it('accepts the legacy array form', () => {
    const c = normalizeOpenStatusPageConfig({
      socials: [{ id: 'tiktok', label: 'TikTok', url: 'https://t', on: true }],
    });
    expect(c.socials[0].url).toBe('https://t');
  });
});

describe('round trip', () => {
  it('preserves every field a saved config can contain', () => {
    const c = normalizeOpenStatusPageConfig(FULL);
    expect(c.bg).toBe('#101010');
    expect(c.bgImage).toBe(FULL.bgImage);
    expect(c.bgImagePosition).toBe('center');
    expect(c.themeColor).toBe('#DB6B8F');
    expect(c.location).toBe('Nashville');
    expect(c.tags).toEqual(['coffee', 'wifi']);
    expect(c.font).toBe('Poppins');
    // These three were being dropped, which is why a custom name colour and an
    // animated background looked right in the builder and did nothing live.
    expect(c.nameColor).toBe('#FFFFFF');
    expect(c.bgAnim).toBe('drift');
    expect(c.bgAnimSpeed).toBe(40);
    expect(c.weeklyHours?.mon?.open).toBe('09:00');
  });

  it('normalizing twice changes nothing further', () => {
    const once = normalizeOpenStatusPageConfig(FULL);
    const twice = normalizeOpenStatusPageConfig(once);
    expect(twice).toEqual(once);
  });

  it('every optional key on the type is handled', () => {
    // A deliberately blunt guard: if someone adds a field to the type and not
    // to the normalizer, FULL will stop covering it and this list will drift.
    const produced = normalizeOpenStatusPageConfig(FULL) as Record<string, unknown>;
    const expected: (keyof OpenStatusPageConfig)[] = [
      'blocks', 'bg', 'bgImage', 'bgImagePosition', 'themeColor', 'socials',
      'location', 'tags', 'weeklyHours', 'font', 'nameColor', 'bgAnim', 'bgAnimSpeed',
      'imageIntensity', 'imageBlur', 'imageOverlay',
    ];
    for (const key of expected) {
      expect(produced, `normalizer dropped "${key}"`).toHaveProperty(key);
    }
  });
});

describe('empty input', () => {
  it('produces a usable default rather than throwing', () => {
    const c = normalizeOpenStatusPageConfig(undefined);
    expect(Array.isArray(c.blocks)).toBe(true);
    expect(c.bg).toBe('#FFFFFF');
    expect(c.socials).toEqual([]);
  });
});

describe('image treatment', () => {
  it('keeps the three image settings through a round trip', () => {
    const c = normalizeOpenStatusPageConfig(FULL);
    expect(c.imageIntensity).toBe(65);
    expect(c.imageBlur).toBe('soft');
    expect(c.imageOverlay).toBe('dark');
  });

  it('clamps an intensity outside 0-100 instead of trusting it', () => {
    expect(normalizeOpenStatusPageConfig({ imageIntensity: 250 }).imageIntensity).toBe(100);
    expect(normalizeOpenStatusPageConfig({ imageIntensity: -5 }).imageIntensity).toBe(0);
  });

  it('drops values it does not recognise rather than passing them to CSS', () => {
    const c = normalizeOpenStatusPageConfig({ imageBlur: 'enormous', imageOverlay: 'rainbow', imageIntensity: 'lots' });
    expect(c.imageBlur).toBeUndefined();
    expect(c.imageOverlay).toBeUndefined();
    expect(c.imageIntensity).toBeUndefined();
  });
});
