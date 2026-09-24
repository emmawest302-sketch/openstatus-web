/**
 * Builder constants: palettes, fonts, providers, block defaults.
 *
 * Pulled out of builder-client.tsx as part of breaking up a 5,000-line file.
 * Types come back from builder-client as type-only imports, which TypeScript
 * erases — so there is no runtime import cycle here.
 */
import type { OpenStatusBlock, WeekDay, WeeklyHours } from '@/components/builder-client';

// ── constants ──────────────────────────────────────────────────────────────────
// Full-spectrum swatch row — the "rainbow palette"
export const BG_RAINBOW = [
  '#FFFFFF','#F7F7F5','#E7E5E4','#9CA3AF','#3F3F46','#0A0A0A',
  '#FECACA','#FDBA74','#FDE68A','#BBF7D0','#A5F3FC','#BFDBFE','#DDD6FE','#FBCFE8',
  '#EF4444','#F97316','#F59E0B','#22C55E','#06B6D4','#3B82F6','#8B5CF6','#EC4899',
];
// Designed backgrounds. Any CSS `background` value works, including multi-layer
// patterns. `anim` names a keyframe from BG_KEYFRAMES below; animated designs
// keep a FLAT base (linear-gradient(c,c)) so scrolling the layers doesn't drag
// a visible gradient around with them.
export const BG_DESIGNS: { label:string; css:string; anim?:'drift'|'fall'|'rise'; speed?:number }[] = [
  // ── gradients ──
  { label:'Sunset',   css:'linear-gradient(160deg,#FF9A5A 0%,#FF5F6D 55%,#C13584 100%)' },
  { label:'Peach',    css:'linear-gradient(160deg,#FFE9D6 0%,#FFC3A0 100%)' },
  { label:'Lagoon',   css:'linear-gradient(160deg,#43C6AC 0%,#191654 100%)' },
  { label:'Sky',      css:'linear-gradient(160deg,#E3F2FF 0%,#A8D8FF 100%)' },
  { label:'Mint',     css:'linear-gradient(160deg,#E8F9F1 0%,#B8E9D0 100%)' },
  { label:'Lilac',    css:'linear-gradient(160deg,#F3E7FF 0%,#C4A5FF 100%)' },
  { label:'Ember',    css:'linear-gradient(160deg,#2B1B17 0%,#7A2E1E 100%)' },
  { label:'Midnight', css:'linear-gradient(160deg,#0F172A 0%,#334155 100%)' },

  // ── patterns ──
  { label:'Dots',     css:'radial-gradient(#D6D3D1 1px,transparent 1px) 0 0/16px 16px,linear-gradient(#FAFAF9,#FAFAF9)' },
  { label:'Grid',     css:'linear-gradient(#EAEAE8 1px,transparent 1px) 0 0/22px 22px,linear-gradient(90deg,#EAEAE8 1px,transparent 1px) 0 0/22px 22px,linear-gradient(#FBFBFA,#FBFBFA)' },
  { label:'Confetti', css:'radial-gradient(4px 4px at 20% 25%,#FCA5A5,transparent),radial-gradient(4px 4px at 70% 15%,#FDE68A,transparent),radial-gradient(4px 4px at 40% 60%,#A7F3D0,transparent),radial-gradient(4px 4px at 85% 55%,#BFDBFE,transparent),radial-gradient(4px 4px at 15% 80%,#DDD6FE,transparent),linear-gradient(#FFFDF8,#FFFDF8)' },
  { label:'Waves',    css:'repeating-radial-gradient(circle at 50% 120%,rgba(255,255,255,0.5) 0 12px,transparent 12px 26px),linear-gradient(160deg,#BFE7FF 0%,#7FC5F5 100%)' },

  // ── animated ──
  { label:'Starry',   anim:'drift', speed:90,
    css:'radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1.5px 1.5px at 62% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 32% 46%,#fff,transparent),radial-gradient(2px 2px at 82% 38%,#fff,transparent),radial-gradient(1.5px 1.5px at 48% 72%,#fff,transparent),radial-gradient(1.5px 1.5px at 88% 82%,#fff,transparent),radial-gradient(1.5px 1.5px at 18% 88%,#fff,transparent),linear-gradient(160deg,#0B1026,#1B2455)' },
  { label:'Snowfall', anim:'fall', speed:26,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Ccircle cx='15' cy='20' r='2.2' fill='white' opacity='.9'/%3E%3Ccircle cx='62' cy='44' r='1.7' fill='white' opacity='.75'/%3E%3Ccircle cx='38' cy='72' r='2' fill='white' opacity='.85'/%3E%3Ccircle cx='80' cy='12' r='1.4' fill='white' opacity='.7'/%3E%3C/svg%3E\") 0 0/90px 90px,linear-gradient(#3F5E8C,#3F5E8C)" },
  { label:'Coffee',   anim:'drift', speed:60,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ctext x='8' y='34' font-size='26'%3E%E2%98%95%3C/text%3E%3Ctext x='46' y='70' font-size='20' opacity='.75'%3E%E2%98%95%3C/text%3E%3C/svg%3E\") 0 0/80px 80px,linear-gradient(#F5EADA,#F5EADA)" },
  { label:'Sparkle',  anim:'rise', speed:34,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E%3Ctext x='6' y='26' font-size='16' opacity='.85'%3E%E2%9C%A6%3C/text%3E%3Ctext x='44' y='58' font-size='12' opacity='.6'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E\") 0 0/70px 70px,linear-gradient(#2E1065,#2E1065)" },
  { label:'Hearts',   anim:'rise', speed:40,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Ctext x='8' y='30' font-size='20' opacity='.8'%3E%F0%9F%A4%8D%3C/text%3E%3Ctext x='46' y='64' font-size='15' opacity='.6'%3E%F0%9F%A4%8D%3C/text%3E%3C/svg%3E\") 0 0/76px 76px,linear-gradient(#FFE9EF,#FFE9EF)" },
  { label:'Bubbles',  anim:'rise', speed:30,
    css:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84'%3E%3Ccircle cx='18' cy='24' r='7' fill='none' stroke='white' stroke-opacity='.45' stroke-width='1.5'/%3E%3Ccircle cx='58' cy='56' r='4.5' fill='none' stroke='white' stroke-opacity='.4' stroke-width='1.3'/%3E%3Ccircle cx='70' cy='18' r='3' fill='none' stroke='white' stroke-opacity='.35' stroke-width='1.2'/%3E%3C/svg%3E\") 0 0/84px 84px,linear-gradient(#0E7490,#0E7490)" },
];

// config.bg may be a gradient/pattern. Anywhere we need a SOLID colour (e.g. to


export const FONT_OPTIONS: { label:string; family:string; google?:string }[] = [
  { label:'Default',          family:'Inter, system-ui, sans-serif' },
  { label:'Playfair',         family:'"Playfair Display", Georgia, serif',      google:'Playfair+Display:wght@700;800' },
  { label:'Poppins',          family:'"Poppins", system-ui, sans-serif',        google:'Poppins:wght@700;800' },
  { label:'DM Serif',         family:'"DM Serif Display", Georgia, serif',      google:'DM+Serif+Display' },
  { label:'Space Grotesk',    family:'"Space Grotesk", system-ui, sans-serif',  google:'Space+Grotesk:wght@600;700' },
  { label:'Bebas',            family:'"Bebas Neue", Impact, sans-serif',        google:'Bebas+Neue' },
  { label:'Cormorant',        family:'"Cormorant Garamond", Georgia, serif',    google:'Cormorant+Garamond:wght@600;700' },
  { label:'Pacifico',         family:'"Pacifico", cursive',                     google:'Pacifico' },
  { label:'Oswald',           family:'"Oswald", Impact, sans-serif',            google:'Oswald:wght@600;700' },
  { label:'Lobster',          family:'"Lobster", cursive',                      google:'Lobster' },
];
export const ORDER_PROVIDERS = [
  { key:'doordash',  label:'DoorDash'  },
  { key:'ubereats',  label:'Uber Eats' },
  { key:'grubhub',   label:'Grubhub'   },
  { key:'square',    label:'Square'    },
  { key:'toast',     label:'Toast'     },
  { key:'other',     label:'Other'     },
];
export const BOOK_PROVIDERS = [
  { key:'resy',       label:'Resy'         },
  { key:'opentable',  label:'OpenTable'    },
  { key:'calendly',   label:'Calendly'     },
  { key:'squareappts',label:'Square Appts' },
  { key:'acuity',     label:'Acuity'       },
  { key:'mindbody',   label:'Mindbody'     },
  { key:'other',      label:'Other'        },
];
export const SOCIAL_PLATFORMS = [
  { key:'instagram', label:'Instagram' },
  { key:'tiktok',    label:'TikTok'    },
  { key:'facebook',  label:'Facebook'  },
  { key:'twitter',   label:'Twitter / X'},
  { key:'youtube',   label:'YouTube'   },
];
/**
 * Layout choices offered for a block, keyed by block id.
 *
 * Only list a block here once its layouts actually render differently. The
 * picker previously offered choices for menu, order, book, socials and
 * website — "Brand / Calendar / CTA" and so on — but nothing anywhere read
 * `blockStyle` for those blocks. All three options drew the same blank grey
 * thumbnail (StyleThumb only has artwork for hours and location), nothing
 * changed in the preview, and nothing changed on the published page. The
 * owner was choosing between three identical buttons that did nothing.
 *
 * A control that does nothing is worse than no control, so those are gone
 * until the layouts behind them exist.
 */
export const BLOCK_STYLES: Record<string, { key:string; label:string }[]> = {
  hours:    [{ key:'minimal', label:'Minimal' }, { key:'clock',  label:'Clock'   }, { key:'hero',    label:'Hero'    }],
  location: [{ key:'place',   label:'Map'     }, { key:'minimal', label:'Minimal' }],
};

export const FEATURE_TAGS = [
  'Delivery','Takeout','Dine-in','Curbside pickup','Catering',
  'Dog friendly','Kid friendly','Wheelchair accessible','Free WiFi',
  'Outdoor seating','Patio','Rooftop',
  'Vegan options','Vegetarian','Gluten-free','Halal','Kosher','Organic',
  'LGBTQ+ friendly','Happy hour','Live music','Sports bar','Late night',
  'Cash only','Contactless pay',
  'Restaurant','Café','Bar','Bakery','Coffee shop','Brewery',
  'Food truck','Non-profit','Retail','Salon','Spa','Gym','Pop-up','Market',
];
export const DAYS: { key: WeekDay; label: string }[] = [
  { key:'mon',label:'Monday' },{ key:'tue',label:'Tuesday' },{ key:'wed',label:'Wednesday' },
  { key:'thu',label:'Thursday' },{ key:'fri',label:'Friday' },{ key:'sat',label:'Saturday' },{ key:'sun',label:'Sunday' },
];
export const DEFAULT_WEEK_HOURS: WeeklyHours = {
  mon:{ open:'09:00',close:'17:00',closed:false },tue:{ open:'09:00',close:'17:00',closed:false },
  wed:{ open:'09:00',close:'17:00',closed:false },thu:{ open:'09:00',close:'17:00',closed:false },
  fri:{ open:'09:00',close:'21:00',closed:false },sat:{ open:'10:00',close:'21:00',closed:false },
  sun:{ open:'10:00',close:'16:00',closed:false },
};
export const DEFAULT_BLOCKS: OpenStatusBlock[] = [
  { id:'hours',   title:'Hours & status',        sub:'Live open / closed status',  icon:'clock',on:true, tone:'default',color:'#059669',size:'full' },
  { id:'location',title:'Location & directions', sub:'Tap for directions',          icon:'pin',  on:true, tone:'default',color:'#2563eb',size:'full' },
  { id:'menu',    title:'Menu',                  sub:'Tap to view',                icon:'menu', on:false,tone:'default',color:'#d97706',menuType:'url',size:'full' },
  { id:'order',   title:'Online ordering',       sub:'DoorDash, Uber Eats & more', icon:'bag',  on:false,tone:'default',color:'#dc2626',size:'full' },
  { id:'book',    title:'Reservations',          sub:'Book a table',               icon:'cal',  on:false,tone:'default',color:'#7c3aed',size:'full' },
  { id:'website', title:'Website',               sub:'Link to your site',          icon:'globe',  on:false,tone:'default',color:'#0891b2',size:'full' },
  // Photos, Reviews and Updates render themselves from the business's Google
  // listing or connected Instagram, so they have no URL to fill in. They were
  // missing from this list entirely, which meant the picker couldn't offer
  // them AND the config merge deleted them from any page that had one saved.
  { id:'gallery', title:'Photos',                sub:'Your Google photos',         icon:'image',  on:false,tone:'default',color:'#0d9488',size:'full' },
  { id:'reviews', title:'Reviews',               sub:'Recent Google reviews',      icon:'star',   on:false,tone:'default',color:'#ca8a04',size:'full' },
  { id:'updates', title:'Latest updates',        sub:'Your recent Instagram posts',icon:'insta',  on:false,tone:'default',color:'#db2777',size:'full' },
];
