/** @type {import('next').NextConfig} */
const dns = require("dns");
const { withSentryConfig } = require("@sentry/nextjs");

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pklbqruulnpalzxurznr.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    unoptimized: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // TODO: Fix pre-existing type errors across POS/product components, then re-enable
    ignoreBuildErrors: true,
  },
  // Rewrite root to /home so visitors don't see a redirect
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home',
      },
    ];
  },
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://js.paystack.co`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://pklbqruulnpalzxurznr.supabase.co https://images.unsplash.com",
              "font-src 'self'",
              "connect-src 'self' https://pklbqruulnpalzxurznr.supabase.co wss://pklbqruulnpalzxurznr.supabase.co https://api.paystack.co https://o4511092085948416.ingest.us.sentry.io",
              "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // PWA - service worker
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-cache, no-store, must-revalidate, proxy-revalidate'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      // In development, prevent caching of chunks
      ...(process.env.NODE_ENV === 'development' ? [{
        source: '/_next/static/chunks/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      }] : []),
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: 'leeztruestyles',
  project: 'leeztruestyles',

  silent: !process.env.CI,

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});
