'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import { Menu } from 'lucide-react'
import Sidebar from '@/features/shell/Sidebar'
import MobileTopBar from '@/features/shell/MobileTopBar'
import OfflineChip from '@/features/shell/OfflineChip'
import EncryptionOnboardingDialog from '@/features/onboarding/EncryptionOnboardingDialog'

export default function DashboardShell({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const pathname = usePathname()
  const router   = useRouter()

  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [user, setUser]               = useState<User | null>(initialUser)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const closeMobile = () => setMobileOpen(false)
  const closeDesktop = () => setDesktopOpen(false)
  const sidebarProps = { user, pathname, onSignOut: handleSignOut }

  return (
    <div className="flex min-h-screen bg-[var(--sa-black)]">
      <button
        className={`hidden md:flex fixed top-4 left-3 z-[51] bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded text-[var(--sa-muted)] cursor-pointer px-2 py-1.5 items-center justify-center transition-[opacity,color] duration-200 hover:text-[var(--sa-white)] ${desktopOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        onClick={() => setDesktopOpen(true)}
        title="Open sidebar">
        <Menu size={14} />
      </button>

      <div
        className={`hidden md:block fixed inset-0 z-[45] bg-black/55 transition-opacity duration-200 ${desktopOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDesktop}
      />

      <aside
        className={`hidden md:flex w-[232px] shrink-0 flex-col bg-[var(--sa-black)] border-r border-[var(--sa-border)] fixed top-0 left-0 bottom-0 z-50 transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${desktopOpen ? 'translate-x-0' : '-translate-x-[232px]'}`}>
        <Sidebar {...sidebarProps} onNavClick={closeDesktop} onClose={closeDesktop} />
      </aside>

      <MobileTopBar open={mobileOpen} onToggle={() => setMobileOpen(o => !o)} />

      <div
        className={`md:hidden fixed inset-0 z-[45] bg-black/70 transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobile}
      />

      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[232px] z-50 bg-[var(--sa-black)] border-r border-[var(--sa-border)] overflow-y-auto transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${mobileOpen ? 'translate-x-0' : '-translate-x-[232px]'}`}>
        <Sidebar {...sidebarProps} onNavClick={closeMobile} />
      </aside>

      <main className="mt-[52px] md:mt-0 flex-1 min-h-screen bg-[var(--sa-black)] overflow-auto">
        {children}
      </main>

      {user && <EncryptionOnboardingDialog />}
      <OfflineChip />
    </div>
  )
}
