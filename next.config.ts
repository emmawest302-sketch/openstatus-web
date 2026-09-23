// build
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-' + (process.env.BASE44_PUBLIC_HOST_SUFFIX ?? '')].filter(Boolean),
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
