import {
  LayoutDashboard, Calculator, Receipt,
  GraduationCap, Bot, Settings, TrendingUp,
  Shield, BookOpen, FileText,
  PiggyBank, Car, Send, Landmark,
} from 'lucide-react'

export const SIDEBAR_W = 232

export interface NavEntry {
  href: string
  label: string
  icon: React.ElementType
  group: 'core' | 'reports' | 'tools' | 'compliance'
}

export const NAV: NavEntry[] = [
  { href: '/dashboard',              label: 'Overview',      icon: LayoutDashboard, group: 'core' },
  { href: '/dashboard/tax',          label: 'Tax Engine',    icon: Calculator,      group: 'core' },
  { href: '/dashboard/tracker',      label: 'Tax Tracker',   icon: PiggyBank,       group: 'core' },
  { href: '/dashboard/expenses',     label: 'Expenses',      icon: Receipt,         group: 'core' },
  { href: '/dashboard/invoices',     label: 'Invoices',      icon: Send,            group: 'reports' },
  { href: '/dashboard/transactions', label: 'Ledger',        icon: BookOpen,        group: 'reports' },
  { href: '/dashboard/pnl',          label: 'Reports',       icon: FileText,        group: 'reports' },
  { href: '/dashboard/mileage',      label: 'Mileage',       icon: Car,             group: 'tools' },
  { href: '/dashboard/currency',     label: 'Currency',      icon: TrendingUp,      group: 'tools' },
  { href: '/dashboard/learn',        label: 'Learn',         icon: GraduationCap,   group: 'tools' },
  { href: '/dashboard/ai',           label: 'Tax Advisory',  icon: Bot,             group: 'tools' },
  { href: '/dashboard/settings',     label: 'Settings',      icon: Settings,        group: 'tools' },
  { href: '/dashboard/hmrc',         label: 'HMRC Sandbox',  icon: Landmark,        group: 'compliance' },
  { href: '/security',               label: 'Security',      icon: Shield,          group: 'compliance' },
]

export const GROUP_LABELS: Record<NavEntry['group'], string> = {
  core:       'CORE',
  reports:    'REPORTS',
  tools:      'TOOLS',
  compliance: 'COMPLIANCE',
}
