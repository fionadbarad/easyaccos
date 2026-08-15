import React from 'react'

export const StatCard = ({
  label,
  value,
  // Stays an inline style rather than a class: callers pass a runtime colour
  // (a status green or red picked from data), which no static utility can
  // express. The default reads the same CSS variable text-sa-white compiles
  // to, so the token is still the single source.
  color = 'var(--color-sa-white)',
  sub,
}: {
  label: string
  value: string | number
  color?: string
  sub?: string
}) => (
  <div className="bg-sa-surface border border-sa-border rounded-md p-5">
    <div className="text-sa-muted text-caption uppercase tracking-[0.08em] mb-2">{label}</div>
    <div className="text-heading font-bold" style={{ color }}>
      {value}
    </div>
    {sub && <div className="text-caption text-sa-muted mt-1">{sub}</div>}
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
    className={`px-3 py-[5px] rounded-[3px] border text-caption font-mono ${
      active
        ? 'border-sa-white bg-sa-white text-sa-black'
        : 'border-sa-border bg-transparent text-sa-muted'
    }`}
  >
    {children}
  </div>
)

export const LoadingSpinner = () => (
  <div className="bg-sa-surface border border-sa-border rounded-md p-12 text-center text-sa-muted text-meta">
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
    {title && <h2 className="ui-card-title text-lead mb-4">{title}</h2>}
    {children}
  </div>
)
