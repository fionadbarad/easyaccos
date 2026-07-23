import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings — EasyAcco | Secure Account & Backup Management',
  description:
    'Manage your EasyAcco account, update your profile, and back up your encrypted financial data. AES-256 encrypted backups with optional passphrase protection.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
