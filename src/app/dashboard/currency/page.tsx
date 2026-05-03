'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'

const POPULAR: string[] = [
  'USD','EUR','GBP','JPY','CAD','AUD','CHF','INR','SGD','HKD',
  'NOK','SEK','DKK','NZD','ZAR','MXN','BRL','PLN','CZK','HUF',
]

const CACHE_KEY      = 'ea_fx_rates'
const CACHE_TTL_MS   = 5 * 60 * 1000   // serve cached rates for up to 5 minutes
const FETCH_TIMEOUT  = 8_000            // abort stalled requests after 8 s

interface RateCache {
  rates:     Record<string, number>
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
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates, fetchedAt: Date.now() } satisfies RateCache))
  } catch {
    // localStorage may be unavailable (e.g. private browsing with strict settings) — skip silently
  }
}

const inputCls = 'bg-[#222326] border border-[rgba(244,245,248,0.07)] rounded-[4px] p-[9px_12px] text-[var(--sa-white)] text-[0.9rem] outline-none w-full'

export default function CurrencyPage() {
  const [rates,       setRates]       = useState<Record<string, number>>({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [isStale,     setIsStale]     = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [amount, setAmount] = useState('1000')
  const [from,   setFrom]   = useState('GBP')
  const [to,     setTo]     = useState('USD')

  const abortRef = useRef<AbortController | null>(null)

  const fetchRates = useCallback(async () => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current  = controller

    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    setLoading(true)
    setError('')

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GBP', {
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`Rate service returned HTTP ${res.status}`)

      const json        = await res.json()
      const freshRates  = json.rates as Record<string, number>

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
  }, [])

  // On mount: serve cached data instantly, then refresh in the background.
  useEffect(() => {
    const cached = loadCache()
    if (cached) {
      setRates(cached.rates)
      setLastUpdated(new Date(cached.fetchedAt))
      setIsStale(true)
      setLoading(false)
    }
    fetchRates()
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
    return rates[toCur] / rates[fromCur]   // both rates are relative to GBP base
  }

  function swap() {
    setFrom(to)
    setTo(from)
  }

  const rate       = getRate(from, to)
  const converted  = rate !== null ? (parseFloat(amount) || 0) * rate : null
  const currencies = Object.keys(rates).length > 0 ? Object.keys(rates).sort() : POPULAR

  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[800px]">

      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-[1rem] mb-[2rem]">
        <div>
          <h1 className="text-[var(--sa-white)] text-[clamp(1.5rem,3vw,2rem)] font-bold mb-[0.3rem]">
            Currency Converter
          </h1>
          <p className="text-[var(--sa-muted)] text-[0.875rem]">
            Live exchange rates · 170+ currencies · Updates every 60s
            {isStale && (
              <span className="ml-[0.5rem] text-[rgba(253,186,116,0.85)]">(cached)</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          aria-label="Refresh exchange rates"
          className={`flex items-center gap-[6px] bg-[rgba(244,245,248,0.05)] border border-[var(--sa-border)] rounded-[4px] text-[var(--sa-white)] text-[0.8rem] p-[7px_14px] ${loading ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] rounded-[4px] p-[10px_14px] text-[#F87171] text-[0.85rem] mb-[1.5rem]">
          {error}
        </div>
      )}

      {/* ── Converter ── */}
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[8px] p-[2rem] mb-[1.5rem]">
        <div className="grid items-end gap-[1rem]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>

          {/* From */}
          <div>
            <label className="block text-[var(--sa-muted)] text-[0.75rem] uppercase tracking-[0.08em] mb-[0.4rem]">
              Amount
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              aria-label="Amount to convert"
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
            />
            <div className="mt-[0.5rem]">
              <label className="block text-[var(--sa-muted)] text-[0.75rem] uppercase tracking-[0.08em] mb-[0.4rem]">
                From
              </label>
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Swap */}
          <button
            onClick={swap}
            aria-label="Swap currencies"
            className="flex items-center justify-center w-[40px] h-[40px] rounded-[50%] bg-[rgba(244,245,248,0.06)] border border-[var(--sa-border)] cursor-pointer text-[var(--sa-white)] shrink-0"
          >
            <ArrowLeftRight size={18} />
          </button>

          {/* To */}
          <div>
            <label className="block text-[var(--sa-muted)] text-[0.75rem] uppercase tracking-[0.08em] mb-[0.4rem]">
              Converted
            </label>
            <div
              aria-live="polite"
              aria-label="Converted amount"
              className={`${inputCls} bg-[rgba(244,245,248,0.04)] font-bold text-[1.1rem]`}
            >
              {loading && Object.keys(rates).length === 0
                ? '…'
                : converted !== null
                  ? converted.toLocaleString('en-GB', { maximumFractionDigits: 4 })
                  : '—'}
            </div>
            <div className="mt-[0.5rem]">
              <label className="block text-[var(--sa-muted)] text-[0.75rem] uppercase tracking-[0.08em] mb-[0.4rem]">
                To
              </label>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={`${inputCls} appearance-none cursor-pointer`}
              >
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {rate !== null && (
          <p className="mt-[1.25rem] text-[var(--sa-muted)] text-[0.8rem]">
            1 {from} = <strong className="text-[var(--sa-white)]">{rate.toFixed(6)}</strong> {to}
            {lastUpdated && (
              <span className="ml-[1rem]">
                {isStale ? 'Cached' : 'Updated'} {lastUpdated.toLocaleTimeString('en-GB')}
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── GBP cross-rate tiles ── */}
      <h2 className="text-[var(--sa-white)] text-[1.1rem] font-bold mb-[1rem]">
        GBP Cross Rates
      </h2>
      <div className="grid gap-[0.75rem]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))' }}>
        {POPULAR.filter((c) => c !== 'GBP').map((cur) => {
          const r = rates[cur]
          return (
            <button
              key={cur}
              onClick={() => { setFrom('GBP'); setTo(cur) }}
              aria-label={`Set converter to GBP/${cur}`}
              className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[0.9rem_1rem] cursor-pointer text-left text-inherit"
            >
              <div className="text-[var(--sa-muted)] text-[0.72rem] tracking-[0.08em] uppercase mb-[4px]">
                GBP/{cur}
              </div>
              <div className="text-[var(--sa-white)] font-bold text-[1.1rem]">
                {r ? r.toFixed(4) : '—'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
