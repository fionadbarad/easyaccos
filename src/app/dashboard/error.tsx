'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error, reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[560px]">
      <div className="text-[#FBBF24] text-[0.62rem] uppercase tracking-[0.12em] mb-[6px] font-mono">
        error · safety net engaged
      </div>
      <h1 className="text-[var(--sa-white)] text-[clamp(1.2rem,2.4vw,1.5rem)] font-semibold tracking-[-0.02em] m-0 mb-[0.6rem]">
        Something went wrong rendering this view.
      </h1>
      <p className="text-[rgba(244,245,248,0.5)] text-[0.82rem] leading-[1.5] mb-[1.25rem]">
        Your data is safe — nothing was written. You can retry, or navigate away.
      </p>
      {error.message && (
        <pre className="text-[rgba(244,245,248,0.75)] text-[0.72rem] font-mono bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[4px] p-[0.6rem_0.8rem] mb-[0.6rem] whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      )}
      {error.digest && (
        <pre className="text-[rgba(244,245,248,0.3)] text-[0.68rem] font-mono bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[4px] p-[0.6rem_0.8rem] mb-[1.25rem]">
          digest: {error.digest}
        </pre>
      )}
      <div className="flex gap-[8px] flex-wrap">
        <button onClick={reset}
          className="bg-[var(--sa-white)] text-[var(--sa-black)] border-none rounded-[4px] p-[9px_16px] text-[0.82rem] font-semibold cursor-pointer tracking-[-0.01em]">
          Try again
        </button>
        <a href="mailto:support@easyacco.com?subject=Dashboard%20error"
          className="bg-transparent text-[rgba(244,245,248,0.7)] border border-[rgba(244,245,248,0.15)] rounded-[4px] p-[9px_16px] text-[0.82rem] font-medium no-underline tracking-[-0.01em]">
          Contact support
        </a>
      </div>
    </div>
  )
}
