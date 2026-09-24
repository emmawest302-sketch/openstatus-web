import { describe, it, expect } from 'vitest';
import { VIBES } from './page-vibes';
import { isDarkBg } from './page-theme';

/** Relative luminance, WCAG. */
function lum(hex: string): number {
  const v = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('every preset is readable', () => {
  it('leaves the cover photo alone', () => {
    // The business name is on the frosted card, not on the photo, so an
    // overlay has no legibility job — it only greys out the owner's picture.
    for (const v of VIBES) {
      expect(v.apply.imageOverlay, v.key).toBe('none');
    }
  });

  it('puts the business name well clear of its own background', () => {
    // The business name is the largest text on the page, so WCAG large-text
    // (3:1) is the floor — but a name that only just clears it looks washed
    // out next to a cover photo, so these are held to 4.5:1.
    for (const v of VIBES) {
      if (!v.apply.bg.startsWith('#') || !v.apply.nameColor) continue;
      expect(ratio(v.apply.nameColor, v.apply.bg), `${v.key} name on background`)
        .toBeGreaterThanOrEqual(4.5);
    }
  });

  it('agrees with the page about which presets are dark', () => {
    // The cards, the hours block and the icon colours all branch on isDarkBg.
    // A preset whose own idea of "dark" disagrees with that function renders
    // light cards on a black page.
    const night = VIBES.find(v => v.key === 'night')!;
    expect(isDarkBg(night.apply.bg)).toBe(true);

    for (const v of VIBES) {
      if (v.key === 'night') continue;
      if (!v.apply.bg.startsWith('#')) continue;
      expect(isDarkBg(v.apply.bg), `${v.key} should read as a light page`).toBe(false);
    }
  });

  it('gives the dark preset a light name colour, not a dark one', () => {
    const night = VIBES.find(v => v.key === 'night')!;
    expect(lum(night.apply.nameColor!)).toBeGreaterThan(0.5);
  });

  it('keeps every accent distinguishable from the page it sits on', () => {
    // Accent carries links and the share button. 3:1 is the floor for a UI
    // component; below that it stops reading as interactive.
    for (const v of VIBES) {
      if (!v.apply.bg.startsWith('#')) continue;
      expect(ratio(v.apply.themeColor, v.apply.bg), `${v.key} accent on background`)
        .toBeGreaterThanOrEqual(3);
    }
  });
});
