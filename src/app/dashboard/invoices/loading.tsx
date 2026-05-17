import { Skeleton, SkeletonTable } from '@/components/ui/Skeleton'

export default function InvoicesLoading() {
  return (
    <div className="dashboard-page">
      <Skeleton width="28%" height={22} className="mb-2" />
      <Skeleton width="40%" height={13} className="mb-6" />

      <div className="flex items-center gap-3 mb-5">
        <Skeleton width={130} height={36} radius="rounded-[6px]" />
        <Skeleton width={100} height={36} radius="rounded-[6px]" />
      </div>

      <SkeletonTable rows={6} cols={4} />
    </div>
  )
}
