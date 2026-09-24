import { describe, it, expect } from 'vitest';
import { VIBES, applyVibe, activeVibe } from './page-vibes';
import { normalizeOpenStatusPageConfig } from './openstatus-page-config';

const base = () => normalizeOpenStatusPageConfig({});

describe('the vibe list', () => {
  it('has unique keys and labels', () => {
    expect(new Set(VIBES.map(v => v.key)).size).toBe(VIBES.length);
    expect(new Set(VIBES.map(v => v.label)).size).toBe(VIBES.length);
  });

  it('gives every vibe a complete look, not a partial one', () => {
    // A vibe that sets a dark background but leaves the name colour to
    // whatever was there before is how an owner ends up with black text on
    // black. Each one has to decide all of it.
    for (const v of VIBES) {
      expect(v.apply.bg, v.key).toBeTruthy();
      expect(v.apply.font, v.key).toBeTruthy();
      expect(v.apply.themeColor, v.key).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(v.apply.imageIntensity, v.key).toBeGreaterThanOrEqual(0);
      expect(v.apply.imageIntensity, v.key).toBeLessThanOrEqual(100);
      expect(['none', 'soft', 'strong'], v.key).toContain(v.apply.imageBlur);
      expect(['auto', 'light', 'dark', 'none'], v.key).toContain(v.apply.imageOverlay);
    }
  });

  it('names a colour for every dark background', () => {
    // Auto derives the name colour from the background, which only works for
    // a flat colour. A gradient or pattern has to say what it wants.
    for (const v of VIBES) {
      if (!v.apply.bg.startsWith('#')) {
        expect(v.apply.nameColor, `${v.key} has a non-solid background`).toBeTruthy();
      }
    }
  });
});

describe('applyVibe', () => {
  it('round-trips: applying a vibe makes it the active one', () => {
    for (const v of VIBES) {
      expect(activeVibe(applyVibe(base(), v))?.key).toBe(v.key);
    }
  });

  it('leaves no trace of the previous vibe', () => {
    // Bakery sets a name colour; Clean does not. Switching Bakery → Clean has
    // to clear it, or the "Clean" page keeps Bakery's brown heading.
    const bakery = VIBES.find(v => v.key === 'bakery')!;
    const clean = VIBES.find(v => v.key === 'clean')!;
    const after = applyVibe(applyVibe(base(), bakery), clean);
    expect(after.nameColor).toBeUndefined();
    expect(activeVibe(after)?.key).toBe('clean');
  });

  it('does not touch the owner’s own content', () => {
    const before = { ...base(), tags: ['Deli', 'Local'], location: 'Columbia, TN' };
    const blocks = before.blocks;
    const after = applyVibe(before, VIBES[2]);
    expect(after.tags).toEqual(['Deli', 'Local']);
    expect(after.location).toBe('Columbia, TN');
    expect(after.blocks).toBe(blocks);
    expect(after.socials).toBe(before.socials);
  });

  it('survives the config normalizer, so a vibe still matches after a save', () => {
    for (const v of VIBES) {
      const saved = normalizeOpenStatusPageConfig(applyVibe(base(), v));
      expect(activeVibe(saved)?.key, v.key).toBe(v.key);
    }
  });
});

describe('activeVibe', () => {
  it('is null for a page nobody applied a vibe to', () => {
    expect(activeVibe({ ...base(), bg: '#123456' })).toBeNull();
  });

  it('stops matching once the owner changes one part of the look', () => {
    // The old presets matched on background alone, so this case lit up a card
    // that no longer described the page.
    const v = VIBES.find(x => x.key === 'bakery')!;
    const edited = { ...applyVibe(base(), v), font: 'Inter, system-ui, sans-serif' };
    expect(activeVibe(edited)).toBeNull();
  });

  it('never matches two vibes at once', () => {
    for (const v of VIBES) {
      const cfg = applyVibe(base(), v);
      const hits = VIBES.filter(other => activeVibe(cfg)?.key === other.key);
      expect(hits).toHaveLength(1);
    }
  });
});
