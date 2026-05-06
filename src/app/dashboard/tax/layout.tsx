import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tax Engine 2026/27 - EasyAcco | HMRC-Accurate Tax Calculator',
  description: 'Calculate your exact 2026/27 UK income tax and National Insurance. Covers sole traders, directors, Scotland rates, pension relief, student loans, and the 60% PA trap.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
