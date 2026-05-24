'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

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

type Status =
  | { connected: false }
  | { connected: true; scope: string; expiresAt: number; expiresInMs: number }

type MeOk = {
  ok: true
  refreshed: boolean
  scope: string
  expiresAt: number
  helloStatus: number
  helloBody: unknown
}
type MeFail = {
  ok: false
  stage: 'env' | 'auth' | 'hello'
  message: string
  status?: number
  body?: unknown
  needsReauth?: boolean
}
type MeResult = MeOk | MeFail

function formatExpiry(ms: number): string {
  if (ms <= 0) return 'expired'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  const s = totalSec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const monoFont = 'var(--font-geist-mono), monospace'

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        padding: '1rem',
        maxWidth: '820px',
        marginBottom: '1.25rem',
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div
        style={{
          color: C.muted,
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: '4px',
          fontFamily: monoFont,
        }}
      >
        {kicker}
      </div>
      <div style={{ color: C.white, fontSize: '0.95rem', fontWeight: 500 }}>{title}</div>
      {sub && (
        <div style={{ color: C.muted, fontSize: '0.78rem', marginTop: '4px', lineHeight: 1.55 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function Button({
  onClick,
  disabled,
  children,
  variant = 'default',
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: variant === 'danger' ? 'rgba(232,143,143,0.08)' : 'rgba(244,245,248,0.05)',
        color: variant === 'danger' ? C.fail : C.white,
        border: `1px solid ${variant === 'danger' ? 'rgba(232,143,143,0.25)' : C.border}`,
        padding: '0.5rem 0.95rem',
        borderRadius: '4px',
        fontSize: '0.76rem',
        fontFamily: 'inherit',
        cursor: disabled ? 'wait' : 'pointer',
        marginRight: '0.5rem',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  )
}

function ResultPane({ ok, label, body }: { ok: boolean; label: string; body: unknown }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        padding: '0.75rem',
        marginTop: '0.75rem',
      }}
    >
      <div
        style={{
          color: ok ? C.ok : C.fail,
          fontSize: '0.7rem',
          fontFamily: monoFont,
          marginBottom: '0.5rem',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>
      <pre
        style={{
          color: C.white,
          fontSize: '0.73rem',
          fontFamily: monoFont,
          overflow: 'auto',
          margin: 0,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.55,
        }}
      >
        {JSON.stringify(body, null, 2)}
      </pre>
    </div>
  )
}

function UserAuthSection() {
  const sp = useSearchParams()
  const callbackError = sp.get('hmrc_error')
  const callbackDetail = sp.get('detail')
  const justConnected = sp.get('hmrc_connected') === '1'

  const [status, setStatus] = useState<Status | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [meResult, setMeResult] = useState<MeResult | null>(null)
  const [meLoading, setMeLoading] = useState(false)
  const [disconnectLoading, setDisconnectLoading] = useState(false)

  const reloadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/hmrc/status', { cache: 'no-store' })
      const json = (await res.json()) as Status
      setStatus(json)
    } catch {
      setStatus({ connected: false })
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/hmrc/status', { cache: 'no-store' })
        const json = (await res.json()) as Status
        if (!cancelled) setStatus(json)
      } catch {
        if (!cancelled) setStatus({ connected: false })
      } finally {
        if (!cancelled) setStatusLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function connect() {
    window.location.href = '/api/hmrc/auth/start'
  }

  async function disconnect() {
    setDisconnectLoading(true)
    try {
      await fetch('/api/hmrc/auth/disconnect', { method: 'POST' })
      setMeResult(null)
      await reloadStatus()
    } finally {
      setDisconnectLoading(false)
    }
  }

  async function callMe() {
    setMeLoading(true)
    setMeResult(null)
    try {
      const res = await fetch('/api/hmrc/me', { cache: 'no-store' })
      const json = (await res.json()) as MeResult
      setMeResult(json)
      if (json.ok && json.refreshed) {
        void reloadStatus()
      }
    } catch (err) {
      setMeResult({
        ok: false,
        stage: 'hello',
        message: err instanceof Error ? err.message : 'Network error calling /api/hmrc/me',
      })
    } finally {
      setMeLoading(false)
    }
  }

  return (
    <Section>
      <SectionHeader
        kicker="phase 2 · user-delegated auth"
        title="OAuth2 authorization_code flow"
        sub="Real taxpayer logs in at HMRC's sandbox, grants easyacco scope, redirects back with a code, server swaps for access + refresh tokens. Tokens live in an AES-256-GCM encrypted HttpOnly cookie."
      />

      {callbackError && (
        <ResultPane
          ok={false}
          label={`[FAIL]  callback error: ${callbackError}`}
          body={{ error: callbackError, detail: callbackDetail }}
        />
      )}
      {justConnected && (
        <div
          style={{
            color: C.ok,
            fontSize: '0.72rem',
            fontFamily: monoFont,
            marginBottom: '0.75rem',
          }}
        >
          [OK]  Connected. Tokens stored in encrypted cookie.
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
        {status?.connected ? (
          <>
            <Button onClick={callMe} disabled={meLoading}>
              {meLoading ? 'Calling /hello/user…' : 'Call /hello/user'}
            </Button>
            <Button onClick={connect}>Reconnect</Button>
            <Button onClick={disconnect} disabled={disconnectLoading} variant="danger">
              {disconnectLoading ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        ) : (
          <Button onClick={connect} disabled={statusLoading}>
            Connect HMRC
          </Button>
        )}
      </div>

      <div style={{ color: C.muted, fontSize: '0.72rem', fontFamily: monoFont }}>
        {statusLoading && !status
          ? 'loading status…'
          : status?.connected
            ? `connected · scope=${status.scope || '(none)'} · access token expires in ${formatExpiry(status.expiresInMs)}`
            : 'not connected'}
      </div>

      {meResult && (
        <ResultPane
          ok={meResult.ok}
          label={
            meResult.ok
              ? `[OK]  /hello/user → ${meResult.helloStatus}${meResult.refreshed ? '  (refreshed token)' : ''}`
              : `[FAIL]  stage=${meResult.stage}`
          }
          body={meResult}
        />
      )}
    </Section>
  )
}

function AppAuthSection() {
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
    <Section>
      <SectionHeader
        kicker="phase 1 · application auth"
        title="OAuth2 client_credentials probe"
        sub={
          'Server-side round-trip against HMRC sandbox. Calls /oauth/token then /hello/application. Credentials stay on the server — never shipped to the browser.'
        }
      />
      <Button onClick={runProbe} disabled={loading}>
        {loading ? 'Calling sandbox…' : 'Run probe'}
      </Button>
      {result && (
        <ResultPane
          ok={result.ok}
          label={result.ok ? '[OK]  Round-trip succeeded' : `[FAIL]  stage=${result.stage}`}
          body={result}
        />
      )}
    </Section>
  )
}

export default function HmrcPage() {
  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)' }}>
      <div style={{ maxWidth: '820px', marginBottom: '1.5rem' }}>
        <div
          style={{
            color: C.muted,
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: '6px',
            fontFamily: monoFont,
          }}
        >
          hmrc · sandbox integration
        </div>
        <h1
          style={{
            color: C.white,
            fontSize: 'clamp(1.4rem,3vw,1.9rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
          }}
        >
          HMRC Sandbox
        </h1>
      </div>

      <Suspense fallback={null}>
        <UserAuthSection />
      </Suspense>
      <AppAuthSection />
    </div>
  )
}
