import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateOwnerToken, issueOwnerSession, readOwnerSession, sessionVersionOk, ownerLinkUrl, SESSION_DAYS,
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
    const old = issueOwnerSession(BIZ, { now: Date.now() - (SESSION_DAYS + 1) * 86_400_000 });
    expect(readOwnerSession(old)).toBeNull();
  });

  it('refuses a cookie whose business was swapped', () => {
    const [, version, expires, mac] = issueOwnerSession(BIZ).split('.');
    expect(readOwnerSession(`someone-elses-id.${version}.${expires}.${mac}`)).toBeNull();
  });

  it('refuses a cookie whose expiry was pushed out', () => {
    const [id, version, , mac] = issueOwnerSession(BIZ).split('.');
    const forever = Date.now() + 10 * 365 * 86_400_000;
    expect(readOwnerSession(`${id}.${version}.${forever}.${mac}`)).toBeNull();
  });

  it('refuses an unsigned or malformed cookie', () => {
    for (const bad of ['', 'nonsense', `${BIZ}.${Date.now() + 1000}`, `${BIZ}.1.${Date.now() + 1000}`,
                       `${BIZ}.1.${Date.now() + 1000}.`, 'a.b.c.d', 'a.b.c.d.e']) {
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


describe('session revocation', () => {
  const BIZ_ = '11111111-2222-3333-4444-555555555555';

  it('carries the version it was issued under', () => {
    expect(readOwnerSession(issueOwnerSession(BIZ_, { version: 4 }))?.version).toBe(4);
  });

  it('refuses a cookie whose version was edited', () => {
    const [id, , expires, mac] = issueOwnerSession(BIZ_, { version: 1 }).split('.');
    expect(readOwnerSession(`${id}.99.${expires}.${mac}`)).toBeNull();
  });

  it('accepts a session at or above the current version', () => {
    const s = readOwnerSession(issueOwnerSession(BIZ_, { version: 3 }))!;
    expect(sessionVersionOk(s, 3)).toBe(true);
    expect(sessionVersionOk(s, 2)).toBe(true);
  });

  it('revokes a session issued before the last rotation', () => {
    // The whole point: the stolen phone's cookie is still perfectly signed.
    const stolen = readOwnerSession(issueOwnerSession(BIZ_, { version: 1 }))!;
    expect(sessionVersionOk(stolen, 2)).toBe(false);
  });

  it('reads a pre-versioning cookie as version 1 rather than signing them out', () => {
    // Three-part cookies were issued before this existed. They keep working
    // until the owner rotates, which is exactly when they should stop.
    const legacy = `${BIZ_}.${Date.now() + 1000}`;
    const { createHmac } = require('crypto') as typeof import('crypto');
    const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const mac = createHmac('sha256', secret).update(legacy).digest('hex');
    const session = readOwnerSession(`${legacy}.${mac}`);
    expect(session?.version).toBe(1);
    expect(sessionVersionOk(session!, 1)).toBe(true);
    expect(sessionVersionOk(session!, 2)).toBe(false);
  });

  it('falls back to version 1 when the column has not been added yet', () => {
    // A missing migration must not lock every owner out of their own shop.
    const s = readOwnerSession(issueOwnerSession(BIZ_, { version: 1 }))!;
    expect(sessionVersionOk(s, undefined)).toBe(true);
    expect(sessionVersionOk(s, null)).toBe(true);
  });
});
