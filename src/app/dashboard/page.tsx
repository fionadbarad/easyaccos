import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import DashboardUI from './DashboardUI'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const displayName = user.user_metadata?.name ?? user.email ?? 'Freelancer'

  return <DashboardUI displayName={displayName} />
}
