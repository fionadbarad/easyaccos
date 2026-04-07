import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";
import '@/styles/EasyAccoTheme.css';

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
  title: "EasyAcco — UK Tax Sanctuary for Freelancers & Gen Z",
  description: "The UK's first Dark Luxury tax platform for freelancers and Gen Z. Free tax estimator, AI assistant, expense tracker, and more.",
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
        <Analytics />
      </body>
    </html>
  );
}
