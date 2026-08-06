'use client'

// Small input primitives shared across the tax calculator. useDebounce lives
// here too — only the slider uses it today, but it's a utility.

import { useState, useEffect, useId, createContext, useContext } from 'react'
import { LABEL_CLASS, INPUT_CLASS } from './tokens'

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
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
        </label>
        {children}
        {hint && (
          // Described-by rather than a bare div: the hint carries real guidance
          // ("Gross, incl. 20% top-up"), which a screen-reader user needs at the
          // point of entry, not as unattached text somewhere after the input.
          <div id={hintId} className="mt-1">
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
      className={INPUT_CLASS}
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
      // A checkbox in behaviour, so it says so — otherwise the checked state is
      // conveyed by colour alone and never reaches assistive technology.
      role="checkbox"
      aria-checked={active}
      className={`flex items-center gap-2 px-[14px] py-2 rounded-[6px] cursor-pointer text-meta font-medium transition-all duration-150 min-h-[40px] w-full text-left border ${
        active
          ? 'bg-[rgba(74,222,128,0.08)] border-sa-green text-sa-green'
          : 'bg-transparent border-sa-border text-sa-muted'
      }`}
    >
      <span
        aria-hidden
        className={`w-4 h-4 rounded-[3px] shrink-0 flex items-center justify-center text-micro text-sa-black border-[1.5px] ${
          active ? 'bg-sa-green border-sa-green' : 'bg-transparent border-sa-muted'
        }`}
      >
        {active ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}
