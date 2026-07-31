import type { Metadata } from 'next'
import LandingPage from './LandingPage'

export const metadata: Metadata = {
  title: 'EasyAcco — Free UK Tax Software for Sole Traders & Freelancers 2026/27',
  description:
    'Income tax and NI estimates using 2026/27 UK rates, expense tracking, invoice management, and MTD tooling — all free, no account required. Built for UK sole traders, freelancers, and directors. Estimates only, not tax advice.',
  keywords: [
    'UK tax software',
    'sole trader accounting',
    'self assessment calculator',
    'HMRC 2026/27',
    'free tax tool UK',
    'freelancer tax calculator',
    'self employed NI calculator',
    'Making Tax Digital MTD',
    'UK expense tracker',
    'personal allowance calculator',
    'dividend tax calculator UK',
  ],
  openGraph: {
    title: 'EasyAcco — Free UK Tax Software for Sole Traders 2026/27',
    description:
      'Tax estimates using 2026/27 UK rates, expense tracking, and invoicing. Free for UK sole traders and freelancers.',
    type: 'website',
    locale: 'en_GB',
  },
  alternates: {
    canonical: 'https://easyacco.vercel.app',
  },
}

export default function Home() {
  return <LandingPage />
}
