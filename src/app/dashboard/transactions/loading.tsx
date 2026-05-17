import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function TransactionsLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="32%" height={22} className="mb-2" />
      <Skeleton width="50%" height={13} className="mb-6" />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton width={160} height={36} radius="rounded-[6px]" />
        <Skeleton width={120} height={36} radius="rounded-[6px]" />
        <Skeleton width={100} height={36} radius="rounded-[6px]" />
      </div>

      <SkeletonTable rows={10} cols={5} />
    </div>
  )
}
