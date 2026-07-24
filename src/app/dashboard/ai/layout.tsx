import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Acco Tax Advisory — EasyAcco | Free UK Tax Advisor 2026/27',
  description:
    'Get 2026/27 tax guidance from Acco — an AI assistant covering sole trader income, dividends, NI, pension relief, and MTD obligations. Free and instant. Estimates only, not a substitute for professional advice.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
