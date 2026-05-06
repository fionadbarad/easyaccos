import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Expense Tracker - EasyAcco | UK Sole Trader Accounting Software',
  description: 'Log and categorise business expenses under HMRC\'s "wholly and exclusively" rule. AI-powered categorisation, receipt OCR scanning, and real-time tax impact - free for UK sole traders.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
