import { createClient } from '@/lib/supabase-server'
import DashboardUI from './DashboardUI'

// Ghost-Auth: dashboard is open to everyone. No redirect, no login wall.
// If a user is signed in we show their name; otherwise they are a guest.
export default async function DashboardPage() {
  let displayName = 'Guest'

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      displayName = user.user_metadata?.name ?? user.email ?? 'Freelancer'
    }
  } catch {
    // Supabase not reachable — still show dashboard as guest
  }

  return <DashboardUI displayName={displayName} />
}
