'use client'

import React from 'react'
import { monoFont, C } from './theme'

export function Section({ children }: { children: React.ReactNode }) {
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
        <div
          style={{ color: C.muted, fontSize: '0.68rem', marginTop: '3px', fontFamily: monoFont }}
        >
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
