'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { C } from '@/styles/palette'

interface MobileTopBarProps {
  open: boolean
  onToggle: () => void
}

export default function MobileTopBar({ open, onToggle }: MobileTopBarProps) {
  return (
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
      <button onClick={onToggle}
        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: '4px' }}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  )
}
