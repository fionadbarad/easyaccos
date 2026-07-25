'use client'

import Link from 'next/link'
import { X, MessageCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
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
  const grouped = NAV.reduce(
    (acc, item) => {
      const list = acc[item.group] ?? []
      list.push(item)
      acc[item.group] = list
      return acc
    },
    {} as Record<string, NavEntry[]>,
  )

  return (
    <div className="flex flex-col h-full bg-sa-deep">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-sa-line flex items-start justify-between">
        <Link href="/" onClick={onNavClick} className="no-underline group">
          <div className="text-white text-lead font-semibold tracking-[-0.03em]">
            System Auditor
          </div>
          <div className="text-sa-muted text-micro uppercase tracking-[0.1em] mt-[3px] font-mono">
            2026/27 · UK Fiscal Engine
          </div>
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            title="Collapse sidebar"
            className="bg-transparent border-none text-sa-muted hover:text-white cursor-pointer p-0.5 mt-0.5 shrink-0 transition-colors duration-100"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 flex flex-col overflow-y-auto">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-1">
            <div className="px-3 pt-2.5 pb-1 text-sa-dim text-micro tracking-[0.1em] font-semibold uppercase font-mono">
              {GROUP_LABELS[group as NavEntry['group']] ?? group}
            </div>
            {items.map(({ href, label, icon: Icon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                active={
                  pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(href))
                }
                onClick={onNavClick}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* AI CTA */}
      <div className="px-3 py-2.5 border-t border-sa-line">
        <Link
          href="/dashboard/ai"
          onClick={onNavClick}
          className="flex items-center gap-2 no-underline bg-sa-tint border border-sa-border hover:border-sa-line hover:bg-sa-hover rounded-md p-2.5 transition-all duration-100"
        >
          <MessageCircle size={12} className="text-sa-muted shrink-0" />
          <div>
            <div className="text-white text-meta font-medium tracking-[-0.01em]">
              Ask a question
            </div>
            <div className="text-sa-muted text-micro mt-[1px]">Tax advisory · 2026/27</div>
          </div>
        </Link>
      </div>

      {/* Footer / User Menu */}
      <div className="px-4 py-3 border-t border-sa-line">
        <UserMenu user={user} onSignOut={onSignOut} onNavClick={onNavClick} />
      </div>
    </div>
  )
}
