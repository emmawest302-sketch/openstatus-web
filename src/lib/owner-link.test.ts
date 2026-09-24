import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateOwnerToken, issueOwnerSession, readOwnerSession, ownerLinkUrl, SESSION_DAYS,
} from './owner-link';

beforeAll(() => { process.env.ADMIN_SESSION_SECRET = 'test-secret-for-owner-links'; });

const BIZ = '6f1b2c34-5d6e-4f70-8a91-b2c3d4e5f607';

describe('tokens', () => {
  it('are url-safe, so they survive a QR code and a text message', () => {
    for (let i = 0; i < 40; i++) {
      expect(generateOwnerToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('are long enough not to be guessable', () => {
    expect(generateOwnerToken().length).toBeGreaterThanOrEqual(30);
  });

  it('are never repeated', () => {
    const seen = new Set(Array.from({ length: 300 }, generateOwnerToken));
    expect(seen.size).toBe(300);
  });
});

describe('sessions', () => {
  it('round-trips the business', () => {
    expect(readOwnerSession(issueOwnerSession(BIZ))?.businessId).toBe(BIZ);
  });

  it('lasts long enough that nobody has to re-authenticate often', () => {
    const s = readOwnerSession(issueOwnerSession(BIZ))!;
    const days = (s.expiresAt - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(SESSION_DAYS - 1);
  });

  it('refuses an expired cookie', () => {
    const old = issueOwnerSession(BIZ, Date.now() - (SESSION_DAYS + 1) * 86_400_000);
    expect(readOwnerSession(old)).toBeNull();
  });

  it('refuses a cookie whose business was swapped', () => {
    const [, expires, mac] = issueOwnerSession(BIZ).split('.');
    expect(readOwnerSession(`someone-elses-id.${expires}.${mac}`)).toBeNull();
  });

  it('refuses a cookie whose expiry was pushed out', () => {
    const [id, , mac] = issueOwnerSession(BIZ).split('.');
    const forever = Date.now() + 10 * 365 * 86_400_000;
    expect(readOwnerSession(`${id}.${forever}.${mac}`)).toBeNull();
  });

  it('refuses an unsigned or malformed cookie', () => {
    for (const bad of ['', 'nonsense', `${BIZ}.${Date.now() + 1000}`, `${BIZ}.${Date.now() + 1000}.`, 'a.b.c.d']) {
      expect(readOwnerSession(bad)).toBeNull();
    }
    expect(readOwnerSession(undefined)).toBeNull();
    expect(readOwnerSession(null)).toBeNull();
  });

  it('refuses a signature from a different secret', () => {
    const cookie = issueOwnerSession(BIZ);
    process.env.ADMIN_SESSION_SECRET = 'a-different-secret';
    expect(readOwnerSession(cookie)).toBeNull();
    process.env.ADMIN_SESSION_SECRET = 'test-secret-for-owner-links';
  });
});

describe('the link', () => {
  it('builds cleanly whether or not the site url has a trailing slash', () => {
    expect(ownerLinkUrl('https://openstatus.co/', 'abc')).toBe('https://openstatus.co/s/abc');
    expect(ownerLinkUrl('https://openstatus.co', 'abc')).toBe('https://openstatus.co/s/abc');
  });
});
