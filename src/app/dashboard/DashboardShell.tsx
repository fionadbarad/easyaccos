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
import { SIDEBAR_W } from '@/features/shell/nav-config'

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
    <div className="flex min-h-screen bg-[#181818]">
      <button
        className={`hidden md:flex fixed top-4 left-3 z-[51] bg-[#1C1D20] border border-[rgba(244,245,248,0.07)] rounded-[4px] text-[rgba(244,245,248,0.42)] hover:text-[#F4F5F8] cursor-pointer p-[6px_8px] items-center justify-center transition-[opacity,color] duration-200 ${desktopOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        onClick={() => setDesktopOpen(true)}
        title="Open sidebar"
      >
        <Menu size={14} />
      </button>

      <div
        className={`hidden md:block fixed inset-0 z-[45] bg-[rgba(0,0,0,0.55)] transition-opacity duration-200 ${desktopOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeDesktop}
      />

      <aside
        className="hidden md:flex"
        style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0, flexDirection: 'column',
          background: '#181818', borderRight: '1px solid rgba(244,245,248,0.07)',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: desktopOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
        <Sidebar {...sidebarProps} onNavClick={closeDesktop} onClose={closeDesktop} />
      </aside>

      <MobileTopBar open={mobileOpen} onToggle={() => setMobileOpen(o => !o)} />

      <div
        className={`md:hidden fixed inset-0 z-[45] bg-[rgba(0,0,0,0.7)] transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeMobile}
      />

      <aside
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: `${SIDEBAR_W}px`, zIndex: 50,
          background: '#181818', borderRight: '1px solid rgba(244,245,248,0.07)',
          transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}>
        <Sidebar {...sidebarProps} onNavClick={closeMobile} />
      </aside>

      <main className="mt-[52px] md:mt-0 flex-1 min-h-screen bg-[#181818] overflow-auto">
        {children}
      </main>

      {user && <EncryptionOnboardingDialog />}
      <OfflineChip />
    </div>
  )
}
