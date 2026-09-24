import { brandGlyph } from '@/lib/brand-icons';
/**
 * Icon components for the builder.
 *
 * Extracted verbatim from builder-client.tsx, which had grown past 5,000 lines
 * — a size where an edit aimed at one mode could silently affect another. These
 * are pure SVG with no state and no dependencies on the rest of the builder,
 * which is why they came out first.
 */
import React from 'react';

export function LucidePin({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
}
export function LucideClock({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
export function LucideList({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
export function LucideShoppingBag({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
export function LucideCalendar({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
export function LucideShare({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}
export function LucideGlobe({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
export function LucideGrip({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1" fill={color}/><circle cx="9" cy="5" r="1" fill={color}/><circle cx="9" cy="19" r="1" fill={color}/><circle cx="15" cy="12" r="1" fill={color}/><circle cx="15" cy="5" r="1" fill={color}/><circle cx="15" cy="19" r="1" fill={color}/></svg>;
}
export function LucideX({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
export function LucideChevronRight({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
export function LucideStar({ size=12,color='currentColor',filled=false }: { size?: number; color?: string; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled?color:'none'} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
export function LucideImage({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
export function LucideThumbsUp({ size=12,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>;
}
export function LucideThumbsDown({ size=12,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>;
}
export function LucideFileText({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
export function LucideLayoutGrid({ size=14,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
}
export function LucideLayoutList({ size=14,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="5"/><rect x="3" y="11" width="18" height="5"/><rect x="3" y="19" width="18" height="2"/></svg>;
}

export function LucideTag({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}

export function LucideInstagram({ size=16,color='currentColor' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill={color} stroke="none"/></svg>;
}

export function BlockIcon({ id, size=16, color='currentColor' }: { id:string; size?:number; color?:string }) {
  switch(id) {
    case 'location': return <LucidePin size={size} color={color}/>;
    case 'hours':    return <LucideClock size={size} color={color}/>;
    case 'menu':     return <LucideList size={size} color={color}/>;
    case 'order':    return <LucideShoppingBag size={size} color={color}/>;
    case 'book':     return <LucideCalendar size={size} color={color}/>;
    case 'socials':  return <LucideShare size={size} color={color}/>;
    case 'gallery':  return <LucideImage size={size} color={color}/>;
    case 'reviews':  return <LucideStar size={size} color={color} filled/>;
    case 'updates':  return <LucideInstagram size={size} color={color}/>;
    case 'offers':   return <LucideTag size={size} color={color}/>;
    case 'shop':     return <LucideShoppingBag size={size} color={color}/>;
    default:         return <LucideGlobe size={size} color={color}/>;
  }
}

// Brand icons
export function IconInstagram({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig)"/>
      <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.7" fill="none"/>
      <circle cx="17.2" cy="6.8" r="1.1" fill="white"/>
    </svg>
  );
}
export function IconTikTok({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#010101"/>
      <path d="M17.5 5.5a3.8 3.8 0 0 1-2.9-3.3V2H11.8v13.1a2.2 2.2 0 0 1-4.4 0 2.2 2.2 0 0 1 2.2-2.2c.2 0 .4 0 .6.1V9.9a5.9 5.9 0 0 0-5.9 5.9 5.9 5.9 0 0 0 11.8 0V9a7.5 7.5 0 0 0 4.3 1.3V7.1a3.8 3.8 0 0 1-2.9-1.6z" fill="white"/>
    </svg>
  );
}
export function IconFacebook({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#1877F2"/>
      <path d="M16 8h-2a1 1 0 0 0-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 0 1 4-4h2v3z" fill="white"/>
    </svg>
  );
}
export function IconTwitterX({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#000"/>
      <path d="M17.5 4h2.5l-5.4 6.2 6.3 8.3h-5L12 13.4l-4.4 5.1H4.6l5.8-6.6L4.4 4h5.1l3.5 4.6L17.5 4zm-.9 12.9h1.4L7.1 5.5H5.6l11 11.4z" fill="white"/>
    </svg>
  );
}
export function IconYouTube({ size=22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5.5" fill="#FF0000"/>
      <path d="M21.4 8a2.6 2.6 0 0 0-1.8-1.8C18 5.8 12 5.8 12 5.8s-6 0-7.5.4A2.6 2.6 0 0 0 2.6 8C2.2 9.5 2.2 12 2.2 12s0 2.5.4 4a2.6 2.6 0 0 0 1.8 1.8C6 18.2 12 18.2 12 18.2s6 0 7.5-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.5.4-4 .4-4s0-2.5-.3-4z" fill="white"/>
      <polygon points="10 15 15.5 12 10 9" fill="#FF0000"/>
    </svg>
  );
}
/**
 * Social marks, monochrome.
 *
 * These used to be hand-traced glyphs in full brand colour — five saturated
 * logos in a row at the foot of a page whose whole job is to show off one
 * business's own colours. They also disagreed with the public page, which was
 * already rendering them in a single ink. Official paths, one colour, both
 * surfaces the same.
 */
export function SocialIcon({ platform, size=22, color='currentColor' }: { platform:string; size?:number; color?:string }) {
  const glyph = brandGlyph(platform);
  if (!glyph) return <LucideGlobe size={size} color={color==='currentColor'?'#858585':color}/>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-label={glyph.title} role="img">
      <path d={glyph.path}/>
    </svg>
  );
}

// ── Brand provider icons ──────────────────────────────────────────────────────
// NOTE: these are simplified, brand-accurate-coloured marks, not the official
// logo artwork. For production, drop in each brand's official SVG from their
// press/brand kit — hand-traced logos drift from the real mark over time.
export function IconDoorDash({ size=32 }: { size?: number }) {
  // DoorDash Red #FF3008; current mark is the chevron "swoosh", not a letter D.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="DoorDash">
      <rect width="32" height="32" rx="7" fill="#FF3008"/>
      <path d="M7 12.4h11.3c2.1 0 3.6 1.3 3.6 3.2 0 2.4-1.9 4.4-4.6 4.4H7l2.6-3h7.5c.7 0 1.2-.5 1.2-1.1 0-.5-.35-.9-1-.9H7z" fill="#fff"/>
    </svg>
  );
}
export function IconUberEats({ size=32 }: { size?: number }) {
  // Uber Eats green #06C167 on black.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Uber Eats">
      <rect width="32" height="32" rx="7" fill="#06C167"/>
      <rect x="6.5" y="13" width="19" height="3.1" rx="1.55" fill="#0B0B0B"/>
      <rect x="6.5" y="18.4" width="12.5" height="3.1" rx="1.55" fill="#0B0B0B"/>
      <circle cx="23" cy="20" r="2.6" fill="#0B0B0B"/>
    </svg>
  );
}
export function IconGrubhub({ size=32 }: { size?: number }) {
  // Grubhub went orange in the 2021 Wolff Olins rebrand; the mark is a house
  // with a chimney and cutlery in the negative space.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Grubhub">
      <rect width="32" height="32" rx="7" fill="#FF8000"/>
      <path d="M16 7.2 25 14v10.8h-6.2v-6H13.2v6H7V14z" fill="#fff"/>
      <rect x="20.4" y="8.2" width="2.6" height="3.6" fill="#fff"/>
      <rect x="13.6" y="14.2" width="1.5" height="3.4" rx="0.6" fill="#FF8000"/>
      <rect x="16.9" y="14.2" width="1.5" height="3.4" rx="0.6" fill="#FF8000"/>
    </svg>
  );
}
export function IconSquare({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#000"/>
      {/* Square logo mark — rounded square inside */}
      <rect x="9" y="9" width="14" height="14" rx="3" fill="white"/>
      <rect x="12" y="12" width="8" height="8" rx="1.5" fill="#000"/>
    </svg>
  );
}
export function IconToast({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#FF4C00"/>
      <path d="M9 12h14M16 12v12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}
export function IconOpenTable({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#DA3743"/>
      {/* fork */}
      <path d="M11 8v16M11 11c0 0 3.5 1.5 3.5 4s-3.5 4-3.5 4" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* knife */}
      <path d="M20 8l-1.5 8H20v8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
export function IconResy({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#000"/>
      {/* Bold R */}
      <path d="M11 8h7a4 4 0 0 1 0 8h-7V8z" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
      <path d="M18 16l5 8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="11" y1="8" x2="11" y2="24" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
export function IconCalendly({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#006BFF"/>
      <rect x="7" y="10" width="18" height="15" rx="2.5" stroke="white" strokeWidth="1.9" fill="none"/>
      <path d="M7 15h18" stroke="white" strokeWidth="1.5"/>
      <path d="M12 7v5M20 7v5" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
      <circle cx="12" cy="20" r="1.2" fill="white"/>
      <circle cx="16" cy="20" r="1.2" fill="white"/>
      <circle cx="20" cy="20" r="1.2" fill="white"/>
    </svg>
  );
}
export function IconAcuity({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#5C2D91"/>
      {/* A shape */}
      <path d="M16 8l7 16h-14L16 8z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <line x1="11.5" y1="19" x2="20.5" y2="19" stroke="white" strokeWidth="2"/>
    </svg>
  );
}
export function IconMindbody({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#1D1D1D"/>
      {/* M shape */}
      <path d="M7 22V10l5 7 5-7v12" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* person dot */}
      <circle cx="24" cy="12" r="2.5" fill="white"/>
      <path d="M24 15v7" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
export function IconGoogle({ size=32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="white" stroke="#DEDEDC" strokeWidth="1"/>
      {/* Google G */}
      <path d="M24 16.3c0-.6-.1-1.2-.2-1.8H16v3.4h4.5c-.2 1-.8 1.9-1.7 2.4v2h2.7C23 20.6 24 18.6 24 16.3z" fill="#4285F4"/>
      <path d="M16 25c2.3 0 4.2-.7 5.5-2l-2.7-2c-.7.5-1.7.8-2.8.8-2.2 0-4-1.4-4.6-3.4H8.6v2.1C9.9 23.1 12.7 25 16 25z" fill="#34A853"/>
      <path d="M11.4 18.4c-.2-.5-.3-1-.3-1.6s.1-1.1.3-1.6v-2.1H8.6C8 14.5 7.5 15.7 7.5 17s.5 2.5 1.1 3.5l2.8-2.1z" fill="#FBBC05"/>
      <path d="M16 11.8c1.3 0 2.4.4 3.3 1.3l2.4-2.4C20.2 9.2 18.3 8.5 16 8.5c-3.3 0-6.1 1.9-7.4 4.7l2.8 2.1c.6-2 2.4-3.5 4.6-3.5z" fill="#EA4335"/>
    </svg>
  );
}
export function ProviderIcon({ providerKey, size=32 }: { providerKey: string; size?: number }) {
  switch(providerKey) {
    case 'doordash':   return <IconDoorDash size={size}/>;
    case 'ubereats':   return <IconUberEats size={size}/>;
    case 'grubhub':    return <IconGrubhub size={size}/>;
    case 'square':
    case 'squareappts':return <IconSquare size={size}/>;
    case 'toast':      return <IconToast size={size}/>;
    case 'opentable':  return <IconOpenTable size={size}/>;
    case 'resy':       return <IconResy size={size}/>;
    case 'calendly':   return <IconCalendly size={size}/>;
    case 'acuity':     return <IconAcuity size={size}/>;
    case 'mindbody':   return <IconMindbody size={size}/>;
    default:           return <LucideGlobe size={size} color="#858585"/>;
  }
}
