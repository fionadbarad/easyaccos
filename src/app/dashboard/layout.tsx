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
  LogOut, LogIn, Menu, X, Shield, BookOpen, FileText,
} from 'lucide-react'
// Kittax mascot is rendered only on the AI page

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:     '#0B0E1A',
  deep:   '#050A14',
  card:   '#111827',
  gold:   '#FFD700',
  goldSoft: '#C2A368',
  text:   '#E5E7EB',
  muted:  'rgba(229,231,235,0.5)',
  border: 'rgba(255,215,0,0.12)',
}

const SIDEBAR_W = 240

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',       icon: LayoutDashboard, group: 'main' },
  { href: '/dashboard/tax',          label: 'Tax Calculator',  icon: Calculator,      group: 'main' },
  { href: '/dashboard/expenses',     label: 'Expenses',        icon: Receipt,         group: 'main' },
  { href: '/dashboard/transactions', label: 'Daily Ledger',    icon: BookOpen,        group: 'reports' },
  { href: '/dashboard/pnl',          label: 'Financial Reports', icon: FileText,      group: 'reports' },
  { href: '/dashboard/currency',     label: 'Currency',        icon: TrendingUp,      group: 'tools' },
  { href: '/dashboard/learn',        label: 'Learn',           icon: GraduationCap,   group: 'tools' },
  { href: '/dashboard/ai',           label: 'Kittax AI',       icon: Bot,             group: 'tools' },
  { href: '/dashboard/settings',     label: 'Settings',        icon: Settings,        group: 'tools' },
  { href: '/security',               label: 'Security',        icon: Shield,          group: 'tools' },
]

const GROUP_LABELS: Record<string, string> = {
  main:    'CORE',
  reports: 'REPORTS',
  tools:   'TOOLS',
}

function NavItem({ href, label, Icon, active, onClick }: {
  href: string; label: string; Icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '9px 14px', borderRadius: '6px', textDecoration: 'none',
        fontSize: '0.85rem', fontWeight: active ? 600 : 400,
        color:      active ? C.gold : C.muted,
        background: active ? 'rgba(255,215,0,0.09)' : 'transparent',
        borderLeft: `2px solid ${active ? C.gold : 'transparent'}`,
        transition: 'all 0.15s',
      }}>
      <Icon size={16} />
      {label}
    </Link>
  )
}

function Sidebar({ user, pathname, onSignOut, onNavClick }: {
  user: User | null; pathname: string; onSignOut: () => void; onNavClick?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: `1px solid ${C.border}` }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            E<span style={{ color: C.text, fontSize: '1.1rem', fontWeight: 400 }}>asy</span>Acco
          </span>
        </Link>
        <div style={{ color: C.muted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>
          2026/27 Fiscal Engine
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' }}>
        {Object.entries(
          NAV.reduce((acc, item) => {
            if (!acc[item.group]) acc[item.group] = []
            acc[item.group].push(item)
            return acc
          }, {} as Record<string, typeof NAV>)
        ).map(([group, items]) => (
          <div key={group}>
            <div style={{ padding: '8px 14px 4px', color: 'rgba(194,163,104,0.5)', fontSize: '0.6rem', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}>
              {GROUP_LABELS[group] ?? group}
            </div>
            {items.map(({ href, label, icon: Icon }) => (
              <NavItem
                key={href} href={href} label={label} Icon={Icon}
                active={pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))}
                onClick={onNavClick}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${C.border}` }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(255,215,0,0.12)', border: `1px solid rgba(255,215,0,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.gold, fontSize: '0.75rem', fontWeight: 700,
              }}>
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: C.text, fontSize: '0.78rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
                <div style={{ color: C.gold, fontSize: '0.65rem' }}>Signed in</div>
              </div>
            </div>
            <button onClick={onSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', padding: '4px 0' }}>
              <LogOut size={13} /> Sign Out
            </button>
          </>
        ) : (
          <div>
            <div style={{ color: C.muted, fontSize: '0.75rem', marginBottom: '8px' }}>
              <span style={{ color: C.gold }}>●</span> Guest Mode — all features active
            </div>
            <Link href="/auth/login"
              style={{ display: 'flex', alignItems: 'center', gap: '7px', color: C.goldSoft, textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
              <LogIn size={13} /> Sign in to Save &amp; Export
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()

  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [user, setUser]           = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const sidebarProps = { user, pathname, onSignOut: handleSignOut }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

      {/* ── DESKTOP SIDEBAR ── */}
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
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-playfair)', color: C.gold, fontSize: '1.2rem', fontWeight: 700 }}>EasyAcco</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', display: 'flex', padding: '4px' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="backdrop" className="md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.65)' }} />
            <motion.aside key="drawer" className="md:hidden"
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

      {/* ── MAIN CONTENT ── */}
      <main
        className="md:ml-[240px] mt-14 md:mt-0"
        style={{ flex: 1, minHeight: '100vh', background: C.bg, overflow: 'auto' }}>

        {/* Guest mode warning banner */}
        {!user && (
          <div style={{
            background: 'rgba(251,146,60,0.1)', borderBottom: '1px solid rgba(251,146,60,0.35)',
            padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FB923C', fontSize: '0.85rem' }}>⚠</span>
              <span style={{ color: '#FB923C', fontSize: '0.8rem', fontWeight: 600 }}>Guest Mode</span>
              <span style={{ color: 'rgba(251,146,60,0.75)', fontSize: '0.78rem' }}>
                — your data is not saved. Sign in to keep your records.
              </span>
            </div>
            <Link href="/auth/login"
              style={{
                color: '#FB923C', fontSize: '0.75rem', fontWeight: 700,
                textDecoration: 'none', padding: '4px 12px',
                border: '1px solid rgba(251,146,60,0.4)', borderRadius: '4px',
                background: 'rgba(251,146,60,0.08)', flexShrink: 0,
              }}>
              Sign in to save →
            </Link>
          </div>
        )}

        {children}
      </main>

      {/* Kittax cat lives only on the AI page — see /dashboard/ai/page.tsx */}
    </div>
  )
}
