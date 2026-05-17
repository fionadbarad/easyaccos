import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import DashboardShell from './DashboardShell'

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <DashboardShell initialUser={user ?? null}>{children}</DashboardShell>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardShell initialUser={null}>{children}</DashboardShell>}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  )
}
