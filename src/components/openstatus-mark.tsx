import type React from 'react';

/**
 * The OpenStatus mark. One asset, one component, everywhere.
 *
 * It used to be hand-drawn as inline SVG in eleven places — four circles and a
 * path, copy-pasted, and already diverged: different radii, a hardcoded
 * `#F7F7F3` keyhole that only matched one of the backgrounds it sat on, and a
 * gold fill in two of them. Changing the logo meant finding all eleven.
 *
 * So the real file is the source of truth and nothing redraws it. The keyhole
 * is a transparent cutout, not a painted shape, so the mark composites
 * correctly on any surface without anyone matching a background colour.
 *
 * On a dark surface pass `chip` — the black disc needs a light ground to read,
 * and inverting it would be a second version of the logo, which is the thing
 * this component exists to prevent.
 */
export default function OpenStatusMark({
  size = 26,
  chip = false,
  style,
}: {
  size?: number;
  /** Sit the mark on a white circle, for dark backgrounds. */
  chip?: boolean;
  style?: React.CSSProperties;
}) {
  // Clear space: the disc keeps a tenth of its own width around it inside the
  // chip, which is what stops it reading as a sticker.
  const box = chip ? Math.round(size * 1.24) : size;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: box,
        height: box,
        flexShrink: 0,
        ...(chip ? { background: '#FFFFFF', borderRadius: '50%' } : null),
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/openstatus-mark.png"
        alt=""
        width={size}
        height={size}
        // Never stretched: the box is square and so is the asset.
        style={{ width: size, height: size, display: 'block', objectFit: 'contain' }}
      />
    </span>
  );
}

/** The mark beside the name, which is how the product signs itself. */
export function OpenStatusWordmark({
  size = 26,
  color = '#0A0A0A',
  chip = false,
}: {
  size?: number;
  color?: string;
  chip?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <OpenStatusMark size={size} chip={chip}/>
      <span style={{
        fontSize: Math.round(size * 0.65),
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color,
      }}>
        OpenStatus
      </span>
    </span>
  );
}
