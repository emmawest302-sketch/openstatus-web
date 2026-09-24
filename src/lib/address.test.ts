import { describe, it, expect } from 'vitest';
import { shortAddress } from './address';

describe('shortAddress', () => {
  it('drops the postcode and country Google appends', () => {
    expect(shortAddress('2716 Wind Gap Dr, Columbia, TN 38401, USA'))
      .toBe('2716 Wind Gap Dr, Columbia, TN');
  });

  it('keeps a short address as-is', () => {
    expect(shortAddress('12 High St, Nashville')).toBe('12 High St, Nashville');
    expect(shortAddress('Nashville')).toBe('Nashville');
  });

  it('keeps the street number, which is not a postcode', () => {
    expect(shortAddress('10025 Broadway, Denver, CO 80202, USA'))
      .toBe('10025 Broadway, Denver, CO');
  });

  it('handles a state with no postcode', () => {
    expect(shortAddress('1 Main St, Columbia, TN, USA')).toBe('1 Main St, Columbia, TN');
  });

  it('handles non-US shapes without mangling them', () => {
    expect(shortAddress('42 Rue de Rivoli, Paris, Île-de-France, France'))
      .toBe('42 Rue de Rivoli, Paris, Île-de-France');
  });

  it('is empty for empty input rather than throwing', () => {
    expect(shortAddress()).toBe('');
    expect(shortAddress(null)).toBe('');
    expect(shortAddress('   ')).toBe('');
  });

  it('tolerates stray commas and spacing', () => {
    expect(shortAddress('  5 Oak Ave ,, Franklin , TN 37064 , USA '))
      .toBe('5 Oak Ave, Franklin, TN');
  });
});
