'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/monitor'

/**
 * Two alphas here have no token and are carried across as arbitrary values
 * rather than snapped: the 0.75 error text and the 0.7 support link both sit
 * between sa-muted (0.55) and sa-white, and rounding either would visibly
 * change this screen. Everything else was already a palette value written as a
 * literal, and now names the token it always was.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError('dashboard.errorBoundary', error, { digest: error.digest })
  }, [error])

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[560px]">
      <div className="text-sa-amber text-micro uppercase tracking-[0.12em] mb-1.5 font-mono">
        error · safety net engaged
      </div>
      <h1 className="text-sa-white text-h3 font-semibold tracking-[-0.02em] m-0 mb-[0.6rem]">
        Something went wrong rendering this view.
      </h1>
      {/* 0.5 → sa-muted (0.55): an undocumented one-off, and the palette notes
          0.55 is the value that clears WCAG AA for body-size text. */}
      <p className="text-sa-muted text-meta leading-normal mb-5">
        Your data is safe — nothing was written. You can retry, or navigate away.
      </p>
      {error.message && (
        <pre className="text-[rgba(244,245,248,0.75)] text-caption font-mono bg-sa-surface border border-sa-border rounded px-[0.8rem] py-[0.6rem] mb-[0.6rem] whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      )}
      {error.digest && (
        <pre className="text-sa-focus text-micro font-mono bg-sa-surface border border-sa-border rounded px-[0.8rem] py-[0.6rem] mb-5">
          digest: {error.digest}
        </pre>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={reset}
          className="bg-sa-white text-sa-black border-none rounded px-4 py-[9px] text-meta font-semibold cursor-pointer tracking-[-0.01em]"
        >
          Try again
        </button>
        <a
          href="mailto:support@easyacco.com?subject=Dashboard%20error"
          className="bg-transparent text-[rgba(244,245,248,0.7)] border border-sa-line rounded px-4 py-[9px] text-meta font-medium no-underline tracking-[-0.01em]"
        >
          Contact support
        </a>
      </div>
    </div>
  )
}
