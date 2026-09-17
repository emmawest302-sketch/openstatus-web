'use client';

import type { OpenStatusBlock } from '@/lib/openstatus-page-config';
import { trackOpenStatusEvent } from '@/components/analytics-tracker';

function extractMapQuery(googleUrl: string, fallback: string): string {
  try {
    const decoded = decodeURIComponent(googleUrl);
    const match = decoded.match(/\/maps\/place\/([^/@?]+)/);
    if (match) return match[1].replace(/\+/g, ' ');
  } catch { /* ignore */ }
  return fallback;
}

type Props = { block: OpenStatusBlock; businessId: string };

export default function PublicLocationBlock({ block, businessId }: Props) {
  const query = block.googleUrl
    ? extractMapQuery(block.googleUrl, block.sub || block.title)
    : block.sub || block.title;

  const mapsHref = block.appleMapsUrl || (block.googleUrl ?? `https://maps.google.com/?q=${encodeURIComponent(query)}`);
  // Use coordinates when available — avoids the ugly info-window card
  const embedSrc = (block.lat && block.lng)
    ? `https://maps.google.com/maps?q=${block.lat},${block.lng}&output=embed&hl=en&z=16`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=en`;

  return (
    <div className="col-span-2 overflow-hidden rounded-[24px] border border-white/55 bg-white/72 shadow-[0_14px_36px_rgba(0,0,0,.10)] backdrop-blur-2xl">
      {/* Map iframe */}
      <div className="relative h-[180px] w-full overflow-hidden rounded-t-[24px]">
        <iframe
          src={embedSrc}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Business location map"
          aria-label={`Map showing ${query}`}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold leading-tight text-[#1A1A18]">
            {block.sub || query}
          </p>
          <p className="text-[11px] text-black/45">Tap for directions</p>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackOpenStatusEvent(businessId, 'block_click', block.id)}
          className="flex-shrink-0 rounded-full bg-[#1A1A18] px-4 py-2 text-[11px] font-bold text-white transition hover:-translate-y-0.5 active:scale-95"
        >
          Get directions →
        </a>
      </div>
    </div>
  );
}
