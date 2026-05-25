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

// ── Phase 3 helpers ─────────────────────────────────────────────────────────

type BrowserFraudData = {
  userAgent: string
  screens: Array<{ width: number; height: number; scalingFactor: number; colourDepth: number }>
  windowSize: { width: number; height: number }
  timezone: string
  deviceId: string
}

function browserTimezone(): string {
  // Spec format: UTC±hh:mm (e.g. "UTC+01:00"). getTimezoneOffset returns
  // minutes WEST of UTC, so we negate for the displayed offset.
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

function getOrCreateDeviceId(): string {
  const KEY = 'hmrc_device_id'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = window.crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

function getOrCreateUserId(): string {
  const KEY = 'hmrc_user_id'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = window.crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
  }
  return id
}

function collectBrowserFraudData(): BrowserFraudData {
  return {
    userAgent: window.navigator.userAgent,
    screens: [
      {
        width: window.screen.width,
        height: window.screen.height,
        scalingFactor: window.devicePixelRatio || 1,
        colourDepth: window.screen.colorDepth,
      },
    ],
    windowSize: { width: window.innerWidth, height: window.innerHeight },
    timezone: browserTimezone(),
    deviceId: getOrCreateDeviceId(),
  }
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'block', marginBottom: '0.6rem' }}>
      <div
        style={{
          color: C.muted,
          fontSize: '0.62rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: monoFont,
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ color: C.muted, fontSize: '0.68rem', marginTop: '3px', fontFamily: monoFont }}>
          {hint}
        </div>
      )}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'date'
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: 'rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        color: C.white,
        fontSize: '0.78rem',
        fontFamily: monoFont,
        boxSizing: 'border-box',
      }}
    />
  )
}

function FraudHeaderList({ headers }: { headers: Record<string, string> }) {
  const keys = Object.keys(headers).sort()
  return (
    <details
      style={{
        marginTop: '0.75rem',
        background: 'rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        padding: '0.6rem 0.75rem',
      }}
    >
      <summary
        style={{
          color: C.muted,
          fontSize: '0.72rem',
          fontFamily: monoFont,
          cursor: 'pointer',
          letterSpacing: '0.06em',
        }}
      >
        fraud prevention headers sent ({keys.length})
      </summary>
      <div style={{ marginTop: '0.5rem' }}>
        {keys.map((k) => (
          <div
            key={k}
            style={{
              color: C.white,
              fontSize: '0.7rem',
              fontFamily: monoFont,
              padding: '2px 0',
              wordBreak: 'break-all',
              lineHeight: 1.45,
            }}
          >
            <span style={{ color: C.ok }}>{k}</span>: {headers[k]}
          </div>
        ))}
      </div>
    </details>
  )
}

