import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Invoice Manager — EasyAcco | Free UK Invoicing Software',
  description: 'Create, send, and track invoices with automated overdue detection, VAT support, and professional chase emails. Free invoice lifecycle management for UK freelancers and sole traders.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
