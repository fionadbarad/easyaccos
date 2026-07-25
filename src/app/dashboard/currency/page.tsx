'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'
import { T } from '@/styles/type'

const POPULAR: string[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'INR',
  'SGD',
  'HKD',
  'NOK',
  'SEK',
  'DKK',
  'NZD',
  'ZAR',
  'MXN',
  'BRL',
  'PLN',
  'CZK',
  'HUF',
]

const CACHE_KEY = 'ea_fx_rates'
const CACHE_TTL_MS = 5 * 60 * 1000 // serve cached rates for up to 5 minutes
const FETCH_TIMEOUT = 8_000 // abort stalled requests after 8 s

interface RateCache {
  rates: Record<string, number>
  fetchedAt: number
}

function loadCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RateCache
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function saveCache(rates: Record<string, number>) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates, fetchedAt: Date.now() } satisfies RateCache),
    )
  } catch {
    // localStorage may be unavailable (e.g. private browsing with strict settings) — skip silently
  }
}

const inputStyle: React.CSSProperties = {
  background: 'var(--sa-gray)',
  border: '1px solid var(--sa-border)',
  borderRadius: '4px',
  padding: '9px 12px',
  color: 'var(--sa-white)',
  fontSize: T.body,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function CurrencyPage() {
  const initialCache = loadCache()

  const [rates, setRates] = useState<Record<string, number>>(initialCache?.rates ?? {})
  const [loading, setLoading] = useState(!initialCache)
  const [error, setError] = useState('')
  const [isStale, setIsStale] = useState(!!initialCache)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialCache ? new Date(initialCache.fetchedAt) : null,
  )

  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('GBP')
  const [to, setTo] = useState('USD')

  const abortRef = useRef<AbortController | null>(null)

  const fetchRates = useCallback(async () => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    setLoading(true)
    setError('')

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GBP', {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Rate service returned HTTP ${res.status}`)

      const json = await res.json()
      const freshRates = json.rates as Record<string, number>

      setRates(freshRates)
      setIsStale(false)
      setLastUpdated(new Date())
      saveCache(freshRates)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Request timed out. Showing last known rates.')
      } else {
        setError('Could not reach the rate service. Showing cached rates.')
      }
      // Fall back to cache on any failure so the converter stays usable.
      const cached = loadCache()
      if (cached) {
        setRates(cached.rates)
        setLastUpdated(new Date(cached.fetchedAt))
        setIsStale(true)
      }
    } finally {
      clearTimeout(timeout)
      setLoading(false)
    }
  }, [setError, setIsStale, setLastUpdated, setLoading, setRates])

  // On mount: refresh in the background.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fetchRates()
    })
    return () => cancelAnimationFrame(id)
  }, [fetchRates])

  // Polling: skip fetches while the tab is hidden to conserve API quota.
  useEffect(() => {
    const tickIfVisible = () => {
      if (document.visibilityState === 'visible') fetchRates()
    }

    const id = setInterval(tickIfVisible, 60_000)
    document.addEventListener('visibilitychange', tickIfVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tickIfVisible)
      abortRef.current?.abort()
    }
  }, [fetchRates])

  function getRate(fromCur: string, toCur: string): number | null {
    if (!rates[fromCur] || !rates[toCur]) return null
    return rates[toCur] / rates[fromCur] // both rates are relative to GBP base
  }

  function swap() {
    setFrom(to)
    setTo(from)
  }

  const rate = getRate(from, to)
  const converted = rate !== null ? (parseFloat(amount) || 0) * rate : null
  const currencies = Object.keys(rates).length > 0 ? Object.keys(rates).sort() : POPULAR

  return (
    <div className="page-shell">
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              color: 'var(--sa-white)',
              fontSize: T.h2,
              fontWeight: 700,
              marginBottom: '0.3rem',
            }}
          >
            Currency Converter
          </h1>
          <p style={{ color: 'var(--sa-muted)', fontSize: T.body }}>
            Live exchange rates · 170+ currencies · Updates every 60s
            {isStale && (
              <span style={{ marginLeft: '0.5rem', color: 'rgba(253,186,116,0.85)' }}>
                (cached)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          aria-label="Refresh exchange rates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(244,245,248,0.05)',
            border: '1px solid var(--sa-border)',
            borderRadius: '4px',
            color: 'var(--sa-white)',
            fontSize: T.meta,
            padding: '7px 14px',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '4px',
            padding: '10px 14px',
            color: '#F87171',
            fontSize: T.body,
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {/* ── Converter ── */}
      <div
        style={{
          background: 'var(--sa-surface)',
          border: '1px solid var(--sa-border)',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'end',
            gap: '1rem',
          }}
        >
          {/* From */}
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--sa-muted)',
                fontSize: T.caption,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.4rem',
              }}
            >
              Amount
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              aria-label="Amount to convert"
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--sa-muted)',
                  fontSize: T.caption,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.4rem',
                }}
              >
                From
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap */}
          <button
            onClick={swap}
            aria-label="Swap currencies"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(244,245,248,0.06)',
              border: '1px solid var(--sa-border)',
              cursor: 'pointer',
              color: 'var(--sa-white)',
              flexShrink: 0,
            }}
          >
            <ArrowLeftRight size={16} />
          </button>

          {/* To */}
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--sa-muted)',
                fontSize: T.caption,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.4rem',
              }}
            >
              Converted
            </label>
            <div
              aria-live="polite"
              aria-label="Converted amount"
              style={{
                ...inputStyle,
                background: 'rgba(244,245,248,0.04)',
                fontWeight: 700,
                fontSize: T.title,
              }}
            >
              {loading && Object.keys(rates).length === 0
                ? '…'
                : converted !== null
                  ? converted.toLocaleString('en-GB', { maximumFractionDigits: 4 })
                  : '—'}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label
                style={{
                  display: 'block',
                  color: 'var(--sa-muted)',
                  fontSize: T.caption,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.4rem',
                }}
              >
                To
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {rate !== null && (
          <p style={{ marginTop: '1.25rem', color: 'var(--sa-muted)', fontSize: T.meta }}>
            1 {from} = <strong style={{ color: 'var(--sa-white)' }}>{rate.toFixed(6)}</strong> {to}
            {lastUpdated && (
              <span style={{ marginLeft: '1rem' }}>
                {isStale ? 'Cached' : 'Updated'} {lastUpdated.toLocaleTimeString('en-GB')}
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── GBP cross-rate tiles ── */}
      <h2
        style={{
          color: 'var(--sa-white)',
          fontSize: T.title,
          fontWeight: 700,
          marginBottom: '1rem',
        }}
      >
        GBP Cross Rates
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))',
          gap: '0.75rem',
        }}
      >
        {POPULAR.filter((c) => c !== 'GBP').map((cur) => {
          const r = rates[cur]
          return (
            <button
              key={cur}
              onClick={() => {
                setFrom('GBP')
                setTo(cur)
              }}
              aria-label={`Set converter to GBP/${cur}`}
              style={{
                background: 'var(--sa-surface)',
                border: '1px solid var(--sa-border)',
                borderRadius: '6px',
                padding: '0.9rem 1rem',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  color: 'var(--sa-muted)',
                  fontSize: T.caption,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                GBP/{cur}
              </div>
              <div style={{ color: 'var(--sa-white)', fontWeight: 700, fontSize: T.title }}>
                {r ? r.toFixed(4) : '—'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
