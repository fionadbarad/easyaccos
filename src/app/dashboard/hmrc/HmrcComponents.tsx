'use client'

import React from 'react'
import { monoFont, C } from './theme'
import { T } from '@/styles/type'

export function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.hover,
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

export function SectionHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string
  title: string
  sub?: string
}) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div
        style={{
          color: C.muted,
          fontSize: T.micro,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: '4px',
          fontFamily: monoFont,
        }}
      >
        {kicker}
      </div>
      <div style={{ color: C.white, fontSize: T.lead, fontWeight: 500 }}>{title}</div>
      {sub && (
        <div style={{ color: C.muted, fontSize: T.caption, marginTop: '4px', lineHeight: 1.55 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function Button({
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
        color: variant === 'danger' ? C.red : C.white,
        border: `1px solid ${variant === 'danger' ? 'rgba(232,143,143,0.25)' : C.border}`,
        padding: '0.5rem 0.95rem',
        borderRadius: '4px',
        fontSize: T.caption,
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

export function ResultPane({ ok, label, body }: { ok: boolean; label: string; body: unknown }) {
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
          color: ok ? C.green : C.red,
          fontSize: T.micro,
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
          fontSize: T.caption,
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

export function Field({
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
          fontSize: T.micro,
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
        <div style={{ color: C.muted, fontSize: T.micro, marginTop: '3px', fontFamily: monoFont }}>
          {hint}
        </div>
      )}
    </label>
  )
}

export function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'date'
  readOnly?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      // `readOnly` rather than `disabled`: a derived field must still be
      // readable by a screen reader and copyable by the user — it is part of
      // the return they are declaring, not a switched-off control.
      readOnly={readOnly}
      aria-readonly={readOnly || undefined}
      style={{
        width: '100%',
        background: readOnly ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        padding: '0.45rem 0.6rem',
        color: readOnly ? C.muted : C.white,
        fontSize: T.caption,
        fontFamily: monoFont,
        boxSizing: 'border-box',
        cursor: readOnly ? 'not-allowed' : 'auto',
      }}
    />
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.55rem',
        marginBottom: '0.6rem',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: '3px', flexShrink: 0, cursor: 'pointer' }}
      />
      <span style={{ color: C.muted, fontSize: T.caption, lineHeight: 1.55 }}>{children}</span>
    </label>
  )
}

/**
 * The fraud-prevention headers we actually sent, as returned by the submission
 * route. Shown collapsed: HMRC requires all 13 for WEB_APP_VIA_SERVER, and
 * being able to read back what was transmitted is the difference between
 * "HMRC rejected it" and knowing which header was wrong.
 */
export function FraudHeaderList({ headers }: { headers: Record<string, string> }) {
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
