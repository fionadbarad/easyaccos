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
    return (
      <div className="py-4">
        {fallback ?? <SkeletonRows count={5} />}
      </div>
    )
  }
  if (error) {
    return (
      <div
        role="alert"
        className="px-[14px] py-3 rounded-md border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] text-[#F87171] text-[0.88rem]"
      >
        {error}
      </div>
    )
  }
  return <>{children}</>
}
