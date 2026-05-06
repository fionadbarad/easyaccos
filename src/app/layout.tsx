import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import PWARegister from '@/components/PWARegister';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  axes: ["opsz"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

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
  themeColor: "var(--sa-black)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <PWARegister />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
