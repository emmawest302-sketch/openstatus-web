import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The embed is meant to be dropped into a business's own site,
        // so it has to be allowed inside an iframe on any origin.
        source: '/embed/:slug',
        headers: [
          { key: 'X-Frame-Options', value: '' },
          {
            key: 'Content-Security-Policy',
            value: 'frame-ancestors *;',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
