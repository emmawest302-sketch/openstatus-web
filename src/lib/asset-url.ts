/**
 * Where a business's logo or cover photo is served from.
 *
 * The bug this fixes: `/api/assets` answers with
 * `Cache-Control: public, max-age=86400, immutable`, which is right — the
 * bytes behind a given storage path genuinely never change. But almost every
 * caller built the URL WITHOUT the path in it:
 *
 *     /api/assets?businessId=abc&kind=avatar
 *
 * That URL is stable across uploads. So an owner replaced her logo, the file
 * uploaded, the database updated, and her browser kept showing yesterday's
 * picture for a day. Three reports of "upload isn't working" for an upload
 * that worked every time.
 *
 * Putting the storage path in `v` makes the URL change whenever the image
 * does, which is what lets the cache header stay aggressive AND correct. One
 * component already did this; the other five did not. Now there is one
 * function and no opportunity to disagree.
 */

export type AssetKind = 'avatar' | 'header';

export function assetUrl(
  businessId: string | null | undefined,
  kind: AssetKind,
  reference: string | null | undefined,
): string | null {
  const ref = reference?.trim();
  if (!ref) return null;
  // Not ours — an owner pasted a URL, or Google gave us one. Pass it through.
  if (!ref.startsWith('storage:')) return ref;
  if (!businessId) return null;

  const path = ref.slice('storage:'.length);
  // The route only serves a path scoped to this business and kind. A
  // mismatched reference would 404, so fall back to the unversioned form,
  // which resolves the path server-side from the database.
  if (!path.startsWith(`${businessId}/${kind}-`)) {
    return `/api/assets?businessId=${encodeURIComponent(businessId)}&kind=${kind}`;
  }
  return `/api/assets?businessId=${encodeURIComponent(businessId)}&kind=${kind}&v=${encodeURIComponent(path)}`;
}
