import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import { Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Preload Inter with optimized subsets — only loads weights 400, 500, 600
// and Latin subset. Preconnected to Google Fonts CDN.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-geist-mono',
  preload: false, // monospace font not critical for FCP
})

export const metadata: Metadata = {
  title: 'System Auditor — UK Compliance Operating System 2026/27',
  description:
    'Tax engine, MTD ITSA tooling, and financial reporting for UK sole traders, landlords, and directors, using 2026/27 UK rates. Estimates only, not a substitute for professional advice.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EasyAcco',
  },
}

export const viewport: Viewport = {
  themeColor: '#181818',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorBoundary>{children}</ErrorBoundary>
        {/* NO ANALYTICS, DELIBERATELY. Vercel Analytics and Speed Insights used
            to load here on every route, before any consent and including
            authenticated /dashboard pages — while /security told visitors
            "EasyAcco does not embed tracking pixels, analytics SDKs, or ad
            networks". That statement is now true.

            Non-essential storage needs prior consent under PECR reg. 6, and an
            inaccurate description of processing breaches UK GDPR Art. 5(1)(a).
            Reinstating any third-party script here means: a working consent
            gate that actually controls loading, the processor named in
            /privacy, and the /security copy corrected. Do not re-add one
            without all three. */}
        {/* Service worker registration — only in production, loaded after page is idle */}
        <Script src="/sw-register.js" strategy="lazyOnload" />
      </body>
    </html>
  )
}
