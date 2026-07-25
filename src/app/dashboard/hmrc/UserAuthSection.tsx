'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Section, SectionHeader, Button, ResultPane } from './HmrcComponents'
import { monoFont, C } from './theme'
import { T } from '@/styles/type'

type Status =
  { connected: false } | { connected: true; scope: string; expiresAt: number; expiresInMs: number }

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

export function UserAuthSection() {
  const sp = useSearchParams()
  const callbackError = sp.get('hmrc_error')
  const callbackDetail = sp.get('detail')
  const justConnected = sp.get('hmrc_connected') === '1'

  const [status, setStatus] = useState<Status | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [meResult, setMeResult] = useState<MeResult | null>(null)
  const [meLoading, setMeLoading] = useState(false)
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [manageUrl, setManageUrl] = useState<string | null>(null)

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
      const res = await fetch('/api/hmrc/auth/disconnect', { method: 'POST' })
      // Clearing our token cookie stops US calling HMRC, but it does not
      // withdraw the authorisation at HMRC's end — only their Manage
      // authorised applications service does that. Surface the link so the
      // user isn't left believing the grant is gone. (SEC-10)
      const json = (await res.json()) as { manageAuthorityUrl?: string }
      setManageUrl(json.manageAuthorityUrl ?? null)
      setMeResult(null)
      await reloadStatus()
    } catch {
      setManageUrl(null)
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
            color: C.green,
            fontSize: T.caption,
            fontFamily: monoFont,
            marginBottom: '0.75rem',
          }}
        >
          [OK] Connected. Tokens stored in encrypted cookie.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.5rem',
        }}
      >
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

      <div style={{ color: C.muted, fontSize: T.caption, fontFamily: monoFont }}>
        {statusLoading && !status
          ? 'loading status…'
          : status?.connected
            ? `connected · scope=${status.scope || '(none)'} · access token expires in ${formatExpiry(status.expiresInMs)}`
            : 'not connected'}
      </div>

      {manageUrl && !status?.connected && (
        <div
          style={{
            color: C.muted,
            fontSize: '0.72rem',
            marginTop: '0.5rem',
            lineHeight: 1.5,
          }}
        >
          Disconnected here — easyacco can no longer call HMRC for you. HMRC still holds the
          authorisation you granted until you withdraw it on their side:{' '}
          <a
            href={manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.white, textDecoration: 'underline' }}
          >
            Manage authorised applications
          </a>
          .
        </div>
      )}

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
