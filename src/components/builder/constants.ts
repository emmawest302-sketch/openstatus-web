/**
 * Builder constants: palettes, fonts, providers, block defaults.
 *
 * Pulled out of builder-client.tsx as part of breaking up a 5,000-line file.
 * Types come back from builder-client as type-only imports, which TypeScript
 * erases — so there is no runtime import cycle here.
 */
import type { OpenStatusBlock, WeekDay, WeeklyHours } from '@/components/builder-client';

// ── constants ──────────────────────────────────────────────────────────────────
/**
 * Backgrounds a business page can sit on.
 *
 * What used to be here: Confetti, Waves, Starry, Snowfall, Coffee, Sparkle,
 * Hearts, Bubbles — animated emoji wallpapers, several of them scrolling. They
 * were fun to build and they made every page that used one look like a free
 * website from 2009, which is the opposite of what a customer checking whether
 * the shop is open needs to feel. A background's job here is to be a surface
 * the hours card reads well on.
 *
 * So: a curated set of solids, a set of gradients that were mixed rather than
 * picked, and a colour wheel for the owner who knows their brand hex. No
 * patterns, no motion.
 */

/** Curated solids. Neutral enough that any accent works on top. */
export const BG_SOLIDS = [
  '#FFFFFF',
  '#F7F7F5',
  '#F1EDE5',
  '#E9EFE7',
  '#EDF2F4',
  '#F2E8DC',
  '#EDEDEB',
  '#111111',
];

/**
 * Kept as the name the pickers already import, so this is a palette swap
 * rather than a rename that touches every call site.
 */
export const BG_RAINBOW = BG_SOLIDS;

export const PREMIUM_GRADIENTS: { label:string; css:string }[] = [
  { label:'Cream',  css:'linear-gradient(160deg, #F2EADF 0%, #FFFFFF 100%)' },
  { label:'Sage',   css:'linear-gradient(160deg, #DFE9DD 0%, #F8F6F0 100%)' },
  { label:'Stone',  css:'linear-gradient(160deg, #E5E4E0 0%, #FAFAF8 100%)' },
  { label:'Powder', css:'linear-gradient(160deg, #E4EDF2 0%, #FAFCFD 100%)' },
  { label:'Sand',   css:'linear-gradient(160deg, #EBD8C6 0%, #F8EDE5 100%)' },
  { label:'Blush',  css:'linear-gradient(160deg, #F0DEDA 0%, #FAF4EE 100%)' },
  { label:'Cobalt', css:'linear-gradient(160deg, #2F5AE5 0%, #86A3FF 100%)' },
  { label:'Night',  css:'linear-gradient(160deg, #242424 0%, #080808 100%)' },
];

/**
 * The gradients, under the name the existing picker imports.
 *
 * `anim` and `speed` are gone from every entry rather than from the type: a
 * page saved with an old animated background still carries bgAnim in its
 * config and still renders, it just cannot be chosen again.
 */
export const BG_DESIGNS: { label:string; css:string; anim?:'drift'|'fall'|'rise'; speed?:number }[] =
  PREMIUM_GRADIENTS;

// config.bg may be a gradient/pattern. Anywhere we need a SOLID colour (e.g. to


/**
 * The fonts a business can set its page in.
 *
 * Pacifico and Lobster are gone. A novelty script is a font you choose once,
 * at signup, and then live with on every link you ever text a customer — and
 * there is no version of "live hours" that reads well in Lobster. What is left
 * is a set that covers the range a small business actually needs: a neutral
 * sans, a warm sans, a couple of geometrics, three serifs with different
 * temperatures, and one condensed for signage.
 *
 * `google` is the css2 family query. Both the builder (which injects a link
 * tag as you preview) and the public page read it, so adding a font here is
 * the only step needed to make it load.
 *
 * Weights go down to 400: the page sets its own weights per element now, and
 * only shipping 700/800 meant body copy was faked-bold by the browser.
 */
