import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mileage Tracker — EasyAcco | HMRC Approved Mileage Claim Tool',
  description:
    "Log business mileage at HMRC's approved AMAP rates — 55p/mile for the first 10,000 miles, 25p/mile after — for your 2026/27 Self Assessment.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
