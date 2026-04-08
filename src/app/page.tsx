import type { Metadata } from 'next'
import LandingPageClient from './LandingPageClient'

export const metadata: Metadata = {
  title: 'EasyAcco — Free UK Tax Calculator 2026/27',
  description: 'HMRC-accurate tax estimates for UK freelancers, employees, and students. Income tax, NI, student loans, dividends — all 2026/27 rates. Free forever, no sign-up.',
  openGraph: {
    title: 'EasyAcco — Free UK Tax Calculator 2026/27',
    description: 'HMRC-accurate tax estimates for UK freelancers, employees, and students. Free forever, no sign-up.',
    url: 'https://www.easyacco.uk',
  },
}

export default function Page() {
  return <LandingPageClient />
}
