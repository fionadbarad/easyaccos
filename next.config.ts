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
            // Full Content-Security-Policy (SEC-5).
            //
            // The previous value was `frame-ancestors 'none'` alone, which is
            // clickjacking defence and nothing else. This adds the directives
            // that actually limit what an injected script could DO — above all
            // `connect-src`, which is the difference between an XSS bug being a
            // defacement and it being a bulk exfiltration of somebody's ledger
            // to an attacker's server.
            //
            // HONEST LIMITATION: `script-src` still allows 'unsafe-inline',
            // because Next.js's App Router bootstraps with inline scripts. That
            // weakens CSP as an XSS *mitigation*. Removing it means emitting a
            // per-request nonce from middleware and threading it through the
            // document — a real change that needs its own testing pass, and one
            // a penetration tester will likely recommend. It is deliberately not
            // bundled with a compliance fix.
            //
            // 'wasm-unsafe-eval' is required by tesseract.js, which runs receipt
            // OCR in the browser precisely so photos never reach a server.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
              // 49 components style via React's `style={{…}}`, which emits
              // inline style attributes. Far lower risk than inline script.
              "style-src 'self' 'unsafe-inline'",
              // data:/blob: cover receipt images held in memory during OCR.
              "img-src 'self' data: blob:",
              // next/font self-hosts at build time, so no external font origin.
              "font-src 'self' data:",
              // The allow-list that matters. Supabase (auth + data) and the
              // exchange-rate API are the only outbound origins the app has.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://open.er-api.com",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              // Stops an injected <base> rewriting every relative URL, and stops
              // a form being retargeted at an attacker's collector.
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
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
