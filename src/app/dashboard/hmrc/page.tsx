'use client'

import { useState } from 'react'

const C = {
  white:  '#F4F5F8',
  muted:  'rgba(244,245,248,0.42)',
  border: 'rgba(244,245,248,0.07)',
  panel:  'rgba(244,245,248,0.04)',
  ok:     '#7dd3a1',
  fail:   '#e88f8f',
}

type ProbeSuccess = {
  ok: true
  tokenStatus: number
  scope: string
  expiresIn: number
  helloStatus: number
  helloBody: unknown
}

type ProbeFailure = {
  ok: false
  stage: 'env' | 'token' | 'hello'
  message?: string
  status?: number
  body?: unknown
}

type ProbeResult = ProbeSuccess | ProbeFailure

export default function HmrcPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProbeResult | null>(null)

  async function runProbe() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/hmrc/hello', { cache: 'no-store' })
      const json = (await res.json()) as ProbeResult
      setResult(json)
    } catch (err) {
      setResult({
        ok: false,
        stage: 'env',
        message: err instanceof Error ? err.message : 'Network error calling /api/hmrc/hello',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: '820px', marginBottom: '1.75rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '6px',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          hmrc · sandbox connectivity
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: 'clamp(1.4rem,3vw,1.9rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            marginBottom: '0.4rem',
          }}
        >
          HMRC Sandbox Probe
        </h1>
        <p style={{ color: C.muted, fontSize: '0.84rem', lineHeight: 1.65, maxWidth: '560px' }}>
          Server-side OAuth2{' '}
          <strong style={{ color: C.white, fontWeight: 500 }}>client_credentials</strong> probe
          against HMRC&apos;s sandbox. Calls{' '}
          <code style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.78rem' }}>
            /oauth/token
          </code>{' '}
          then{' '}
          <code style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.78rem' }}>
            /hello/application
          </code>
          . Credentials stay on the server &mdash; never shipped to the browser.
        </p>
      </div>

      <button
        onClick={runProbe}
        disabled={loading}
        style={{
          background: 'rgba(244,245,248,0.05)',
          color: C.white,
          border: `1px solid ${C.border}`,
          padding: '0.6rem 1.1rem',
          borderRadius: '4px',
          fontSize: '0.78rem',
          fontFamily: 'inherit',
          cursor: loading ? 'wait' : 'pointer',
          marginBottom: '1.5rem',
        }}
      >
        {loading ? 'Calling sandbox…' : 'Run probe'}
      </button>

      {result && (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: '4px',
            padding: '1rem',
            maxWidth: '820px',
          }}
        >
          <div
            style={{
              color: result.ok ? C.ok : C.fail,
              fontSize: '0.72rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              marginBottom: '0.6rem',
              letterSpacing: '0.08em',
            }}
          >
            {result.ok ? '[OK]  Round-trip succeeded' : `[FAIL]  stage=${result.stage}`}
          </div>
          <pre
            style={{
              color: C.white,
              fontSize: '0.75rem',
              fontFamily: 'var(--font-geist-mono), monospace',
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              lineHeight: 1.55,
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
