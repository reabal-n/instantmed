import { CardSkeleton, RequestListSkeleton,Skeleton } from "@/components/ui/loader"

export default function PatientLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading your dashboard</span>

      {/* Welcome header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* ProfileTodoCard skeleton */}
      <div className="rounded-2xl border border-border p-5 animate-pulse">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" animated={false} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" animated={false} />
            <Skeleton className="h-3 w-64" animated={false} />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" animated={false} />
        </div>
      </div>

      {/* 3 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ animationDelay: `${i * 100}ms` }}>
            <CardSkeleton />
          </div>
        ))}
      </div>

      {/* Recent requests section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <RequestListSkeleton count={3} />
      </div>

      {/* Active prescriptions skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="rounded-2xl border border-border p-5 space-y-1 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" animated={false} />
                <Skeleton className="h-3 w-24" animated={false} />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" animated={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Health tips skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border p-5 space-y-3 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Skeleton className="h-6 w-6 rounded" animated={false} />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" animated={false} />
                <Skeleton className="h-3 w-full" animated={false} />
                <Skeleton className="h-3 w-4/5" animated={false} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
