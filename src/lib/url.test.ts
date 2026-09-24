import { describe, it, expect } from 'vitest';
import { externalUrl } from './url';

describe('externalUrl', () => {
  it('leaves a real URL alone', () => {
    expect(externalUrl('https://example.com/menu')).toBe('https://example.com/menu');
    expect(externalUrl('http://example.com')).toBe('http://example.com');
  });

  it('adds https to what people actually type', () => {
    // The whole reason this exists: a bare host in an href is a relative path,
    // so the button would land on openstatus.co/yoursite.com.
    expect(externalUrl('yoursite.com')).toBe('https://yoursite.com');
    expect(externalUrl('  www.yoursite.com/menu  ')).toBe('https://www.yoursite.com/menu');
  });

  it('keeps tel and mailto', () => {
    expect(externalUrl('tel:+15550001234')).toBe('tel:+15550001234');
    expect(externalUrl('mailto:hi@shop.com')).toBe('mailto:hi@shop.com');
  });

  it('completes a protocol-relative URL', () => {
    expect(externalUrl('//example.com/x')).toBe('https://example.com/x');
  });

  it('refuses a script URL rather than prefixing it', () => {
    expect(externalUrl('javascript:alert(1)')).toBe('');
    expect(externalUrl('JavaScript:alert(1)')).toBe('');
    expect(externalUrl('data:text/html,<script>')).toBe('');
  });

  it('refuses a path, which is not a site', () => {
    expect(externalUrl('/builder')).toBe('');
    expect(externalUrl('#top')).toBe('');
    expect(externalUrl('?x=1')).toBe('');
  });

  it('is empty for empty input', () => {
    expect(externalUrl()).toBe('');
    expect(externalUrl(null)).toBe('');
    expect(externalUrl('   ')).toBe('');
  });
});
