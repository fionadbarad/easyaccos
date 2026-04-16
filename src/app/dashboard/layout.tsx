'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard, Calculator, Receipt,
  GraduationCap, Bot, Settings, TrendingUp,
  LogOut, LogIn, Menu, X, Shield, BookOpen, FileText,
  MessageCircle,
} from 'lucide-react'

const C = {
  bg:      '#181818',
  surface: '#1C1D20',
  gray:    '#222326',
  white:   '#F4F5F8',
  muted:   'rgba(244,245,248,0.42)',
  border:  'rgba(244,245,248,0.07)',
  active:  'rgba(244,245,248,0.06)',
}

const SIDEBAR_W = 232

const NAV = [
  { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard, group: 'core' },
  { href: '/dashboard/tax',          label: 'Tax Engine',    icon: Calculator,      group: 'core' },
  { href: '/dashboard/expenses',     label: 'Expenses',      icon: Receipt,         group: 'core' },
  { href: '/dashboard/transactions', label: 'Ledger',        icon: BookOpen,        group: 'reports' },
  { href: '/dashboard/pnl',          label: 'Reports',       icon: FileText,        group: 'reports' },
  { href: '/dashboard/currency',     label: 'Currency',      icon: TrendingUp,      group: 'tools' },
  { href: '/dashboard/learn',        label: 'Learn',         icon: GraduationCap,   group: 'tools' },
  { href: '/dashboard/ai',           label: 'Tax Advisory',  icon: Bot,             group: 'tools' },
  { href: '/dashboard/settings',     label: 'Settings',      icon: Settings,        group: 'tools' },
  { href: '/security',               label: 'Security',      icon: Shield,          group: 'compliance' },
]

const GROUP_LABELS: Record<string, string> = {
  core:       'CORE',
  reports:    'REPORTS',
  tools:      'TOOLS',
  compliance: 'COMPLIANCE',
}

function NavItem({ href, label, Icon, active, onClick }: {
  href: string; label: string; Icon: React.ElementType; active: boolean; onClick?: () => void
}) {
  return (
    <Link href={href} onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        padding: '8px 12px', borderRadius: '4px', textDecoration: 'none',
        fontSize: '0.82rem', fontWeight: active ? 500 : 400,
        letterSpacing: '-0.005em',
        color:      active ? C.white : C.muted,
        background: active ? C.active : 'transparent',
        borderLeft: `2px solid ${active ? C.white : 'transparent'}`,
        transition: 'all 0.1s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = C.white
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(244,245,248,0.03)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = C.muted
          ;(e.currentTarget as HTMLElement).style.background = 'transparent'
        }
      }}>
      <Icon size={14} strokeWidth={active ? 2 : 1.5} />
      {label}
    </Link>
  )
}

function Sidebar({ user, pathname, onSignOut, onNavClick, onClose }: {
  user: User | null; pathname: string; onSignOut: () => void; onNavClick?: () => void; onClose?: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Wordmark + close button */}
      <div style={{ padding: '1.25rem 1rem 1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Link href="/" onClick={onNavClick} style={{ textDecoration: 'none' }}>
          <div style={{ color: C.white, fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.03em' }}>
            System Auditor
          </div>
          <div style={{ color: C.muted, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '3px', fontFamily: 'var(--font-geist-mono), monospace' }}>
            2026/27 · UK Fiscal Engine
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            title="Collapse sidebar"
            style={{
              background: 'none', border: 'none', color: C.muted,
              cursor: 'pointer', padding: '2px', marginTop: '2px', flexShrink: 0,
              transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.white}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {Object.entries(
          NAV.reduce((acc, item) => {
            if (!acc[item.group]) acc[item.group] = []
            acc[item.group].push(item)
            return acc
          }, {} as Record<string, typeof NAV>)
        ).map(([group, items]) => (
          <div key={group} style={{ marginBottom: '0.25rem' }}>
            <div style={{ padding: '10px 12px 4px', color: 'rgba(244,245,248,0.22)', fontSize: '0.58rem', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono), monospace' }}>
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

      {/* Ask a question */}
      <div style={{ padding: '0.6rem 0.75rem', borderTop: `1px solid ${C.border}` }}>
        <Link href="/dashboard/ai" onClick={onNavClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            textDecoration: 'none',
            background: 'rgba(244,245,248,0.03)',
            border: `1px solid ${C.border}`,
            borderRadius: '4px', padding: '7px 10px',
            transition: 'all 0.1s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = 'rgba(244,245,248,0.18)'
            el.style.background = 'rgba(244,245,248,0.05)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = C.border
            el.style.background = 'rgba(244,245,248,0.03)'
          }}>
          <MessageCircle size={12} style={{ color: C.muted, flexShrink: 0 }} />
          <div>
            <div style={{ color: C.white, fontSize: '0.72rem', fontWeight: 500, letterSpacing: '-0.01em' }}>Ask a question</div>
            <div style={{ color: C.muted, fontSize: '0.6rem', marginTop: '1px' }}>Tax advisory · 2026/27</div>
          </div>
        </Link>
      </div>

      {/* User footer */}
      <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${C.border}` }}>
        {user ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '4px', flexShrink: 0,
                background: C.gray, border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.white, fontSize: '0.7rem', fontWeight: 600,
                fontFamily: 'var(--font-geist-mono), monospace',
              }}>
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: C.white, fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
                <div style={{ color: C.muted, fontSize: '0.6rem', fontFamily: 'var(--font-geist-mono), monospace' }}>authenticated</div>
              </div>
            </div>
            <button onClick={onSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', padding: '3px 0', transition: 'color 0.1s' }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = C.white}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = C.muted}>
              <LogOut size={12} /> Sign out
            </button>
          </>
        ) : (
          <div>
            <div style={{ color: C.muted, fontSize: '0.7rem', marginBottom: '7px', fontFamily: 'var(--font-geist-mono), monospace' }}>
              guest · all features active
            </div>
            <Link href="/auth/login" onClick={onNavClick}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.white, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 500 }}>
              <LogIn size={12} /> Sign in to sync
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

  const [user, setUser]             = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)

  // Close on every route change — catches back button, programmatic nav, everything
  useEffect(() => { setMobileOpen(false) }, [pathname])

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

  const close = () => setMobileOpen(false)
  const closeDesktop = () => setDesktopOpen(false)
  const sidebarProps = { user, pathname, onSignOut: handleSignOut }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

      {/* ── DESKTOP MENU BUTTON (always visible) ── */}
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

      {/* ── DESKTOP BACKDROP ── */}
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

      {/* ── DESKTOP SIDEBAR (overlay) ── */}
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

      {/* ── MOBILE TOP BAR ── */}
      <div
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '52px', zIndex: 40,
          background: C.bg, borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem',
        }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: C.white, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.03em' }}>System Auditor</span>
        </Link>
        <button onClick={() => setMobileOpen(o => !o)}
          style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: '4px' }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── MOBILE BACKDROP — always in DOM, opacity-only transition ── */}
      <div
        className="md:hidden"
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.7)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* ── MOBILE DRAWER — always in DOM, slide-in via transform ── */}
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
        <Sidebar {...sidebarProps} onNavClick={close} />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        className="mt-[52px] md:mt-0"
        style={{ flex: 1, minHeight: '100vh', background: C.bg, overflow: 'auto' }}>
        {children}
      </main>

    </div>
  )
}
