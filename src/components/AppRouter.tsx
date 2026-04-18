'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const ROUTES = {
  HOME:         '/',
  DEMO:         '/demo',
  LOGIN:        '/auth/login',
  SIGNUP:       '/auth/signup',
  DASHBOARD:    '/dashboard',
  TAX:          '/dashboard/tax',
  EXPENSES:     '/dashboard/expenses',
  TRANSACTIONS: '/dashboard/transactions',
  PNL:          '/dashboard/pnl',
  CURRENCY:     '/dashboard/currency',
  LEARN:        '/dashboard/learn',
  AI:           '/dashboard/ai',
  SETTINGS:     '/dashboard/settings',
} as const

export const NAV_ITEMS: { label: string; href: string; icon: string }[] = [
  { label: 'Overview',      href: ROUTES.DASHBOARD,    icon: '🏠' },
  { label: 'Tax Estimator', href: ROUTES.TAX,          icon: '📊' },
  { label: 'Expenses',      href: ROUTES.EXPENSES,     icon: '🧾' },
  { label: 'Transactions',  href: ROUTES.TRANSACTIONS, icon: '💳' },
  { label: 'P&L Report',   href: ROUTES.PNL,          icon: '📈' },
  { label: 'Currency',      href: ROUTES.CURRENCY,     icon: '💱' },
  { label: 'Learn',         href: ROUTES.LEARN,        icon: '🎓' },
  { label: 'Tax Advisory',  href: ROUTES.AI,           icon: '🤖' },
  { label: 'Settings',      href: ROUTES.SETTINGS,     icon: '⚙️' },
]

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className = '' }: NavLinkProps) {
  const pathname = usePathname()
  const active = pathname === href || (href !== ROUTES.DASHBOARD && pathname?.startsWith(href))
  return (
    <Link href={href} className={`ea-sidebar-item ${active ? 'active' : ''} ${className}`}>
      {children}
    </Link>
  )
}

export function Sidebar() {
  return (
    <nav className="ea-sidebar">
      <div style={{ padding: '0 24px 24px', borderBottom: '1px solid var(--sa-border)', marginBottom: 12 }}>
        <span style={{ color: 'var(--sa-white)', fontFamily: 'var(--font-inter), sans-serif', fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>
          EasyAcco
        </span>
      </div>
      {NAV_ITEMS.map(item => (
        <NavLink key={item.href} href={item.href}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default { ROUTES, NAV_ITEMS, NavLink, Sidebar }
