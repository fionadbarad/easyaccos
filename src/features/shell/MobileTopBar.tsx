'use client'

import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { ICON } from '@/styles/type'

interface MobileTopBarProps {
  open: boolean
  onToggle: () => void
}

/**
 * Narrow-viewport header. Layout lives in classes rather than a style object:
 * an inline `display: flex` used to override the `md:hidden` class, so this bar
 * stayed on screen on desktop and collided with the sidebar toggle.
 */
export default function MobileTopBar({ open, onToggle }: MobileTopBarProps) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-[52px] flex items-center justify-between px-4 bg-sa-black border-b border-sa-border">
      <Link href="/" className="no-underline">
        <span className="text-sa-white text-body font-semibold tracking-[-0.03em]">
          System Auditor
        </span>
      </Link>
      <button
        onClick={onToggle}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        className="flex p-1 bg-transparent border-none text-sa-muted hover:text-sa-white cursor-pointer transition-colors"
      >
        {open ? <X size={ICON.lg} /> : <Menu size={ICON.lg} />}
      </button>
    </div>
  )
}
