'use client'

import React from 'react'
import { SkeletonRows } from './Skeleton'

type Props = {
  loading: boolean
  error?: string | null
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Shared loading + error envelope. Prevents the flash-of-empty-state that
 * made pages feel like they lost data on refresh.
 */
export function AsyncBoundary({ loading, error, fallback, children }: Props) {
  if (loading) {
    return <div style={{ padding: '1rem 0' }}>{fallback ?? <SkeletonRows count={5} />}</div>
  }
  if (error) {
    return (
      <div
        role="alert"
        style={{
          padding: '12px 14px',
          borderRadius: 6,
          border: '1px solid rgba(248,113,113,0.3)',
          background: 'rgba(248,113,113,0.08)',
          color: '#F87171',
          fontSize: '0.88rem',
        }}
      >
        {error}
      </div>
    )
  }
  return <>{children}</>
}
