import { describe, it, expect } from 'vitest';
import { menuDestination } from './menu';

describe('menuDestination', () => {
  it('uses the link when there is one', () => {
    expect(menuDestination({ url: 'https://x.test/menu' }))
      .toEqual({ href: 'https://x.test/menu', kind: 'link' });
  });

  it('still opens a PDF uploaded before menus became links', () => {
    expect(menuDestination({ menuType: 'pdf', menuFile: 'data:application/pdf;base64,AA' }))
      .toEqual({ href: 'data:application/pdf;base64,AA', kind: 'pdf' });
  });

  it('lets a new link replace a leftover PDF', () => {
    // There is no delete button for the old upload, so pasting a link has to
    // be how an owner gets rid of it.
    expect(menuDestination({ menuType: 'pdf', url: 'https://x.test/new', menuFile: 'data:application/pdf;base64,AA' }))
      .toEqual({ href: 'https://x.test/new', kind: 'link' });
  });

  it('ignores a stale menuType that disagrees with the data', () => {
    // Saved configs carry menuType 'photos' with the album in `url`.
    expect(menuDestination({ menuType: 'photos', url: 'https://photos.test/album' }))
      .toEqual({ href: 'https://photos.test/album', kind: 'link' });
  });

  it('returns null rather than a row that goes nowhere', () => {
    expect(menuDestination({})).toBeNull();
    expect(menuDestination({ url: '   ' })).toBeNull();
    expect(menuDestination({ url: '', menuFile: '  ' })).toBeNull();
    expect(menuDestination({ menuType: 'pdf' })).toBeNull();
  });
});
