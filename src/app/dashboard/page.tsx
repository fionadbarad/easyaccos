import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import DashboardUI from './DashboardUI'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your EasyAcco dashboard — tax calculator, expense tracker, P&L reports, and AI tax assistant. Free for UK freelancers and employees.',
  openGraph: {
    title: 'Dashboard | EasyAcco',
    description: 'Your free UK tax and finance dashboard. HMRC-accurate estimates, expense tracking, and AI guidance.',
    url: 'https://www.easyacco.uk/dashboard',
  },
}

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
