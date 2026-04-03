'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard, Calculator, Receipt, ArrowLeftRight,
  GraduationCap, Bot, BarChart2, Settings, TrendingUp,
  LogOut, Menu, X,
} from 'lucide-react'

// ─── Celestial palette ───────────────────────────────────────────────────────
const C = {
  bg:     '#1A2342',
  deep:   '#0F1628',
  card:   '#4A4066',
  gold:   '#C2A368',
  text:   '#E4D3B4',
  muted:  'rgba(228,211,180,0.5)',
  border: 'rgba(194,163,104,0.18)',
}

const SIDEBAR_W = 236

const NAV = [
  { href: '/dashboard',              label: 'Overview',     icon: LayoutDashboard },
  { href: '/dashboard/tax',          label: 'Tax Estimator',icon: Calculator      },
  { href: '/dashboard/expenses',     label: 'Expenses',     icon: Receipt         },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight  },
  { href: '/dashboard/pnl',          label: 'P&L Report',   icon: BarChart2       },
  { href: '/dashboard/currency',     label: 'Currency',     icon: TrendingUp      },
  { href: '/dashboard/learn',        label: 'Learn',        icon: GraduationCap   },
  { href: '/dashboard/ai',           label: 'AI Assistant', icon: Bot             },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings        },
]

function NavItem({ href, label, Icon, active, onClick }: {
  href: string; label: string; Icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 14px', borderRadius: '5px', textDecoration: 'none',
        fontSize: '0.875rem', fontWeight: active ? 600 : 400,
        color:      active ? C.gold : C.muted,
        background: active ? 'rgba(194,163,104,0.12)' : 'transparent',
        borderLeft: `2px solid ${active ? C.gold : 'transparent'}`,
        transition: 'all 0.15s',
      }}>
      <Icon size={17} />
      {label}
    </Link>
  )
}

function Sidebar({ user, pathname, onSignOut, onNavClick }: {
  user: User | null; pathname: string; onSignOut: () => void; onNavClick?: () => void
}) {
  const initial = user?.email?.[0]?.toUpperCase() ?? '…'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.3rem', fontWeight: 700 }}>
          EasyAcco
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {NAV.map(({ href, label, icon: Icon }) => (
          <NavItem
            key={href} href={href} label={label} Icon={Icon}
            active={pathname === href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(194,163,104,0.18)', border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.gold, fontSize: '0.75rem', fontWeight: 700,
          }}>
            {initial}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ color: C.text, fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email ?? 'Loading…'}
            </div>
          </div>
        </div>
        <button onClick={onSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0' }}>
          <LogOut size={13} /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // ── FIX: create Supabase client once via ref (not on every render) ──────────
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // ── FIX: getSession() reads the cached cookie immediately (no network
  //         round-trip) so the sidebar never hangs on "Loading…". Then we
  //         subscribe to auth changes for sign-in / sign-out events. ──────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const sidebarProps = { user, pathname, onSignOut: handleSignOut }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

      {/* ── DESKTOP SIDEBAR (always visible md+) ── */}
      <aside
        className="hidden md:flex"
        style={{
          width: `${SIDEBAR_W}px`, flexShrink: 0, flexDirection: 'column',
          background: C.deep, borderRight: `1px solid ${C.border}`,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 30,
        }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px', zIndex: 40,
          background: C.deep, borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem',
        }}>
        <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.2rem', fontWeight: 700 }}>EasyAcco</span>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', display: 'flex', padding: '4px' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── MOBILE DRAWER + BACKDROP ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop — pointer-events only on the backdrop itself */}
            <motion.div
              key="backdrop"
              className="md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.65)' }}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              className="md:hidden"
              initial={{ x: -SIDEBAR_W }} animate={{ x: 0 }} exit={{ x: -SIDEBAR_W }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: `${SIDEBAR_W}px`, zIndex: 50,
                background: C.deep, borderRight: `1px solid ${C.border}`,
              }}>
              <Sidebar {...sidebarProps} onNavClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ──
           md:ml-[236px]  pushes content right of the fixed sidebar on desktop.
           mt-14 md:mt-0  clears the mobile top bar on small screens.
           No fixed/absolute overlay here — clicks always reach the content. ── */}
      <main
        className="md:ml-[236px] mt-14 md:mt-0"
        style={{ flex: 1, minHeight: '100vh', background: C.bg, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
