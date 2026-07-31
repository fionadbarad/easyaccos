import type { Metadata } from 'next'

export const metadata: Metadata = {
  // NOT "HMRC Approved ... Tool". The AMAP *rates* are HMRC-approved; this
  // tool is not, and the adjacency implied otherwise.
  title: 'Mileage Tracker — EasyAcco | UK Business Mileage Claims 2026/27',
  description:
    "Log business mileage at HMRC's approved AMAP rates — 55p/mile for the first 10,000 miles, 25p/mile after — for your 2026/27 Self Assessment.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
