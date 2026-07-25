'use client'

import Link from 'next/link'
import { LogOut, LogIn } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface UserMenuProps {
  user: User | null
  onSignOut: () => void
  onNavClick?: () => void
}

export default function UserMenu({ user, onSignOut, onNavClick }: UserMenuProps) {
  if (user) {
    return (
      <>
        <div className="flex items-center gap-[9px] mb-2">
          <div className="w-7 h-7 rounded bg-sa-hover border border-sa-line shrink-0 flex items-center justify-center text-white text-caption font-semibold font-mono">
            {user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-white text-meta font-medium truncate">{user.email}</div>
            <div className="text-sa-muted text-micro font-mono">authenticated</div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 text-sa-muted hover:text-white bg-transparent border-none cursor-pointer text-meta py-0.5 transition-colors duration-100"
        >
          <LogOut size={12} /> Sign out
        </button>
      </>
    )
  }

  return (
    <div>
      <div className="text-sa-muted text-caption mb-[7px] font-mono">
        guest · all features active
      </div>
      <Link
        href="/auth/login"
        onClick={onNavClick}
        className="flex items-center gap-1.5 text-white no-underline text-body font-medium"
      >
        <LogIn size={12} /> Sign in to sync
      </Link>
    </div>
  )
}
