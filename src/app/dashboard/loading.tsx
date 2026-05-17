import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="dashboard-page">
      {/* Page header */}
      <Skeleton width="35%" height={22} className="mb-2" />
      <Skeleton width="50%" height={13} className="mb-8" />

      {/* Grid of nav cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-px border border-[var(--sa-border)] rounded-[6px] overflow-hidden bg-[var(--sa-border)]">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-start gap-3.5 p-5 bg-[var(--sa-surface)]">
            <Skeleton width={16} height={16} radius="rounded-sm" />
            <div className="flex-1">
              <Skeleton width="60%" height={14} className="mb-1" />
              <Skeleton width="85%" height={11} />
            </div>
          </div>
        ))}
      </div>

      {/* Stats section */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  )
}
