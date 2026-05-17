import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function CurrencyLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="34%" height={22} className="mb-2" />
      <Skeleton width="52%" height={13} className="mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton width="35%" height={11} className="mb-1.5" />
            <Skeleton width="100%" height={38} radius="rounded-[6px]" />
          </div>
        ))}
      </div>

      <SkeletonCard lines={4} />
    </div>
  )
}
