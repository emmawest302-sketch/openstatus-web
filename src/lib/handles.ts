// Handles that can never belong to a business, because they are either
// real routes or things we will want later. A business claiming /login
// would break the app, so this list is checked before anything else.
export const RESERVED = new Set([
  'about','account','admin','api','app','auth','billing','blog','contact',
  'dashboard','docs','embed','faq','features','help','home','legal','login',
  'logout','new','openstatus','password','pricing','privacy','profile',
  'register','reset','root','settings','setup','signin','signup','static',
  'status','support','team','terms','test','update','upgrade','user','www',
]);

export type HandleCheck = {
  ok: boolean;
  reason?: string;
};

export function normaliseHandle(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateHandle(raw: string): HandleCheck {
  const h = normaliseHandle(raw);
  if (h.length < 3) return { ok: false, reason: 'At least 3 characters' };
  if (h.length > 32) return { ok: false, reason: 'At most 32 characters' };
  if (RESERVED.has(h)) return { ok: false, reason: 'That one is reserved' };
  if (/^\d+$/.test(h)) return { ok: false, reason: 'Needs at least one letter' };
  return { ok: true };
}

export function suggestHandle(name: string): string {
  const base = normaliseHandle(name.split(/\s+/).slice(0, 2).join('-'));
  return base.length >= 3 ? base : normaliseHandle(name);
}
