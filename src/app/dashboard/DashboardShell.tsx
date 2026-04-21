'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import { Menu } from 'lucide-react'
import { C } from '@/styles/palette'
import Sidebar from '@/features/shell/Sidebar'
import MobileTopBar from '@/features/shell/MobileTopBar'
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
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <button
        className="hidden md:flex"
        onClick={() => setDesktopOpen(true)}
        title="Open sidebar"
        style={{
          position: 'fixed', top: '1rem', left: '0.75rem',
          zIndex: 51, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: '4px', color: C.muted, cursor: 'pointer',
          padding: '6px 8px', alignItems: 'center', justifyContent: 'center',
          opacity: desktopOpen ? 0 : 1,
          pointerEvents: desktopOpen ? 'none' : 'auto',
          transition: 'opacity 0.2s ease, color 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.white}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}>
        <Menu size={14} />
      </button>

      <div
        className="hidden md:block"
        onClick={closeDesktop}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.55)',
          opacity: desktopOpen ? 1 : 0,
          pointerEvents: desktopOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      <aside
        className="hidden md:flex"
        style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0, flexDirection: 'column',
          background: C.bg, borderRight: `1px solid ${C.border}`,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: desktopOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}>
        <Sidebar {...sidebarProps} onNavClick={closeDesktop} onClose={closeDesktop} />
      </aside>

      <MobileTopBar open={mobileOpen} onToggle={() => setMobileOpen(o => !o)} />

      <div
        className="md:hidden"
        onClick={closeMobile}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.7)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      <aside
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: `${SIDEBAR_W}px`, zIndex: 50,
          background: C.bg, borderRight: `1px solid ${C.border}`,
          transform: mobileOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_W}px)`,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}>
        <Sidebar {...sidebarProps} onNavClick={closeMobile} />
      </aside>

      <main
        className="mt-[52px] md:mt-0"
        style={{ flex: 1, minHeight: '100vh', background: C.bg, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
