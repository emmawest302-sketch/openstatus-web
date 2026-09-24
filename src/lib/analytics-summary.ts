/**
 * Turning stored events into the numbers an owner reads.
 *
 * Pulled out of the API route so the definitions are pinned by tests rather
 * than rediscovered when a number looks wrong. They had already drifted once:
 * "Directions" counted only the map block, while the Directions button in the
 * page header — the one nearly everybody actually taps — was not tracked at
 * all, so the figure read as near-zero for every business without a map.
 */

export type StoredEvent = {
  event_type: string;
  block_id?: string | null;
  visitor_id?: string | null;
  referrer?: string | null;
  created_at: string;
};

export type AnalyticsSummary = {
  metrics: {
    /** Every page load. A refresh is a view. */
    views: number;
    /** Distinct people, by stored visitor id. A refresh is not a visitor. */
    uniqueVisitors: number;
    directions: number;
    menu: number;
    orders: number;
    /** Everything that is not a page view. */
    clicks: number;
  };
  topActions: { id: string; count: number }[];
  trafficSources: { source: string; count: number }[];
  trend: { date: string; views: number; clicks: number }[];
};

/** Block ids that mean "someone asked for directions", wherever they tapped. */
const DIRECTION_IDS = new Set(['map', 'directions', 'location']);

export function summariseEvents(events: StoredEvent[]): AnalyticsSummary {
  const blockCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const daily: Record<string, { views: number; clicks: number }> = {};
  const visitors = new Set<string>();

  let views = 0;
  let directions = 0;

  for (const event of events) {
    const day = (event.created_at ?? '').slice(0, 10);
    daily[day] ??= { views: 0, clicks: 0 };

    if (event.event_type === 'page_view') {
      views += 1;
      daily[day].views += 1;
      // An empty id is an unidentified visit, not a shared identity — counting
      // them as one person would collapse a hundred visitors into one.
      if (event.visitor_id) visitors.add(event.visitor_id);
      const source = event.referrer || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    } else {
      daily[day].clicks += 1;
      if (event.event_type === 'directions_click' || DIRECTION_IDS.has(event.block_id ?? '')) {
        directions += 1;
      }
    }

    if (event.block_id) blockCounts[event.block_id] = (blockCounts[event.block_id] || 0) + 1;
  }

  return {
    metrics: {
      views,
      uniqueVisitors: visitors.size,
      directions,
      menu: blockCounts['menu'] || 0,
      orders: blockCounts['order'] || 0,
      clicks: events.length - views,
    },
    topActions: Object.entries(blockCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id, count]) => ({ id, count })),
    trafficSources: Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([source, count]) => ({ source, count })),
    trend: Object.entries(daily).map(([date, values]) => ({ date, ...values })),
  };
}
