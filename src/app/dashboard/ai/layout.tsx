import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Accounting Advisory — EasyAcco | Free UK Tax Advisor 2026/27',
  description: 'Get HMRC-accurate tax advice for 2026/27 — your accounting advisor covering sole trader income, dividends, NI, pension relief, and MTD obligations. Free and instant.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
