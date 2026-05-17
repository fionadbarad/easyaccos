import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function ExpensesLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="30%" height={22} className="mb-2" />
      <Skeleton width="45%" height={13} className="mb-6" />

      {/* Action bar */}
      <div className="flex items-center gap-3 mb-5">
        <Skeleton width={120} height={36} radius="rounded-[6px]" />
        <Skeleton width={180} height={36} radius="rounded-[6px]" />
      </div>

      <SkeletonTable rows={8} cols={5} />
    </div>
  )
}
