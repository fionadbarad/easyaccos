'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Search, X } from 'lucide-react'

import { todayISO, currentMonthKey } from '@/lib/dates'
import { C } from '@/styles/palette'
import { T } from '@/styles/type'
import { emptyFilter } from './filter'
import type { DateRange, FilterState } from './filter'

// The filter logic lives in ./filter (a plain module, testable without React);
// re-exported here so existing importers keep working.
export { emptyFilter, matchesRange, matchesCategories, matchesQuery } from './filter'
export type { DateRange, FilterState } from './filter'

const inputS: React.CSSProperties = {
  background: C.gray,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '7px 10px',
  color: C.white,
  fontSize: T.meta,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-geist-mono), monospace',
}
const labelS: React.CSSProperties = {
  color: C.dim,
  fontSize: T.micro,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 600,
  marginBottom: 4,
  fontFamily: 'var(--font-geist-mono), monospace',
}

export function FilterBar({
  value,
  onChange,
  categories,
}: {
  value: FilterState
  onChange: (next: FilterState) => void
  categories: string[]
}) {
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const { range, categories: selected, query } = value

  function setRangeKind(kind: DateRange['kind']) {
    if (kind === 'all') onChange({ ...value, range: { kind: 'all' } })
    else if (kind === 'month') {
      onChange({ ...value, range: { kind: 'month', ym: currentMonthKey() } })
    } else {
      const iso = todayISO()
      onChange({ ...value, range: { kind: 'custom', from: iso, to: iso } })
    }
  }

  function toggleCategory(c: string) {
    const has = selected.includes(c)
    onChange({
      ...value,
      categories: has ? selected.filter((x) => x !== c) : [...selected, c],
    })
  }

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: '0.85rem 1rem',
        display: 'flex',
        gap: '0.85rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        marginBottom: '1rem',
      }}
    >
      {/* Date range kind */}
      <div style={{ minWidth: 130 }}>
        <div style={labelS}>Period</div>
        <select
          value={range.kind}
          onChange={(e) => setRangeKind(e.target.value as DateRange['kind'])}
          style={{ ...inputS, cursor: 'pointer' }}
        >
          <option value="all">All time</option>
          <option value="month">Month</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {range.kind === 'month' && (
        <div style={{ minWidth: 140 }}>
          <div style={labelS}>Month</div>
          <input
            type="month"
            value={range.ym}
            onChange={(e) => onChange({ ...value, range: { kind: 'month', ym: e.target.value } })}
            style={inputS}
          />
        </div>
      )}

      {range.kind === 'custom' && (
        <>
          <div>
            <div style={labelS}>From</div>
            <input
              type="date"
              value={range.from}
              onChange={(e) => onChange({ ...value, range: { ...range, from: e.target.value } })}
              style={inputS}
            />
          </div>
          <div>
            <div style={labelS}>To</div>
            <input
              type="date"
              value={range.to}
              onChange={(e) => onChange({ ...value, range: { ...range, to: e.target.value } })}
              style={inputS}
            />
          </div>
        </>
      )}

      {/* Category multi-select */}
      <div ref={catRef} style={{ position: 'relative', minWidth: 180 }}>
        <div style={labelS}>Categories</div>
        <button
          type="button"
          onClick={() => setCatOpen((o) => !o)}
          style={{
            ...inputS,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            width: '100%',
          }}
        >
          <span
            style={{
              color: selected.length ? C.white : C.muted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selected.length === 0 ? 'All' : `${selected.length} selected`}
          </span>
          <ChevronDown size={12} style={{ color: C.muted, flexShrink: 0 }} />
        </button>
        {catOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 20,
              background: C.gray,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              padding: 6,
              maxHeight: 260,
              overflowY: 'auto',
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
            }}
          >
            {categories.length === 0 && (
              <div style={{ color: C.muted, fontSize: T.caption, padding: 6 }}>No categories</div>
            )}
            {categories.map((c) => {
              const on = selected.includes(c)
              return (
                <label
                  key={c}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 8px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    background: on ? 'rgba(244,245,248,0.05)' : 'transparent',
                    color: on ? C.white : C.muted,
                    fontSize: T.caption,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleCategory(c)}
                    style={{ accentColor: C.white }}
                  />
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {c}
                  </span>
                </label>
              )
            })}
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...value, categories: [] })}
                style={{
                  marginTop: 4,
                  width: '100%',
                  background: 'transparent',
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  borderRadius: 3,
                  padding: '5px 8px',
                  fontSize: T.caption,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text search */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={labelS}>Search</div>
        <div style={{ position: 'relative' }}>
          <Search
            size={12}
            style={{
              position: 'absolute',
              top: '50%',
              left: 10,
              transform: 'translateY(-50%)',
              color: C.dim,
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onChange({ ...value, query: e.target.value })}
            placeholder="Description, reference…"
            style={{
              ...inputS,
              paddingLeft: 28,
              paddingRight: query ? 28 : 10,
              width: '100%',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => onChange({ ...value, query: '' })}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Reset */}
      {(range.kind !== 'all' || selected.length > 0 || query) && (
        <button
          type="button"
          onClick={() => onChange(emptyFilter())}
          style={{
            background: 'transparent',
            color: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            padding: '7px 12px',
            fontSize: T.caption,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Calendar size={12} /> Reset
        </button>
      )}
    </div>
  )
}
