import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'P&L Reports - EasyAcco | Profit & Loss for UK Sole Traders',
  description: 'Generate instant Profit & Loss reports for your sole-trader business. Monthly income statements, expense breakdowns, and export-ready data for your accountant.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
