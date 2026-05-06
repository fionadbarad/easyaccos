'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Search, X } from 'lucide-react'

export type DateRange =
  | { kind: 'all' }
  | { kind: 'month'; ym: string } // "2026-04"
  | { kind: 'custom'; from: string; to: string }

export type FilterState = {
  range: DateRange
  categories: string[]     // empty = all
  query: string
}

export function emptyFilter(): FilterState {
  return { range: { kind: 'all' }, categories: [], query: '' }
}

/** Inclusive date-range test against an ISO "YYYY-MM-DD" string. */
export function matchesRange(dateStr: string, range: DateRange): boolean {
  if (range.kind === 'all') return true
  if (range.kind === 'month') return dateStr.startsWith(range.ym)
  return dateStr >= range.from && dateStr <= range.to
}

export function matchesCategories(cat: string, selected: string[]): boolean {
  return selected.length === 0 || selected.includes(cat)
}

export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

const INPUT_S = 'bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] px-[10px] py-[7px] text-[var(--sa-white)] text-[0.8rem] outline-none font-mono'
const LABEL_S = 'text-[rgba(244,245,248,0.18)] text-[0.58rem] uppercase tracking-[0.08em] font-semibold mb-[4px] font-mono'

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
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      onChange({ ...value, range: { kind: 'month', ym } })
    } else {
      const iso = new Date().toISOString().slice(0, 10)
      onChange({ ...value, range: { kind: 'custom', from: iso, to: iso } })
    }
  }

  function toggleCategory(c: string) {
    const has = selected.includes(c)
    onChange({
      ...value,
      categories: has ? selected.filter(x => x !== c) : [...selected, c],
    })
  }

  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-[0.85rem_1rem] flex gap-[0.85rem] flex-wrap items-end mb-[1rem]">
      {/* Date range kind */}
      <div className="min-w-[130px]">
        <div className={LABEL_S}>Period</div>
        <select
          value={range.kind}
          onChange={e => setRangeKind(e.target.value as DateRange['kind'])}
          className={`${INPUT_S} cursor-pointer`}
        >
          <option value="all">All time</option>
          <option value="month">Month</option>
          <option value="custom">Custom range</option>
        </select>
      </div>

      {range.kind === 'month' && (
        <div className="min-w-[140px]">
          <div className={LABEL_S}>Month</div>
          <input
            type="month"
            value={range.ym}
            onChange={e => onChange({ ...value, range: { kind: 'month', ym: e.target.value } })}
            className={INPUT_S}
          />
        </div>
      )}

      {range.kind === 'custom' && (
        <>
          <div>
            <div className={LABEL_S}>From</div>
            <input
              type="date"
              value={range.from}
              onChange={e => onChange({ ...value, range: { ...range, from: e.target.value } })}
              className={INPUT_S}
            />
          </div>
          <div>
            <div className={LABEL_S}>To</div>
            <input
              type="date"
              value={range.to}
              onChange={e => onChange({ ...value, range: { ...range, to: e.target.value } })}
              className={INPUT_S}
            />
          </div>
        </>
      )}

      {/* Category multi-select */}
      <div ref={catRef} className="relative min-w-[180px]">
        <div className={LABEL_S}>Categories</div>
        <button
          type="button"
          onClick={() => setCatOpen(o => !o)}
          className={`${INPUT_S} cursor-pointer text-left flex items-center justify-between gap-[6px] w-full`}
        >
          <span className={`overflow-hidden text-ellipsis whitespace-nowrap ${selected.length ? 'text-[var(--sa-white)]' : 'text-[rgba(244,245,248,0.42)]'}`}>
            {selected.length === 0 ? 'All' : `${selected.length} selected`}
          </span>
          <ChevronDown size={12} className="text-[rgba(244,245,248,0.42)] shrink-0" />
        </button>
        {catOpen && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-20 bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] p-[6px] max-h-[260px] overflow-y-auto shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
            {categories.length === 0 && (
              <div className="text-[rgba(244,245,248,0.42)] text-[0.75rem] p-[6px]">No categories</div>
            )}
            {categories.map(c => {
              const on = selected.includes(c)
              return (
                <label key={c} className={`flex items-center gap-2 px-[8px] py-[5px] rounded-[3px] cursor-pointer text-[0.78rem] ${on ? 'bg-[rgba(244,245,248,0.05)] text-[var(--sa-white)]' : 'bg-transparent text-[rgba(244,245,248,0.42)]'}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleCategory(c)}
                    className="accent-[var(--sa-white)]"
                  />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{c}</span>
                </label>
              )
            })}
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...value, categories: [] })}
                className="mt-[4px] w-full bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded-[3px] px-[8px] py-[5px] text-[0.72rem] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text search */}
      <div className="flex-1 min-w-[180px]">
        <div className={LABEL_S}>Search</div>
        <div className="relative">
          <Search size={12} className="absolute top-1/2 left-[10px] -translate-y-1/2 text-[rgba(244,245,248,0.18)]" />
          <input
            type="text"
            value={query}
            onChange={e => onChange({ ...value, query: e.target.value })}
            placeholder="Description, reference…"
            className={`bg-[var(--sa-gray)] border border-[var(--sa-border)] rounded-[4px] py-[7px] pl-[28px] ${query ? 'pr-[28px]' : 'pr-[10px]'} text-[var(--sa-white)] text-[0.8rem] outline-none w-full`}
          />
          {query && (
            <button
              type="button"
              onClick={() => onChange({ ...value, query: '' })}
              aria-label="Clear search"
              className="absolute right-[6px] top-1/2 -translate-y-1/2 bg-transparent border-none text-[rgba(244,245,248,0.42)] cursor-pointer p-[2px] flex"
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
          className="bg-transparent text-[rgba(244,245,248,0.42)] border border-[var(--sa-border)] rounded-[4px] px-[12px] py-[7px] text-[0.75rem] cursor-pointer inline-flex items-center gap-[5px]"
        >
          <Calendar size={11} /> Reset
        </button>
      )}
    </div>
  )
}
