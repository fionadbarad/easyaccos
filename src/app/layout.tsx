import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import '@/styles/EasyAccoTheme.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: 'EasyAcco — Free UK Tax Calculator 2026/27',
    template: '%s | EasyAcco',
  },
  description: 'Free HMRC-accurate UK tax calculator for freelancers, employees, and students. Income tax, NI, dividends, student loans — all 2026/27 rates. No account needed.',
  metadataBase: new URL('https://www.easyacco.uk'),
  openGraph: {
    type: 'website',
    siteName: 'EasyAcco',
    title: 'EasyAcco — Free UK Tax Calculator 2026/27',
    description: 'Free HMRC-accurate UK tax calculator for freelancers, employees, and students. No account needed.',
    url: 'https://www.easyacco.uk',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EasyAcco — UK Tax Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyAcco — Free UK Tax Calculator 2026/27',
    description: 'HMRC-accurate tax estimates for freelancers & students. Free forever. No sign-up.',
    images: ['/og-image.png'],
  },
  keywords: ['UK tax calculator', 'HMRC 2026', 'self assessment', 'freelancer tax', 'income tax calculator UK', 'student loan repayment', 'NI calculator', 'self employed tax'],
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }} suppressHydrationWarning>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
