import type { MetadataRoute } from 'next';

/**
 * Makes the owner page installable.
 *
 * Adding /me to the home screen is what gets the icon sitting next to
 * Instagram, keeps the session alive, and — on iOS — is the only way web push
 * is allowed at all. So the install is not a nicety, it is the delivery
 * mechanism for every alert we ever want to send.
 *
 * start_url is /me rather than the token link, so no secret ends up baked
 * into a home screen shortcut.
 *
 * An owner installing from /me gets a per-business manifest instead — see
 * app/me/manifest.webmanifest — so their icon carries their own shop's name.
 * This one is the fallback for everywhere else.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OpenStatus',
    short_name: 'OpenStatus',
    description: 'Change your hours everywhere, in one tap.',
    start_url: '/me',
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
