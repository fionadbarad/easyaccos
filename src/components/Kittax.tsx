'use client'

import { ReactNode } from 'react'

type KittaxProps = {
  title?: string
  message: string
  children?: ReactNode
}

const style = {
  wrapper: {
    background: 'linear-gradient(135deg, rgba(194,163,104,0.18), rgba(59,130,246,0.12))',
    border: '1px solid rgba(194,163,104,0.35)',
    borderRadius: '12px',
    padding: '1rem',
    color: 'var(--text)',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    marginBottom: '0.55rem',
  },
  bubble: {
    padding: '0.8rem 1rem',
    borderRadius: '12px',
    background: 'rgba(17,24,39,0.88)',
    border: '1px solid rgba(194,163,104,0.25)',
    color: 'var(--text)',
    fontSize: '0.93rem',
    lineHeight: 1.5,
  },
}

export default function Kittax({ title = 'Kittax AI', message, children }: KittaxProps) {
  return (
    <div style={style.wrapper}>
      <div style={style.header}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '999px', background: 'rgba(194,163,104,0.23)', color: 'var(--bg)', fontWeight: 700 }}>
          💡
        </span>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--gold)' }}>{title}</h2>
      </div>
      <div style={style.bubble}>{message}</div>
      {children}
    </div>
  )
}
