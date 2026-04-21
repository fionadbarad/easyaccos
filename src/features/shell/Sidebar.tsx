'use client'

import Link from 'next/link'
import { X, MessageCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { C } from '@/styles/palette'
import { NAV, GROUP_LABELS, type NavEntry } from './nav-config'
import NavItem from './NavItem'
import UserMenu from './UserMenu'

interface SidebarProps {
  user: User | null
  pathname: string | null
  onSignOut: () => void
  onNavClick?: () => void
  onClose?: () => void
}

export default function Sidebar({ user, pathname, onSignOut, onNavClick, onClose }: SidebarProps) {
  const grouped = NAV.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, NavEntry[]>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          <button onClick={onClose} title="Collapse sidebar"
            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '2px', marginTop: '2px', flexShrink: 0, transition: 'color 0.1s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.white}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.muted}>
            <X size={14} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} style={{ marginBottom: '0.25rem' }}>
            <div style={{ padding: '10px 12px 4px', color: 'rgba(244,245,248,0.22)', fontSize: '0.58rem', letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-geist-mono), monospace' }}>
              {GROUP_LABELS[group as NavEntry['group']] ?? group}
            </div>
            {items.map(({ href, label, icon: Icon }) => (
              <NavItem key={href} href={href} label={label} Icon={Icon}
                active={pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(href))}
                onClick={onNavClick} />
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.6rem 0.75rem', borderTop: `1px solid ${C.border}` }}>
        <Link href="/dashboard/ai" onClick={onNavClick}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', background: 'rgba(244,245,248,0.03)', border: `1px solid ${C.border}`, borderRadius: '4px', padding: '7px 10px', transition: 'all 0.1s' }}
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

      <div style={{ padding: '0.75rem 1rem', borderTop: `1px solid ${C.border}` }}>
        <UserMenu user={user} onSignOut={onSignOut} onNavClick={onNavClick} />
      </div>
    </div>
  )
}
