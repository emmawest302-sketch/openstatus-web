import { describe, it, expect } from 'vitest';
import { shareImageUrl } from './share-image';

const base = { siteUrl: 'https://openstatus.co', businessId: 'b-1' };

describe('shareImageUrl', () => {
  it('prefers the cover the page actually shows', () => {
    // The regression: header_url was winning, so a text preview showed the
    // logo while the page showed the cover.
    expect(shareImageUrl({
      ...base,
      bgImage: 'https://cdn.test/cover.jpg',
      headerUrl: 'https://cdn.test/old-header.jpg',
      avatarUrl: 'https://cdn.test/logo.png',
    })).toBe('https://cdn.test/cover.jpg');
  });

  it('falls back to header, then the logo', () => {
    expect(shareImageUrl({ ...base, headerUrl: 'https://cdn.test/h.jpg', avatarUrl: 'https://cdn.test/l.png' }))
      .toBe('https://cdn.test/h.jpg');
    expect(shareImageUrl({ ...base, avatarUrl: 'https://cdn.test/l.png' }))
      .toBe('https://cdn.test/l.png');
  });

  it('turns a storage ref into the public asset URL', () => {
    expect(shareImageUrl({ ...base, bgImage: 'storage:b-1/header-abc' }))
      .toBe('https://openstatus.co/api/assets?businessId=b-1&kind=header');
    expect(shareImageUrl({ ...base, avatarUrl: 'storage:b-1/avatar-abc' }))
      .toBe('https://openstatus.co/api/assets?businessId=b-1&kind=avatar');
  });

  it('absolutises a relative asset path', () => {
    // A scraper has no page to resolve this against.
    expect(shareImageUrl({ ...base, bgImage: '/api/assets?businessId=b-1&kind=header&v=x' }))
      .toBe('https://openstatus.co/api/assets?businessId=b-1&kind=header&v=x');
  });

  it('refuses a data URI', () => {
    // Megabytes of base64; no scraper will accept it, and emitting it makes
    // the whole card fail rather than fall through to the logo.
    expect(shareImageUrl({ ...base, bgImage: 'data:image/png;base64,AAAA', avatarUrl: 'https://cdn.test/l.png' }))
      .toBe('https://cdn.test/l.png');
  });

  it('ignores blank and whitespace values', () => {
    expect(shareImageUrl({ ...base, bgImage: '   ', headerUrl: '', avatarUrl: 'https://cdn.test/l.png' }))
      .toBe('https://cdn.test/l.png');
  });

  it('is null when the business has no image at all', () => {
    expect(shareImageUrl(base)).toBeNull();
  });

  it('escapes a business id rather than pasting it into a URL', () => {
    expect(shareImageUrl({ ...base, businessId: 'a b&c', avatarUrl: 'storage:x/avatar-1' }))
      .toBe('https://openstatus.co/api/assets?businessId=a%20b%26c&kind=avatar');
  });
});
