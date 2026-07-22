import { getCachedUser } from '@/lib/auth-shared'
import DashboardUI from './DashboardUI'

// Ghost-Auth: dashboard is open to everyone. No redirect, no login wall.
// If a user is signed in we show their name; otherwise they are a guest.
export default async function DashboardPage() {
  const user = await getCachedUser()
  const displayName = user ? (user.user_metadata?.name ?? user.email ?? 'Freelancer') : 'Guest'

  return <DashboardUI displayName={displayName} />
}
