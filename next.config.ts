// Pinned to Next.js 16 — APIs, conventions and file structure differ from
// older releases. Check node_modules/next/dist/docs before changing routing,
// caching or middleware behaviour.
import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),

  // ── Performance optimizations ──
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
  },

  // Use Turbopack for build (faster + better tree-shaking)
  turbopack: {
    rules: {},
  },

  images: {
    // Enable modern image formats
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        // Security headers applied to every route. These are the "always safe"
        // set — they don't restrict scripts/styles/connections so they can't
        // break the app. A full script-src/connect-src CSP is a deliberate
        // follow-up that needs runtime testing against Supabase, the currency
        // API and analytics (see docs/AUDIT.md SEC-5).
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Lock down powerful features. Camera is allowed on same-origin only
            // because the receipt scanner uses it; everything else is denied.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            // Clickjacking defence that also covers browsers ignoring
            // X-Frame-Options. frame-ancestors only — no script/style limits.
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
      {
        // Cache public pages for 1 hour
        source: '/(demo|validation|security|robots.txt|sitemap.xml)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=59',
          },
        ],
      },
      {
        // Cache the root landing page
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=59',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Reduce unused CSS and optimize for production
  compiler: {
    // Enable styled-components and emotion optimization if used
  },
}

export default nextConfig
