import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import PWARegister from '@/components/PWARegister';

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <PWARegister />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
