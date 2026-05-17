import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="24%" height={22} className="mb-2" />
      <Skeleton width="38%" height={13} className="mb-6" />

      <div className="flex flex-col gap-5">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  )
}
