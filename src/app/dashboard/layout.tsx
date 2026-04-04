'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard, Calculator, Receipt, ArrowLeftRight,
  GraduationCap, Bot, BarChart2, Settings, TrendingUp,
  LogOut, Menu, X
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/dashboard/tax', label: 'Tax Estimator', icon: <Calculator size={18} /> },
  { href: '/dashboard/expenses', label: 'Expenses', icon: <Receipt size={18} /> },
  { href: '/dashboard/transactions', label: 'Transactions', icon: <ArrowLeftRight size={18} /> },
  { href: '/dashboard/pnl', label: 'P&L Report', icon: <BarChart2 size={18} /> },
  { href: '/dashboard/currency', label: 'Currency', icon: <TrendingUp size={18} /> },
  { href: '/dashboard/learn', label: 'Learn', icon: <GraduationCap size={18} /> },
  { href: '/dashboard/ai', label: 'AI Assistant', icon: <Bot size={18} /> },
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings size={18} /> },
]

function NavItem({ item, active, onClick }: { item: typeof NAV[0]; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderRadius: '4px', textDecoration: 'none',
        fontSize: '0.875rem', fontWeight: active ? 600 : 400, transition: 'all 0.15s',
        color: active ? '#D4AF37' : '#8A9070',
        background: active ? 'rgba(212,175,55,0.1)' : 'transparent',
        borderLeft: active ? '2px solid #D4AF37' : '2px solid transparent',
      }}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(192,192,192,0.08)' }}>
        <span style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.3rem', fontWeight: 700 }}>EasyAcco</span>
      </div>
      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {NAV.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname === item.href}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>
      {/* User */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(192,192,192,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontSize: '0.75rem', fontWeight: 700 }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#C0C0C0', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              {user?.email ?? 'Loading…'}
            </div>
          </div>
        </div>
        <button onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8A9070', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 0' }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1E2218' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex"
        style={{ width: '240px', flexShrink: 0, background: '#292E1E', borderRight: '1px solid rgba(192,192,192,0.08)', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40 }}
      >
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#292E1E', borderBottom: '1px solid rgba(192,192,192,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', zIndex: 50 }}>
        <span style={{ fontFamily: 'var(--font-playfair)', color: '#C0C0C0', fontSize: '1.2rem', fontWeight: 700 }}>EasyAcco</span>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: '#C0C0C0', cursor: 'pointer', display: 'flex' }}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden"
          style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.aside
          initial={{ x: -240 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="md:hidden"
          style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '240px', background: '#292E1E', borderRight: '1px solid rgba(192,192,192,0.08)', zIndex: 50 }}
        >
          {sidebar}
        </motion.aside>
      )}

      {/* Main */}
      <main
        className="md:ml-[240px] mt-14 md:mt-0"
        style={{ flex: 1, minHeight: '100vh', background: '#1E2218', overflow: 'auto' }}
      >
        {children}
      </main>
    </div>
  )
}
