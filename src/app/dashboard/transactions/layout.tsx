import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ledger — EasyAcco | Double-Entry Transaction Log',
  description: 'Maintain a clean double-entry transaction ledger for your sole-trader business. Track income, expenses, and net position with audit-ready records.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
