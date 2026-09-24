'use client';

import { VIBES, activeVibe, type Vibe, type VibeStyleFields } from '@/lib/page-vibes';

/**
 * A vibe card.
 *
 * The mini-preview is drawn from the vibe's own values rather than a static
 * thumbnail image, so a vibe can never advertise a look it doesn't apply —
 * the card and the page read the same fields. The old preset thumbnails were
 * hand-picked hex codes sitting next to the values they were supposed to
 * illustrate, and they had already drifted apart.
 */
function VibeCard({ vibe, active, onPick }: {
  vibe: Vibe; active: boolean; onPick: () => void;
}) {
  const { bg, ink } = vibe.swatch;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={`text-left rounded-2xl border p-2.5 transition-colors ${
        active ? 'border-[#0A0A0A] bg-[#F7F7F6]' : 'border-[#E9E9E7] bg-white hover:border-[#DCDCD9]'
      }`}
    >
      <span className="block rounded-xl overflow-hidden mb-2 aspect-[4/5] relative" style={{ background: vibe.apply.bg }}>
        <span className="absolute inset-0 flex flex-col justify-end gap-1.5 p-2.5">
          <span
            className="block text-[15px] leading-none truncate"
            style={{ fontFamily: vibe.apply.font, color: vibe.apply.nameColor ?? ink, fontWeight: 800 }}
          >
            Aa
          </span>
          <span className="block h-2.5 rounded-md" style={{ background: ink, opacity: 0.22 }}/>
          <span className="block h-2.5 rounded-md" style={{ background: ink, opacity: 0.14 }}/>
          <span
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: vibe.apply.themeColor, boxShadow: `0 0 0 2px ${bg}` }}
          />
        </span>
      </span>
      <span className="block text-[12.5px] font-semibold text-[#0A0A0A] leading-tight">{vibe.label}</span>
      <span className="block text-[11px] text-[#9A9A97] leading-tight mt-0.5">{vibe.blurb}</span>
    </button>
  );
}

export default function VibePicker({ config, onPick }: {
  config: VibeStyleFields;
  onPick: (v: Vibe) => void;
}) {
  const current = activeVibe(config);
  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {VIBES.map(v => (
          <VibeCard key={v.key} vibe={v} active={current?.key === v.key} onPick={() => onPick(v)}/>
        ))}
      </div>
      {!current && (
        <p className="text-[11px] text-[#9A9A97] mt-2.5">
          Your page is on a custom look. Picking a vibe replaces the background, font,
          name colour and photo settings — your logo, hours, tags and links stay put.
        </p>
      )}
    </>
  );
}
