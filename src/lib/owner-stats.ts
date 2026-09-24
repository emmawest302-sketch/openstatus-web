/**
 * The four numbers worth showing on a phone.
 *
 * The builder's analytics tab has trends, sources and a per-block breakdown.
 * None of that survives being read one-handed behind a counter, and the owner
 * home screen is not the place to compete with it — it answers "is the link
 * doing anything?" and sends them to the real dashboard for the rest.
 *
 * Pure so the counting rules are pinned by tests rather than discovered when
 * a number looks wrong. `visitors` in particular is the one an owner will
 * quote at someone, so it must not double-count a person who came back twice.
 */

export type OwnerEvent = {
  event_type: string;
  block_id?: string | null;
  visitor_id?: string | null;
};

export type OwnerStats = {
  views: number;
  visitors: number;
  directions: number;
  taps: number;
};

export function summarise(events: OwnerEvent[]): OwnerStats {
  let views = 0;
  let directions = 0;
  let taps = 0;
  const visitors = new Set<string>();

  for (const e of events) {
    switch (e.event_type) {
      case 'page_view':
        views += 1;
        // A null visitor_id is an unidentified visit, not a shared identity —
        // bucketing them all under "" would collapse a hundred people into one.
        if (e.visitor_id) visitors.add(e.visitor_id);
        break;
      case 'directions_click':
        directions += 1;
        break;
      case 'block_click':
      case 'social_click':
      case 'share_click':
        taps += 1;
        break;
      default:
        break;
    }
  }

  return { views, visitors: visitors.size, directions, taps };
}

/** "1,204" — plain, and never "1.2k", which reads as an estimate. */
export function formatCount(n: number): string {
  return n.toLocaleString();
}
