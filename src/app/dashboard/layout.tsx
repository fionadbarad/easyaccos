import { getCachedUser } from '@/lib/auth-shared'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser()
  return <DashboardShell initialUser={user}>{children}</DashboardShell>
}
