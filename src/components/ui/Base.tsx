import React from 'react'
import { C } from '@/styles/palette'

export const StatCard = ({
  label,
  value,
  color = C.white,
  sub,
}: {
  label: string
  value: string | number
  color?: string
  sub?: string
}) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '6px',
      padding: '1.25rem',
    }}
  >
    <div
      style={{
        color: C.muted,
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '0.5rem',
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: '0.72rem', color: C.muted, marginTop: '4px' }}>{sub}</div>}
  </div>
)

export const Badge = ({
  children,
  active = false,
}: {
  children: React.ReactNode
  active?: boolean
}) => (
  <div
    style={{
      padding: '5px 12px',
      borderRadius: '3px',
      border: `1px solid ${active ? C.white : C.border}`,
      background: active ? C.white : 'transparent',
      color: active ? C.bg : C.muted,
      fontSize: '0.72rem',
      fontFamily: 'var(--font-geist-mono), monospace',
    }}
  >
    {children}
  </div>
)

export const LoadingSpinner = () => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '6px',
      padding: '3rem',
      textAlign: 'center',
      color: C.muted,
      fontSize: '0.84rem',
    }}
  >
    <div className="animate-pulse">Loading…</div>
  </div>
)

export const Card = ({
  children,
  title,
  style,
}: {
  children: React.ReactNode
  title?: string
  style?: React.CSSProperties
}) => (
  <div className="ui-card" style={{ ...style }}>
    {title && (
      <h2 className="ui-card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
        {title}
      </h2>
    )}
    {children}
  </div>
)
