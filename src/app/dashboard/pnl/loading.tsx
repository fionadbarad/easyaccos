import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function PnlLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="30%" height={22} className="mb-2" />
      <Skeleton width="48%" height={13} className="mb-6" />

      {/* Chart placeholder */}
      <div className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-5 mb-6">
        <Skeleton width="100%" height={200} radius="rounded" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  )
}
