import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from 'next/font/google'
import { Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import VercelAnalytics from '@/components/VercelAnalytics'

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
  title: "System Auditor — UK Compliance Operating System 2026/27",
  description: "Precision tax engine, MTD ITSA compliance, and audit-ready financial reporting for UK sole traders, landlords, and directors. 2026/27 HMRC-accurate.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EasyAcco",
  },
};

export const viewport: Viewport = {
  themeColor: "#181818",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        {/* Vercel analytics — deferred to not block FCP */}
        <VercelAnalytics />
        {/* Service worker registration — only in production, loaded after page is idle */}
        <Script
          src="/sw-register.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
