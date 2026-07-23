'use client'

import Script from 'next/script'

/**
 * Vercel SpeedInsights and Analytics — loaded lazily after FCP.
 * This replaces the direct imports from @vercel/speed-insights/next
 * and @vercel/analytics/next which add to the initial bundle.
 *
 * Placed in a dedicated client component so it can be used with
 * strategy="lazyOnload" via Next.js Script.
 */
export default function VercelAnalytics() {
  return (
    <>
      {/* Vercel Speed Insights — loads after page is fully idle */}
      <Script
        src="https://va.vercel-scripts.com/v1/script.debug.js"
        strategy="lazyOnload"
      />
      {/* Vercel Analytics — loads after page is fully idle */}
      <Script
        src="https://va.vercel-scripts.com/v1/analytics/script.debug.js"
        strategy="lazyOnload"
      />
    </>
  )
}
