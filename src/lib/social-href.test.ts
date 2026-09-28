import { describe, it, expect } from 'vitest';
import { socialHref, platformKeyFor } from '@/lib/social-url';

/**
 * These exist because a live customer page shipped carrying five social
 * buttons, every one of them pointing at `https://.com`, with the Twitter one
 * rendering the literal text "Tw" where its logo belonged.
 */
describe('socialHref', () => {
  it('accepts a full URL unchanged', () => {
    expect(socialHref('https://instagram.com/emmas')).toBe('https://instagram.com/emmas');
  });

  it('adds a scheme to a bare host', () => {
    expect(socialHref('instagram.com/emmas')).toBe('https://instagram.com/emmas');
  });

  it('keeps http when that is what was given', () => {
    expect(socialHref('http://example.com')).toBe('http://example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(socialHref('  tiktok.com/@shop  ')).toBe('https://tiktok.com/@shop');
  });

  it('rejects empty, whitespace and missing values', () => {
    expect(socialHref('')).toBeNull();
    expect(socialHref('   ')).toBeNull();
    expect(socialHref(null)).toBeNull();
    expect(socialHref(undefined)).toBeNull();
  });

  // The exact string that shipped.
  it('rejects a bare TLD with no host in front of it', () => {
    expect(socialHref('.com')).toBeNull();
    expect(socialHref('https://.com')).toBeNull();
  });

  it('rejects a host with an empty label in the middle', () => {
    expect(socialHref('https://foo..com')).toBeNull();
  });

  it('rejects a trailing dot with nothing after it', () => {
    expect(socialHref('instagram.')).toBeNull();
  });

  it('rejects a single label with no dot at all', () => {
    expect(socialHref('instagram')).toBeNull();
  });

  it('rejects something that will not parse as a URL', () => {
    expect(socialHref('http://')).toBeNull();
  });
});

describe('platformKeyFor', () => {
  it('matches the plain platform ids', () => {
    expect(platformKeyFor('instagram')).toBe('instagram');
    expect(platformKeyFor('tiktok')).toBe('tiktok');
    expect(platformKeyFor('facebook')).toBe('facebook');
    expect(platformKeyFor('youtube')).toBe('youtube');
    expect(platformKeyFor('twitter')).toBe('twitter');
  });

  // The label the legacy format stored, which used to resolve to nothing and
  // render as the two characters "Tw".
  it('matches the builder label "Twitter / X"', () => {
    expect(platformKeyFor('Twitter / X')).toBe('twitter');
  });

  it('matches X on its own', () => {
    expect(platformKeyFor('X')).toBe('twitter');
    expect(platformKeyFor('x')).toBe('twitter');
  });

  it('does not read an x inside another word as the platform', () => {
    expect(platformKeyFor('Xing')).toBeNull();
    expect(platformKeyFor('flexbox')).toBeNull();
  });

  it('can fall back to reading the URL', () => {
    expect(platformKeyFor('https://www.instagram.com/emmas')).toBe('instagram');
    expect(platformKeyFor('https://youtube.com/@shop')).toBe('youtube');
  });

  it('returns null for something it does not know', () => {
    expect(platformKeyFor('')).toBeNull();
    expect(platformKeyFor('Threads')).toBeNull();
  });
});
