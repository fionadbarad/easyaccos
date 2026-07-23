import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tax Pot Tracker — EasyAcco | Year-Round Tax Planning for Sole Traders',
  description:
    'Track your Self Assessment tax pot throughout the year. Set aside the right amount each month to avoid a shock January tax bill — HMRC 2026/27 compliant.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
