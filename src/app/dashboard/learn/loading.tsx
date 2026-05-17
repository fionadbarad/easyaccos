import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function LearnLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="28%" height={22} className="mb-2" />
      <Skeleton width="46%" height={13} className="mb-6" />

      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} lines={3} />
        ))}
      </div>
    </div>
  )
}
