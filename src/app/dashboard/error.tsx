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
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '560px' }}>
      <div style={{ color: '#FBBF24', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px', fontFamily: 'var(--font-geist-mono), monospace' }}>
        error · safety net engaged
      </div>
      <h1 style={{ color: '#F4F5F8', fontSize: 'clamp(1.2rem,2.4vw,1.5rem)', fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 0.6rem' }}>
        Something went wrong rendering this view.
      </h1>
      <p style={{ color: 'rgba(244,245,248,0.5)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
        Your data is safe — nothing was written. You can retry, or navigate away.
      </p>
      {error.digest && (
        <pre style={{ color: 'rgba(244,245,248,0.3)', fontSize: '0.68rem', fontFamily: 'var(--font-geist-mono), monospace', background: '#1C1D20', border: '1px solid rgba(244,245,248,0.07)', borderRadius: '4px', padding: '0.6rem 0.8rem', marginBottom: '1.25rem' }}>
          digest: {error.digest}
        </pre>
      )}
      <button onClick={reset}
        style={{ background: '#F4F5F8', color: '#181818', border: 'none', borderRadius: '4px', padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}>
        Try again
      </button>
    </div>
  )
}
