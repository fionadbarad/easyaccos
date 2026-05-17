import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function MileageLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="28%" height={22} className="mb-2" />
      <Skeleton width="42%" height={13} className="mb-6" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-[var(--sa-surface)] border border-[var(--sa-border)] rounded-[6px] p-4">
            <Skeleton width="50%" height={11} className="mb-2" />
            <Skeleton width="70%" height={20} />
          </div>
        ))}
      </div>

      <Skeleton width={140} height={36} radius="rounded-[6px]" className="mb-5" />
      <SkeletonTable rows={5} cols={4} />
    </div>
  )
}
