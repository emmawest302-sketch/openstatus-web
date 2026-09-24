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
    { id: 'offers', title: 'Offers', sub: '', icon: '', on: true, tone: 'glass',
      offers: [{ id: 'o1', title: '10% off', code: 'WELCOME10', expiresAt: '2026-11-30', on: true }] },
  ],
  bg: '#101010',
  bgImage: 'https://example.com/bg.jpg',
  bgImagePosition: 'center',
  themeColor: '#DB6B8F',
  socials: { instagram: 'https://instagram.com/x', tiktok: '' },
  location: 'Nashville',
  directionsUrl: 'https://maps.app.goo.gl/abc',
  banner: 'Snow day — delivery only',
  bannerOn: true,
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
    expect(c.directionsUrl).toBe('https://maps.app.goo.gl/abc');
    expect(c.banner).toBe('Snow day — delivery only');
    expect(c.bannerOn).toBe(true);
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
      'blocks', 'bg', 'bgImage', 'bgImagePosition', 'themeColor', 'socials', 'directionsUrl', 'banner', 'bannerOn',
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


describe('banner', () => {
  it('caps a long banner rather than letting it push the page down', () => {
    const long = 'x'.repeat(400);
    expect(normalizeOpenStatusPageConfig({ banner: long }).banner).toHaveLength(160);
  });

  it('ignores a non-string banner', () => {
    expect(normalizeOpenStatusPageConfig({ banner: 42 }).banner).toBeUndefined();
    expect(normalizeOpenStatusPageConfig({ bannerOn: 'yes' }).bannerOn).toBeUndefined();
  });
});


describe('offers', () => {
  const withOffers = (offers: unknown) =>
    normalizeOpenStatusPageConfig({ blocks: [{ id: 'offers', offers }] }).blocks[0].offers;

  it('survives a save', () => {
    const c = normalizeOpenStatusPageConfig(FULL);
    const block = c.blocks.find(b => b.id === 'offers');
    expect(block?.offers?.[0]).toMatchObject({ title: '10% off', code: 'WELCOME10', expiresAt: '2026-11-30' });
  });

  it('drops a date that is not a date, rather than rendering Invalid Date', () => {
    expect(withOffers([{ id: 'a', title: 'x', expiresAt: 'next tuesday' }])?.[0].expiresAt).toBeUndefined();
  });

  it('caps the text that renders on a stranger\u2019s phone', () => {
    const long = withOffers([{ id: 'a', title: 'x'.repeat(500), description: 'y'.repeat(500) }])?.[0];
    expect(long?.title).toHaveLength(80);
    expect(long?.description).toHaveLength(140);
  });

  it('caps how many there can be', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `o${i}`, title: `Offer ${i}` }));
    expect(withOffers(many)).toHaveLength(8);
  });

  it('defaults a missing on to true', () => {
    expect(withOffers([{ id: 'a', title: 'x' }])?.[0].on).toBe(true);
    expect(withOffers([{ id: 'a', title: 'x', on: false }])?.[0].on).toBe(false);
  });

  it('is undefined rather than an empty array when there are none', () => {
    expect(withOffers(undefined)).toBeUndefined();
    expect(withOffers([])).toBeUndefined();
  });
});

describe('style properties added after businesses already had pages', () => {
  it('defaults an old config to the look it already had', () => {
    // The whole point of the defaults: a page saved before these fields
    // existed has to render byte-identically afterwards. Anything else is a
    // migration, and a migration to change a button shape is not acceptable.
    const legacy = normalizeOpenStatusPageConfig({ bg: '#F7F7F5', blocks: [] });
    expect(legacy.buttonStyle).toBe('filled');
    expect(legacy.fontScale).toBe('standard');
  });

  it('keeps a real choice', () => {
    const cfg = normalizeOpenStatusPageConfig({ buttonStyle: 'glass', fontScale: 'compact' });
    expect(cfg.buttonStyle).toBe('glass');
    expect(cfg.fontScale).toBe('compact');
  });

  it('refuses junk rather than passing it into a style attribute', () => {
    const cfg = normalizeOpenStatusPageConfig({ buttonStyle: 'neon', fontScale: 42 });
    expect(cfg.buttonStyle).toBe('filled');
    expect(cfg.fontScale).toBe('standard');
  });

  it('survives a round trip, which is what autosave does every few seconds', () => {
    const once = normalizeOpenStatusPageConfig({ buttonStyle: 'outline', fontScale: 'large' });
    const twice = normalizeOpenStatusPageConfig(once);
    expect(twice.buttonStyle).toBe('outline');
    expect(twice.fontScale).toBe('large');
  });
});
