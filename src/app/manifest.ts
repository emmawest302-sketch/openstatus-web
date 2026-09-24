import type { MetadataRoute } from 'next';

/**
 * Makes OpenStatus itself installable.
 *
 * This started life pointing at /me, on the theory that an owner wants a
 * single-purpose hours widget on their home screen and nothing else. In
 * practice they want their whole shop: hours today, yes, but also the photo
 * they need to swap and the offer that ends on Sunday. Two icons for one
 * product is a thing to explain; one is a thing to use. So the app installs
 * as the app, opening on the builder.
 *
 * Two manifests now, for the two different things someone installs:
 *   - this one    — OpenStatus, the owner's app  → /builder
 *   - [slug]/…    — a customer adding a shop     → /<slug>
 *
 * There was a third, for a password-less phone page that only did hours. It
 * is gone, along with the page: two icons for one product is a thing to
 * explain, one is a thing to use.
 *
 * The shop page overrides `manifest` in its own metadata; everything else
 * lands here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenStatus',
    short_name: 'OpenStatus',
    description: 'Change your hours everywhere, in one tap.',
    start_url: '/builder',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F4F5F6',
    theme_color: '#0A0A0A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // The "any" icon has transparent rounded corners. Declaring it maskable
      // too meant Android cropped those corners into its own circle and cut
      // the artwork; the maskable file is opaque and full-bleed with the mark
      // inside the safe zone.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
