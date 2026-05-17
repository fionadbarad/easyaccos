import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function TrackerLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="26%" height={22} className="mb-2" />
      <Skeleton width="44%" height={13} className="mb-6" />

      {/* Year selector */}
      <Skeleton width={180} height={36} radius="rounded-[6px]" className="mb-5" />

      {/* Tracker grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  )
}
