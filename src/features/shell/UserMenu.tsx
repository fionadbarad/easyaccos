'use client'

import Link from 'next/link'
import { LogOut, LogIn } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { C } from '@/styles/palette'

interface UserMenuProps {
  user: User | null
  onSignOut: () => void
  onNavClick?: () => void
}

export default function UserMenu({ user, onSignOut, onNavClick }: UserMenuProps) {
  if (user) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', flexShrink: 0, background: C.gray, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-geist-mono), monospace' }}>
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
    )
  }

  return (
    <div>
      <div style={{ color: C.muted, fontSize: '0.7rem', marginBottom: '7px', fontFamily: 'var(--font-geist-mono), monospace' }}>
        guest · all features active
      </div>
      <Link href="/auth/login" onClick={onNavClick}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.white, textDecoration: 'none', fontSize: '0.78rem', fontWeight: 500 }}>
        <LogIn size={12} /> Sign in to sync
      </Link>
    </div>
  )
}
