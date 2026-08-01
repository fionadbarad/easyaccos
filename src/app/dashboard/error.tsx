'use client'

import { useEffect } from 'react'
import { T } from '@/styles/type'
import { reportError } from '@/lib/monitor'

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
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '560px' }}>
      <div
        style={{
          color: '#FBBF24',
          fontSize: T.micro,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: '6px',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        error · safety net engaged
      </div>
      <h1
        style={{
          color: '#F4F5F8',
          fontSize: T.h3,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          margin: '0 0 0.6rem',
        }}
      >
        Something went wrong rendering this view.
      </h1>
      <p
        style={{
          color: 'rgba(244,245,248,0.5)',
          fontSize: T.meta,
          lineHeight: 1.5,
          marginBottom: '1.25rem',
        }}
      >
        Your data is safe — nothing was written. You can retry, or navigate away.
      </p>
      {error.message && (
        <pre
          style={{
            color: 'rgba(244,245,248,0.75)',
            fontSize: T.caption,
            fontFamily: 'var(--font-geist-mono), monospace',
            background: '#1C1D20',
            border: '1px solid rgba(244,245,248,0.07)',
            borderRadius: '4px',
            padding: '0.6rem 0.8rem',
            marginBottom: '0.6rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </pre>
      )}
      {error.digest && (
        <pre
          style={{
            color: 'rgba(244,245,248,0.3)',
            fontSize: T.micro,
            fontFamily: 'var(--font-geist-mono), monospace',
            background: '#1C1D20',
            border: '1px solid rgba(244,245,248,0.07)',
            borderRadius: '4px',
            padding: '0.6rem 0.8rem',
            marginBottom: '1.25rem',
          }}
        >
          digest: {error.digest}
        </pre>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={reset}
          style={{
            background: '#F4F5F8',
            color: '#181818',
            border: 'none',
            borderRadius: '4px',
            padding: '9px 16px',
            fontSize: T.meta,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '-0.01em',
          }}
        >
          Try again
        </button>
        <a
          href="mailto:support@easyacco.com?subject=Dashboard%20error"
          style={{
            background: 'transparent',
            color: 'rgba(244,245,248,0.7)',
            border: '1px solid rgba(244,245,248,0.15)',
            borderRadius: '4px',
            padding: '9px 16px',
            fontSize: T.meta,
            fontWeight: 500,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Contact support
        </a>
      </div>
    </div>
  )
}
