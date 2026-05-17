import { Skeleton } from '@/components/ui/Skeleton'

export default function AILoading() {
  return (
    <div className="dashboard-page flex flex-col h-[calc(100vh-52px)] md:h-screen">
      <Skeleton width="25%" height={22} className="mb-2" />
      <Skeleton width="55%" height={13} className="mb-6" />

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col gap-3 py-4">
          <div className="flex gap-3 max-w-[70%]">
            <Skeleton width={28} height={28} radius="rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton width="90%" height={14} />
              <Skeleton width="60%" height={14} />
            </div>
          </div>
          <div className="flex gap-3 max-w-[70%] self-end">
            <div className="flex-1 flex flex-col gap-1.5 items-end">
              <Skeleton width="80%" height={14} />
              <Skeleton width="45%" height={14} />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <Skeleton width="100%" height={44} radius="rounded-[6px]" />
      </div>
    </div>
  )
}
