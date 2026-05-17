import { Skeleton, SkeletonRows } from './Skeleton'

/**
 * Route-level streaming fallback. Mirrors the shared dashboard page chrome
 * (header band → summary tiles → table) so the Suspense boundary swaps in
 * without a layout shift. Pure Tailwind — no palette import needed.
 */
export default function RouteLoading() {
  return (
    <div className="p-[clamp(1.5rem,4vw,2.5rem)] max-w-[960px]">
      {/* Header */}
      <div className="mb-6">
        <Skeleton width={70} height={9} />
        <div className="mt-2.5">
          <Skeleton width={260} height={26} />
        </div>
        <div className="mt-2">
          <Skeleton width={180} height={11} />
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-px border border-[var(--sa-border)] rounded-[6px] overflow-hidden bg-[var(--sa-border)] mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-[var(--sa-surface)] py-3.5 px-4">
            <Skeleton width={56} height={9} />
            <div className="mt-2">
              <Skeleton width={90} height={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Table area */}
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-4">
        <SkeletonRows count={6} />
      </div>
    </div>
  )
}
