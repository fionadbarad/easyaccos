import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mileage Tracker — EasyAcco | HMRC Approved Mileage Claim Tool',
  description: 'Log business mileage at HMRC\'s approved rates — 45p/mile for the first 10,000 miles, 25p/mile after. Accurate AMAPs for 2026/27 Self Assessment returns.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
