'use client'

/**
 * Lightweight skeleton primitives. Intentionally style-inline so they drop
 * into any surface without inheriting layout tokens.
 */

import React from 'react'

const SHIMMER_KEYFRAMES = `
@keyframes easyacco-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

let injected = false
function useShimmerStyles() {
  React.useEffect(() => {
    if (injected || typeof document === 'undefined') return
    const el = document.createElement('style')
    el.setAttribute('data-easyacco', 'shimmer')
    el.textContent = SHIMMER_KEYFRAMES
    document.head.appendChild(el)
    injected = true
  }, [])
}

type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: number | string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 14, radius = 4, style }: SkeletonProps) {
  useShimmerStyles()
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, rgba(244,245,248,0.04) 0%, rgba(244,245,248,0.10) 50%, rgba(244,245,248,0.04) 100%)',
        backgroundSize: '800px 100%',
        animation: 'easyacco-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function SkeletonRows({ count = 5, rowHeight = 34 }: { count?: number; rowHeight?: number }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={rowHeight} />
      ))}
    </div>
  )
}
