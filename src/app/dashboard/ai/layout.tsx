import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kittax Tax Advisory - EasyAcco | Free UK Tax Advisor 2026/27',
  description: 'Get HMRC-accurate tax advice for 2026/27 from Kittax - your AI tax advisor covering sole trader income, dividends, NI, pension relief, and MTD obligations. Free and instant.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
