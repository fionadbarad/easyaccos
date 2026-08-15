'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-client-singleton'
import { clearServiceWorkerCaches } from '@/lib/sw-cache'
import type { User } from '@supabase/supabase-js'
import { Menu, AlertTriangle } from 'lucide-react'
import Sidebar from '@/features/shell/Sidebar'
import MobileTopBar from '@/features/shell/MobileTopBar'
import OfflineChip from '@/features/shell/OfflineChip'
import EncryptionOnboardingDialog from '@/features/onboarding/EncryptionOnboardingDialog'
import SADeadlineBanner from '@/features/shell/SADeadlineBanner'
import NoticeBanner from '@/features/shell/NoticeBanner'
import { SIDEBAR_W } from '@/features/shell/nav-config'

export default function DashboardShell({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(initialUser)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    let mounted = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    if (supabase) {
      // Defence in depth: the HMRC token cookie is bound to the Supabase user
      // and unusable by the next account, but it should not outlive the
      // session on a shared device either. Best-effort — sign-out proceeds
      // even if the disconnect call fails.
      await fetch('/api/hmrc/auth/disconnect', { method: 'POST' }).catch(() => {})
      await supabase.auth.signOut()
      // Purge the service worker's caches before leaving. The worker never
      // stores private routes, but on a shared device nothing cached during
      // one account's session should outlive it. Awaited so the delete is not
      // cut short by the navigation; it self-resolves if no worker answers.
      await clearServiceWorkerCaches()
      router.push('/')
    }
  }

  const closeMobile = () => setMobileOpen(false)
  const closeDesktop = () => setDesktopOpen(false)
  const sidebarProps = { user, pathname, onSignOut: handleSignOut }

  return (
    <div className="flex min-h-screen bg-sa-black">
      <button
        className={`hidden md:flex hover:text-white transition-colors duration-100 fixed top-4 left-3 z-[51] bg-sa-surface border border-sa-border rounded cursor-pointer px-2 py-1.5 items-center justify-center ${
          desktopOpen ? 'text-transparent' : 'text-sa-muted'
        }`}
        onClick={() => setDesktopOpen(true)}
        title="Open sidebar"
        style={{
          opacity: desktopOpen ? 0 : 1,
          pointerEvents: desktopOpen ? 'none' : 'auto',
        }}
      >
        <Menu size={14} />
      </button>

      <div
        className="hidden md:block"
        onClick={closeDesktop}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 45,
          background: 'rgba(0,0,0,0.55)',
          opacity: desktopOpen ? 1 : 0,
          pointerEvents: desktopOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      <aside
        className="hidden md:flex shrink-0 flex-col bg-sa-black border-r border-sa-border fixed top-0 left-0 bottom-0 z-50"
        style={{
          width: `${SIDEBAR_W}px`,
          transform: desktopOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Sidebar {...sidebarProps} onNavClick={closeDesktop} onClose={closeDesktop} />
      </aside>

      <MobileTopBar open={mobileOpen} onToggle={() => setMobileOpen((o) => !o)} />

      <div
        className="md:hidden"
        onClick={closeMobile}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 45,
          background: 'rgba(0,0,0,0.7)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      <aside
        className="md:hidden bg-sa-black border-r border-sa-border"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: `${SIDEBAR_W}px`,
          zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}
      >
        <Sidebar {...sidebarProps} onNavClick={closeMobile} />
      </aside>

      <main className="mt-[52px] md:mt-0 flex-1 min-h-screen bg-sa-black overflow-auto">
        <SADeadlineBanner />
        {!user && (
          <NoticeBanner variant="warning" icon={AlertTriangle}>
            Guest mode — your data is not saved.{' '}
            <Link
              href="/auth/login"
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Sign in to keep your records →
            </Link>
          </NoticeBanner>
        )}
        {children}
      </main>

      {user && <EncryptionOnboardingDialog />}
      <OfflineChip />
    </div>
  )
}
