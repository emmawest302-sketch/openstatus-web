import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The embed is dropped into a business's own site, so it has to be
        // allowed inside an iframe on any origin.
        source: '/embed/:slug',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *;' }],
      },
    ];
  },
  async redirects() {
    return [
      // Legacy setup routes → new onboarding
      { source: '/setup/new', destination: '/setup', permanent: false },
      // Dashboard → builder
      { source: '/dashboard', destination: '/builder', permanent: true },
      // Pricing page → homepage pricing section
      { source: '/pricing', destination: '/#pricing', permanent: false },
    ];
  },
};

export default nextConfig;
