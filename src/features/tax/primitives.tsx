'use client'

// Small input primitives shared across the tax calculator. useDebounce lives
// here too — only the slider uses it today, but it's a utility.

import { useState, useEffect, useId, createContext, useContext } from 'react'
import { C } from '@/styles/palette'
import { labelStyle, inp } from './tokens'
import { T } from '@/styles/type'

/**
 * Carries the id `Field` generated down to whichever control it wraps, so the
 * two are programmatically associated without every call site having to invent
 * and thread an id.
 *
 * `<label>` without `htmlFor` is a visual label only: assistive technology has
 * no way to connect it to the input, so the field is announced as an unlabelled
 * edit box (WCAG 2.2 AA — 1.3.1 Info and Relationships, 3.3.2 Labels or
 * Instructions). Fixing it here fixes every form built from these primitives.
 */
const FieldIdContext = createContext<string | undefined>(undefined)

/** The id a field control should adopt. Undefined when used outside a `Field`. */
export function useFieldId(): string | undefined {
  return useContext(FieldIdContext)
}

export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <FieldIdContext.Provider value={id}>
      <div>
        <label htmlFor={id} style={labelStyle}>
          {label}
        </label>
        {children}
        {hint && (
          // Described-by rather than a bare div: the hint carries real guidance
          // ("Gross, incl. 20% top-up"), which a screen-reader user needs at the
          // point of entry, not as unattached text somewhere after the input.
          <div id={hintId} style={{ marginTop: '4px' }}>
            {hint}
          </div>
        )}
      </div>
    </FieldIdContext.Provider>
  )
}

export function NumInput({
  value,
  onChange,
  min = 0,
  max = 9_999_999,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  // Adopts the id its enclosing Field generated, so the visible label is the
  // accessible name too.
  const id = useFieldId()
  return (
    <input
      id={id}
      type="number"
      min={min}
      max={max}
      step={100}
      value={value || ''}
      onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
      style={inp}
    />
  )
}

export function Toggle({
  label,
  active,
  onChange,
}: {
  label: string
  active: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '6px',
        cursor: 'pointer',
        background: active ? 'rgba(74,222,128,0.08)' : 'transparent',
        border: `1px solid ${active ? C.green : C.border}`,
        color: active ? C.green : C.muted,
        fontSize: T.meta,
        fontWeight: 500,
        transition: 'all 0.15s',
        minHeight: '40px',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '3px',
          flexShrink: 0,
          background: active ? C.green : 'transparent',
          border: `1.5px solid ${active ? C.green : C.muted}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: T.micro,
          color: '#181818',
        }}
      >
        {active ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}
