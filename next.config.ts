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
