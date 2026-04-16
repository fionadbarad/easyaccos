'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeftRight, RefreshCw } from 'lucide-react'

const C = { bg: '#181818', deep: '#222326', card: '#1C1D20', white: '#F4F5F8', text: '#F4F5F8', muted: 'rgba(244,245,248,0.42)', border: 'rgba(244,245,248,0.07)' }

const POPULAR = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','INR','SGD','HKD','NOK','SEK','DKK','NZD','ZAR','MXN','BRL','PLN','CZK','HUF']

const inputStyle = { background: C.deep, border: `1px solid ${C.border}`, borderRadius: '4px', padding: '9px 12px', color: C.text, fontSize: '0.9rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
const selectStyle = { ...inputStyle, appearance: 'none' as const, cursor: 'pointer' }

export default function CurrencyPage() {
  const [rates, setRates]       = useState<Record<string, number>>({})
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [amount, setAmount]     = useState('1000')
  const [from, setFrom]         = useState('GBP')
  const [to, setTo]             = useState('USD')

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/GBP')
      if (!res.ok) throw new Error('Rate fetch failed')
      const json = await res.json()
      setRates(json.rates as Record<string, number>)
      setLastUpdated(new Date())
    } catch {
      setError('Could not fetch live rates. Showing cached values where available.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
    const id = setInterval(fetchRates, 60_000)
    return () => clearInterval(id)
  }, [fetchRates])

  function getRate(fromCur: string, toCur: string): number | null {
    if (!rates[fromCur] || !rates[toCur]) return null
    // rates are relative to GBP base
    return rates[toCur] / rates[fromCur]
  }

  const rate = getRate(from, to)
  const converted = rate !== null ? (parseFloat(amount) || 0) * rate : null

  function swap() {
    setFrom(to)
    setTo(from)
  }

  const currencies = Object.keys(rates).length > 0 ? Object.keys(rates).sort() : POPULAR

  return (
    <div style={{ padding: 'clamp(1.5rem,4vw,2.5rem)', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: C.text, fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 700, marginBottom: '0.3rem' }}>
            Currency Converter
          </h1>
          <p style={{ color: C.muted, fontSize: '0.875rem' }}>Live exchange rates · 170+ currencies · Updates every 60s</p>
        </div>
        <button onClick={fetchRates} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,245,248,0.05)', border: `1px solid ${C.border}`, borderRadius: '4px', color: C.white, fontSize: '0.8rem', padding: '7px 14px', cursor: 'pointer' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '4px', padding: '10px 14px', color: '#F87171', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{error}</div>}

      {/* Converter */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end', gap: '1rem' }}>
          {/* From */}
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Amount</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>From</label>
              <select value={from} onChange={(e) => setFrom(e.target.value)} style={selectStyle}>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Swap */}
          <button onClick={swap}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(244,245,248,0.06)', border: `1px solid ${C.border}`, cursor: 'pointer', color: C.white, flexShrink: 0 }}>
            <ArrowLeftRight size={18} />
          </button>

          {/* To */}
          <div>
            <label style={{ display: 'block', color: C.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Converted</label>
            <div style={{ ...inputStyle, background: 'rgba(244,245,248,0.04)', color: C.white, fontWeight: 700, fontSize: '1.1rem' }}>
              {loading ? '…' : converted !== null ? converted.toLocaleString('en-GB', { maximumFractionDigits: 4 }) : '—'}
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ display: 'block', color: C.muted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>To</label>
              <select value={to} onChange={(e) => setTo(e.target.value)} style={selectStyle}>
                {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {rate !== null && (
          <p style={{ marginTop: '1.25rem', color: C.muted, fontSize: '0.8rem' }}>
            1 {from} = <strong style={{ color: C.text }}>{rate.toFixed(6)}</strong> {to}
            {lastUpdated && <span style={{ marginLeft: '1rem' }}>Updated {lastUpdated.toLocaleTimeString('en-GB')}</span>}
          </p>
        )}
      </div>

      {/* Popular pairs grid */}
      <h2 style={{ color: C.text, fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
        GBP Cross Rates
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '0.75rem' }}>
        {POPULAR.filter((c) => c !== 'GBP').map((cur) => {
          const r = rates[cur]
          return (
            <div key={cur} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '6px', padding: '0.9rem 1rem', cursor: 'pointer' }}
              onClick={() => { setFrom('GBP'); setTo(cur) }}>
              <div style={{ color: C.muted, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>GBP/{cur}</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: '1.1rem' }}>
                {r ? r.toFixed(4) : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