function MtdItSubmitSection() {
  // Sensible default sandbox period (most recent fully-elapsed UK quarter).
  const [nino, setNino] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [periodStart, setPeriodStart] = useState('2024-04-06')
  const [periodEnd, setPeriodEnd] = useState('2024-07-05')
  const [turnover, setTurnover] = useState('5000')
  const [adminCosts, setAdminCosts] = useState('250')
  const [govScenario, setGovScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [sentFraudHeaders, setSentFraudHeaders] = useState<Record<string, string> | null>(null)

  async function submit() {
    setLoading(true)
    setResult(null)
    setSentFraudHeaders(null)
    try {
      const browser = collectBrowserFraudData()
      const body = {
        nino: nino.trim().toUpperCase(),
        businessId: businessId.trim(),
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        income: { turnover: Number(turnover) || 0 },
        expenses: { adminCosts: Number(adminCosts) || 0 },
        browser,
        userId: getOrCreateUserId(),
        ...(govScenario ? { govTestScenario: govScenario } : {}),
      }
      const res = await fetch('/api/hmrc/mtd/it/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      const json = (await res.json()) as { fraudHeaders?: Record<string, string> }
      setResult(json)
      if (json.fraudHeaders) setSentFraudHeaders(json.fraudHeaders)
    } catch (err) {
      setResult({
        ok: false,
        stage: 'submit',
        message: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  const ok = typeof result === 'object' && result !== null && (result as { ok: boolean }).ok === true
  const status =
    typeof result === 'object' && result !== null
      ? (result as { hmrcStatus?: number; status?: number }).hmrcStatus ??
        (result as { status?: number }).status
      : undefined

  return (
    <Section>
      <SectionHeader
        kicker="phase 3a · mtd-it submission"
        title="POST self-employment periodic summary"
        sub="Submits a real quarterly MTD for Income Tax update for a sandbox test taxpayer. The request includes all 13 fraud prevention headers HMRC requires for WEB_APP_VIA_SERVER. Without them, HMRC rejects production submissions."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <Field label="nino" hint="sandbox test individual, e.g. AA999999A">
          <Input value={nino} onChange={setNino} placeholder="AA999999A" />
        </Field>
        <Field label="business id" hint="15 chars, e.g. XBIS12345678901">
          <Input value={businessId} onChange={setBusinessId} placeholder="XBIS12345678901" />
        </Field>
        <Field label="period start" hint="must align with HMRC obligation (e.g. 2024-04-06)">
          <Input value={periodStart} onChange={setPeriodStart} type="date" />
        </Field>
        <Field label="period end" hint="must align with HMRC obligation">
          <Input value={periodEnd} onChange={setPeriodEnd} type="date" />
        </Field>
        <Field label="turnover (£)" hint="income.turnover — required">
          <Input value={turnover} onChange={setTurnover} type="number" />
        </Field>
        <Field label="admin costs (£)" hint="periodExpenses.adminCosts — example expense">
          <Input value={adminCosts} onChange={setAdminCosts} type="number" />
        </Field>
        <Field
          label="gov-test-scenario (optional)"
          hint="e.g. STATEFUL, DUPLICATE_SUBMISSION, OVERLAPPING_PERIOD"
        >
          <Input value={govScenario} onChange={setGovScenario} placeholder="(blank = DEFAULT)" />
        </Field>
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <Button onClick={submit} disabled={loading || !nino || !businessId}>
          {loading ? 'Submitting to HMRC…' : 'Submit to HMRC'}
        </Button>
      </div>

      {result !== null && (
        <ResultPane
          ok={ok}
          label={ok ? `[OK]  HMRC accepted → ${status}` : `[FAIL]  HMRC → ${status ?? '???'}`}
          body={result}
        />
      )}
      {sentFraudHeaders && <FraudHeaderList headers={sentFraudHeaders} />}
    </Section>
  )
}

function MtdVatSubmitSection() {
  const [vrn, setVrn] = useState('')
  const [periodKey, setPeriodKey] = useState('A001')
  const [vatDueSales, setVatDueSales] = useState('100.00')
  const [vatDueAcquisitions, setVatDueAcquisitions] = useState('0.00')
  const [vatReclaimedCurrPeriod, setVatReclaimedCurrPeriod] = useState('25.00')
  const [totalValueSalesExVAT, setTotalValueSalesExVAT] = useState('500')
  const [totalValuePurchasesExVAT, setTotalValuePurchasesExVAT] = useState('125')
  const [totalValueGoodsSuppliedExVAT, setTotalValueGoodsSuppliedExVAT] = useState('0')
  const [totalAcquisitionsExVAT, setTotalAcquisitionsExVAT] = useState('0')
  const [finalised, setFinalised] = useState(true)
  const [govScenario, setGovScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<unknown>(null)
  const [sentFraudHeaders, setSentFraudHeaders] = useState<Record<string, string> | null>(null)

  // Derived (HMRC validates these arithmetic relationships server-side)
  const sales = Number(vatDueSales) || 0
  const acqs = Number(vatDueAcquisitions) || 0
  const reclaimed = Number(vatReclaimedCurrPeriod) || 0
  const totalVatDue = +(sales + acqs).toFixed(2)
  const netVatDue = +Math.abs(totalVatDue - reclaimed).toFixed(2)

  async function submit() {
    setLoading(true)
    setResult(null)
    setSentFraudHeaders(null)
    try {
      const browser = collectBrowserFraudData()
      const body = {
        vrn: vrn.trim(),
        periodKey: periodKey.trim(),
        vatDueSales: sales,
        vatDueAcquisitions: acqs,
        totalVatDue,
        vatReclaimedCurrPeriod: reclaimed,
        netVatDue,
        totalValueSalesExVAT: Number(totalValueSalesExVAT) || 0,
        totalValuePurchasesExVAT: Number(totalValuePurchasesExVAT) || 0,
        totalValueGoodsSuppliedExVAT: Number(totalValueGoodsSuppliedExVAT) || 0,
        totalAcquisitionsExVAT: Number(totalAcquisitionsExVAT) || 0,
        finalised,
        browser,
        userId: getOrCreateUserId(),
        ...(govScenario ? { govTestScenario: govScenario } : {}),
      }
      const res = await fetch('/api/hmrc/mtd/vat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      })
      const json = (await res.json()) as { fraudHeaders?: Record<string, string> }
      setResult(json)
      if (json.fraudHeaders) setSentFraudHeaders(json.fraudHeaders)
    } catch (err) {
      setResult({
        ok: false,
        stage: 'submit',
        message: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setLoading(false)
    }
  }

  const ok = typeof result === 'object' && result !== null && (result as { ok: boolean }).ok === true
  const status =
    typeof result === 'object' && result !== null
      ? (result as { hmrcStatus?: number; status?: number }).hmrcStatus ??
        (result as { status?: number }).status
      : undefined

  return (
    <Section>
      <SectionHeader
        kicker="phase 3b · mtd-vat submission"
        title="POST VAT return for period"
        sub="Submits a complete 9-box VAT return for a sandbox VAT-registered organisation. The same fraud prevention headers from Phase 3a are sent. totalVatDue and netVatDue are derived in the browser so HMRC's arithmetic validation passes."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
        <Field label="vrn" hint="9-digit VAT registration number">
          <Input value={vrn} onChange={setVrn} placeholder="123456789" />
        </Field>
        <Field label="period key" hint="4 chars, e.g. A001 — from /retrieve-obligations">
          <Input value={periodKey} onChange={setPeriodKey} placeholder="A001" />
        </Field>
        <Field label="vat due on sales (£)" hint="box 1">
          <Input value={vatDueSales} onChange={setVatDueSales} type="number" />
        </Field>
        <Field label="vat due on acquisitions (£)" hint="box 2">
          <Input value={vatDueAcquisitions} onChange={setVatDueAcquisitions} type="number" />
        </Field>
        <Field label="vat reclaimed (£)" hint="box 4">
          <Input
            value={vatReclaimedCurrPeriod}
            onChange={setVatReclaimedCurrPeriod}
            type="number"
          />
        </Field>
        <Field label="total sales ex VAT (£)" hint="box 6">
          <Input value={totalValueSalesExVAT} onChange={setTotalValueSalesExVAT} type="number" />
        </Field>
        <Field label="total purchases ex VAT (£)" hint="box 7">
          <Input
            value={totalValuePurchasesExVAT}
            onChange={setTotalValuePurchasesExVAT}
            type="number"
          />
        </Field>
        <Field label="total goods supplied ex VAT (£)" hint="box 8">
          <Input
            value={totalValueGoodsSuppliedExVAT}
            onChange={setTotalValueGoodsSuppliedExVAT}
            type="number"
          />
        </Field>
        <Field label="total acquisitions ex VAT (£)" hint="box 9">
          <Input value={totalAcquisitionsExVAT} onChange={setTotalAcquisitionsExVAT} type="number" />
        </Field>
        <Field
          label="gov-test-scenario (optional)"
          hint="e.g. DUPLICATE_SUBMISSION, INVALID_PERIODKEY"
        >
          <Input value={govScenario} onChange={setGovScenario} placeholder="(blank = DEFAULT)" />
        </Field>
      </div>

      <div
        style={{
          color: C.muted,
          fontSize: '0.7rem',
          fontFamily: monoFont,
          marginBottom: '0.6rem',
          lineHeight: 1.55,
        }}
      >
        derived → totalVatDue = sales + acquisitions = <span style={{ color: C.white }}>£{totalVatDue.toFixed(2)}</span>
        {' · '}
        netVatDue = |totalVatDue - reclaimed| = <span style={{ color: C.white }}>£{netVatDue.toFixed(2)}</span>
      </div>

      <label
        style={{
          color: C.white,
          fontSize: '0.74rem',
          fontFamily: monoFont,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          marginBottom: '0.6rem',
        }}
      >
        <input
          type="checkbox"
          checked={finalised}
          onChange={(e) => setFinalised(e.target.checked)}
        />
        finalised — I declare this VAT return as final
      </label>

      <div>
        <Button onClick={submit} disabled={loading || !vrn || !finalised}>
          {loading ? 'Submitting to HMRC…' : 'Submit VAT return'}
        </Button>
      </div>

      {result !== null && (
        <ResultPane
          ok={ok}
          label={ok ? `[OK]  HMRC accepted → ${status}` : `[FAIL]  HMRC → ${status ?? '???'}`}
          body={result}
        />
      )}
      {sentFraudHeaders && <FraudHeaderList headers={sentFraudHeaders} />}
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
      <MtdItSubmitSection />
      <MtdVatSubmitSection />
      <AppAuthSection />
    </div>
  )
}
