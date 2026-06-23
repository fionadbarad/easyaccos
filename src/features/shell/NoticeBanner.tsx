'use client'

import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type Variant = 'info' | 'urgent' | 'warning'

const COLORS: Record<Variant, { bg: string; border: string; text: string }> = {
  info:    { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.18)', text: 'rgba(147,197,253,0.9)' },
  urgent:  { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   text: 'rgba(252,165,165,0.9)' },
  warning: { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.2)',   text: 'rgba(234,179,8,0.9)'   },
}

export default function NoticeBanner({
  variant,
  icon: Icon,
  children,
  onDismiss,
  dismissLabel = 'Dismiss',
}: {
  variant: Variant
  icon: LucideIcon
  children: ReactNode
  onDismiss?: () => void
  dismissLabel?: string
}) {
  const c = COLORS[variant]

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 16px',
      background: c.bg,
      borderBottom: `1px solid ${c.border}`,
      color: c.text,
      fontSize: '0.85rem',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <Icon size={13} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          title={dismissLabel}
          aria-label={dismissLabel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', opacity: 0.6, padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center',
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}