export const FONT_OPTIONS: { label:string; family:string; google?:string }[] = [
  { label:'Inter',            family:'Inter, system-ui, sans-serif' },
  { label:'Poppins',          family:'"Poppins", system-ui, sans-serif',        google:'Poppins:wght@400;500;600;700' },
  { label:'Manrope',          family:'"Manrope", system-ui, sans-serif',        google:'Manrope:wght@400;500;600;700' },
  { label:'DM Sans',          family:'"DM Sans", system-ui, sans-serif',        google:'DM+Sans:wght@400;500;600;700' },
  { label:'Space Grotesk',    family:'"Space Grotesk", system-ui, sans-serif',  google:'Space+Grotesk:wght@400;500;600;700' },
  { label:'Montserrat',       family:'"Montserrat", system-ui, sans-serif',     google:'Montserrat:wght@400;500;600;700' },
  { label:'Archivo',          family:'"Archivo", system-ui, sans-serif',        google:'Archivo:wght@400;500;600;700' },
  { label:'Playfair',         family:'"Playfair Display", Georgia, serif',      google:'Playfair+Display:wght@500;600;700' },
  { label:'DM Serif',         family:'"DM Serif Display", Georgia, serif',      google:'DM+Serif+Display' },
  { label:'Cormorant',        family:'"Cormorant Garamond", Georgia, serif',    google:'Cormorant+Garamond:wght@500;600;700' },
  { label:'Oswald',           family:'"Oswald", Impact, sans-serif',            google:'Oswald:wght@400;500;600' },
];

export const ORDER_PROVIDERS = [
  { key:'doordash',  label:'DoorDash'  },
  { key:'ubereats',  label:'Uber Eats' },
  { key:'grubhub',   label:'Grubhub'   },
  { key:'square',    label:'Square'    },
  { key:'toast',     label:'Toast'     },
  { key:'other',     label:'Other'     },
];
/**
 * Where a business already sells online. OpenStatus links out; it does not
 * hold a catalogue, stock or a checkout.
 */
export const SHOP_PROVIDERS = [
  { key:'shopify',     label:'Shopify'     },
  { key:'square',      label:'Square'      },
  { key:'woocommerce', label:'WooCommerce' },
  { key:'etsy',        label:'Etsy'        },
  { key:'other',       label:'Other'       },
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
/*
 * A per-block layout list lived here. It went the same way the pickers did:
 * every row renders through one component now, nothing reads `blockStyle`,
 * so Minimal / Clock / Hero were three names for one look. See the note above
 * ImageAppearanceControls in builder-client.
 */
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
  // This list IS the starting order of a new page, and the owner reorders it
  // from there — lib/page-rows publishes whatever order is saved. So it opens
  // in the order that suits most businesses: the reason they are here, then
  // what a customer decides with, then what they act on, then what they read.
  { id:'hours',   title:'Hours & status',        sub:'Live open / closed status',  icon:'clock',on:true, tone:'default',color:'#059669',size:'full' },
  { id:'gallery', title:'Photos',                sub:'Your Google photos',         icon:'image',  on:false,tone:'default',color:'#0d9488',size:'full' },
  { id:'menu',    title:'Menu',                  sub:'Tap to view',                icon:'menu', on:false,tone:'default',color:'#d97706',menuType:'url',size:'full' },
  { id:'offers',  title:'Offers',                sub:'Deals running right now',    icon:'tag',    on:false,tone:'default',color:'#c2410c',size:'full' },
  { id:'shop',    title:'Shop',                  sub:'Shop online',                icon:'bag',    on:false,tone:'default',color:'#4338ca',size:'full' },
  { id:'order',   title:'Online ordering',       sub:'DoorDash, Uber Eats & more', icon:'bag',  on:false,tone:'default',color:'#dc2626',size:'full' },
  { id:'book',    title:'Reservations',          sub:'Book a table',               icon:'cal',  on:false,tone:'default',color:'#7c3aed',size:'full' },
  { id:'reviews', title:'Reviews',               sub:'Recent Google reviews',      icon:'star',   on:false,tone:'default',color:'#ca8a04',size:'full' },
  // Not rows. These two hold the values the page HEADER reads (the Website
  // button and the Directions button), so they stay in the config and stay out
  // of the reorderable list. See HEADER_ACTION_IDS in lib/page-rows.
  { id:'location',title:'Location & directions', sub:'Tap for directions',          icon:'pin',  on:true, tone:'default',color:'#2563eb',size:'full' },
  { id:'website', title:'Website',               sub:'Link to your site',          icon:'globe',  on:false,tone:'default',color:'#0891b2',size:'full' },
  // 'updates' (Instagram posts) is deliberately absent. The block renders, but
  // nothing in the app can create the Meta token it reads and no job populates
  // the posts table — there is no Connect Instagram button and no cron. So it
  // was a feature an owner could switch on, see a placeholder for in the
  // preview, and never see on their page. It comes back when the connect flow
  // and the sync job do. The renderer and the block id are untouched, so any
  // business that already has it saved keeps working.
];

/**
 * Categories where an online store is likely enough to lead with.
 *
 * Progressive relevance, not gating: Shop stays in Add Block for everyone, a
 * restaurant just does not get it suggested. Deliberately a flat list — a
 * clever rule here would be a rule to maintain.
 */
export const SHOP_SUGGESTED_CATEGORIES = new Set(['retail', 'online', 'other']);
