'use client'

import Link from 'next/link'
import { C } from '@/styles/palette'

interface NavItemProps {
  href: string
  label: string
  Icon: React.ElementType
  active: boolean
  onClick?: () => void
}

export default function NavItem({ href, label, Icon, active, onClick }: NavItemProps) {
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
