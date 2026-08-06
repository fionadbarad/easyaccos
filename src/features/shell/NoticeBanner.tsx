'use client'

import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { ICON } from '@/styles/type'

type Variant = 'info' | 'urgent' | 'warning'

/**
 * Variant styling as complete, literal class strings.
 *
 * Written out in full rather than composed from fragments because Tailwind
 * scans source text: a class assembled at runtime is a class it never emits.
 * The exact rgba values are preserved from the inline styles these replaced —
 * they are the banner's own blue/red/amber wash, deliberately softer than the
 * `sa-*-tint` tokens used for in-page callouts.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  info: 'bg-[rgba(59,130,246,0.07)] border-b-[rgba(59,130,246,0.18)] text-[rgba(147,197,253,0.9)]',
  urgent: 'bg-[rgba(239,68,68,0.08)] border-b-[rgba(239,68,68,0.2)] text-[rgba(252,165,165,0.9)]',
  warning: 'bg-[rgba(234,179,8,0.08)] border-b-[rgba(234,179,8,0.2)] text-[rgba(234,179,8,0.9)]',
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
  return (
    <div
      // pl-14 on md+ keeps the text clear of the fixed sidebar toggle, which
      // floats over the top-left corner of the content column.
      className={`flex items-start gap-2.5 py-2.5 px-4 md:pl-14 text-body font-mono border-b ${VARIANT_CLASSES[variant]}`}
    >
      <Icon size={ICON.xs} className="shrink-0 mt-0.5" />
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          title={dismissLabel}
          aria-label={dismissLabel}
          className="flex items-center shrink-0 p-0 bg-transparent border-none text-inherit opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
        >
          <X size={ICON.xs} />
        </button>
      )}
    </div>
  )
}
