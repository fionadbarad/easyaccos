'use client'

/**
 * Lightweight skeleton primitives.
 *
 * The shimmer lives in globals.css as `.ea-skeleton`. It used to be a `<style>`
 * element this module built and appended to <head> on first mount, which a
 * strict `style-src 'self'` blocks outright — the placeholders would have gone
 * flat the moment CSP tightened, and nothing would have failed a build.
 *
 * The size props stay inline: they are arbitrary caller-supplied numbers, and
 * Tailwind cannot generate a class for a value it never sees in the source.
 */

type SkeletonProps = {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}

export function Skeleton({ width = '100%', height = 14, radius, className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={`ea-skeleton ${className}`}
      style={{ width, height, ...(radius === undefined ? null : { borderRadius: radius }) }}
    />
  )
}

export function SkeletonRows({
  count = 5,
  rowHeight = 34,
}: {
  count?: number
  rowHeight?: number
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={rowHeight} />
      ))}
    </div>
  )
}
