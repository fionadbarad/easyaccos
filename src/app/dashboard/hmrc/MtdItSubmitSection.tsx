'use client'

import React, { useState } from 'react'
import { Section, SectionHeader, Field, Input, Button, ResultPane } from './HmrcComponents'
import {
  HMRC_DEFAULT_PERIOD_START,
  HMRC_DEFAULT_PERIOD_END,
  HMRC_DEFAULT_TURNOVER,
  HMRC_DEFAULT_ADMIN_COSTS,
} from '@/lib/hmrc/constants'
import { monoFont, C } from './theme'
import { T } from '@/styles/type'

// NOTE: there is deliberately no getOrCreateUserId() here any more. The value
// for HMRC's Gov-Client-User-IDs is derived from the Supabase session on the
// server (src/lib/hmrc/identity.ts) and is not accepted from the client — a
// browser-generated UUID identified nobody, and letting the client set a
// fraud-prevention header defeats the point of it. (SEC-7)
//
// Gov-Client-Device-ID below is different: HMRC specifies it as a client-
// generated identifier stable per *device*, so localStorage is the right home.
function getOrCreateDeviceId(): string {
  const KEY = 'hmrc_device_id'
  try {
    let id = window.localStorage.getItem(KEY)
    if (!id) {
      id = window.crypto.randomUUID()
      window.localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return window.crypto.randomUUID()
  }
}

function browserTimezone(): string {
  const offsetMin = -new Date().getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const h = String(Math.floor(abs / 60)).padStart(2, '0')
  const m = String(abs % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

function collectBrowserFraudData() {
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
          fontSize: T.caption,
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
              fontSize: T.micro,
              fontFamily: monoFont,
              padding: '2px 0',
              wordBreak: 'break-all',
              lineHeight: 1.45,
            }}
          >
            <span style={{ color: C.green }}>{k}</span>: {headers[k]}
          </div>
        ))}
      </div>
    </details>
  )
}

export function MtdItSubmitSection() {
  const [nino, setNino] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [periodStart, setPeriodStart] = useState(HMRC_DEFAULT_PERIOD_START)
  const [periodEnd, setPeriodEnd] = useState(HMRC_DEFAULT_PERIOD_END)
  const [turnover, setTurnover] = useState(HMRC_DEFAULT_TURNOVER)
  const [adminCosts, setAdminCosts] = useState(HMRC_DEFAULT_ADMIN_COSTS)
  const [govScenario, setGovScenario] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
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

  const ok = typeof result === 'object' && result !== null && result.ok === true
  const status =
    typeof result === 'object' && result !== null ? (result.hmrcStatus ?? result.status) : undefined

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
