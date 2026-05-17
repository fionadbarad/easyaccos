/**
 * Skeleton shimmer primitives — pure Tailwind, zero DOM injection.
 * Uses the `shimmer` keyframes defined in globals.css.
 */

type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: string
  className?: string
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 'rounded',
  className = '',
}: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-shimmer bg-[length:800px_100%] bg-[linear-gradient(90deg,rgba(244,245,248,0.04)_0%,rgba(244,245,248,0.10)_50%,rgba(244,245,248,0.04)_100%)] ${radius} ${className}`}
      style={{ width, height }}
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

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-5">
      <Skeleton width="40%" height={14} className="mb-3" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 pb-3 mb-3 border-b border-[var(--sa-border)]">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} height={12} width={`${100 / cols - 2}%`} />
        ))}
      </div>
      {/* Rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }, (_, j) => (
              <Skeleton key={j} height={16} width={`${100 / cols - 2}%`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
