import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A React handler in a server component compiles cleanly and then throws at
 * request time — "event handlers cannot be passed to client component props".
 *
 * That is exactly how the public business page went down: two onClick handlers
 * were added to anchors in public-bio-card, which has no 'use client'. tsc was
 * happy, the build was green, and every visitor got "Something went wrong".
 * Nothing in the toolchain catches it, so this does.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const HANDLER = /\bon(?:Click|Change|Submit|Input|Focus|Blur|PointerDown|PointerMove|PointerUp|KeyDown|KeyUp|MouseEnter|MouseLeave|Drag\w*)\s*=\s*\{/;

describe('the server/client boundary', () => {
  it('has no event handler in a file that never opted into the client', () => {
    const offenders = walk('src')
      .filter((f) => !f.endsWith('.test.tsx'))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        const isClient = /^\s*['"]use client['"]/m.test(src.slice(0, 400));
        return !isClient && HANDLER.test(src);
      })
      .map((f) => f.replace(/\\/g, '/'));

    expect(offenders, 'add \'use client\', or move the handler into a client component').toEqual([]);
  });
});

/**
 * Purple was the app's accent and is not any more: the product chrome is
 * black, white and stone, and saturation is reserved for what a colour MEANS
 * — green for open, amber for attention, red for destructive. A business's own
 * accent lives on its page, never in the product around it.
 *
 * This catches the next one that gets pasted in, which is the only way a sweep
 * like that stays swept.
 */
describe('the product palette', () => {
  const PURPLE = /#(?:7C3AED|6D28D9|8B5CF6|A78BFA|DDD6FE|EDE9FE|F5F3FF|5B21B6|4C1D95)\b/i;

  it('has no purple left in any product surface', () => {
    const offenders = walk('src')
      .filter((f) => !f.includes('.test.'))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        // The colour wheel is a swatch of every hue, not chrome.
        const withoutWheel = src.replace(/conic-gradient\([^)]*\)/g, '');
        return PURPLE.test(withoutWheel);
      })
      .map((f) => f.replace(/\\/g, '/'));

    expect(offenders, 'use the neutral product system in lib/builder-theme').toEqual([]);
  });
});
