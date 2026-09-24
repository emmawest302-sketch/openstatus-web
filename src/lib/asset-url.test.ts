import { describe, it, expect } from 'vitest';
import { assetUrl } from './asset-url';

const B = 'biz-1';
const ref = (kind: string, tag = 'abc') => `storage:${B}/${kind}-1730000000000-${tag}.png`;

describe('assetUrl', () => {
  it('puts the storage path in the URL, so a new upload is a new URL', () => {
    // The whole point. Without this the URL is identical before and after an
    // upload, and a day-long immutable cache shows the old logo.
    const before = assetUrl(B, 'avatar', ref('avatar', 'one'));
    const after = assetUrl(B, 'avatar', ref('avatar', 'two'));
    expect(before).not.toBe(after);
    expect(after).toContain('v=');
  });

  it('builds the shape the route validates', () => {
    expect(assetUrl(B, 'avatar', `storage:${B}/avatar-99.png`))
      .toBe(`/api/assets?businessId=biz-1&kind=avatar&v=${encodeURIComponent('biz-1/avatar-99.png')}`);
  });

  it('passes an external URL straight through', () => {
    expect(assetUrl(B, 'avatar', 'https://lh3.googleusercontent.com/x')).toBe('https://lh3.googleusercontent.com/x');
  });

  it('is null when there is no image', () => {
    expect(assetUrl(B, 'avatar', null)).toBeNull();
    expect(assetUrl(B, 'avatar', '')).toBeNull();
    expect(assetUrl(B, 'avatar', '   ')).toBeNull();
  });

  it('is null when we have a stored reference but no business to scope it to', () => {
    expect(assetUrl(null, 'avatar', ref('avatar'))).toBeNull();
  });

  it('falls back to the lookup form rather than emitting a URL that would 404', () => {
    // A reference pointing at another business, or at the other kind. The
    // route refuses those, so ask it to resolve from the database instead.
    expect(assetUrl(B, 'avatar', 'storage:other-biz/avatar-1.png'))
      .toBe('/api/assets?businessId=biz-1&kind=avatar');
    expect(assetUrl(B, 'avatar', `storage:${B}/header-1.png`))
      .toBe('/api/assets?businessId=biz-1&kind=avatar');
  });

  it('escapes a business id that would otherwise break the query string', () => {
    expect(assetUrl('a b&c', 'header', 'storage:a b&c/header-1.png'))
      .toContain('businessId=a%20b%26c');
  });

  it('keeps avatar and header on separate URLs', () => {
    expect(assetUrl(B, 'avatar', ref('avatar'))).not.toBe(assetUrl(B, 'header', ref('header')));
  });
});
