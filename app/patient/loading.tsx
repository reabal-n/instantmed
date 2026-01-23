import { Skeleton, CardSkeleton, RequestListSkeleton } from "@/components/ui/loader"

export default function PatientLoading() {
  return (
    <div 
      className="min-h-screen bg-linear-to-b from-background to-muted/30"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading your dashboard</span>
      <div className="container max-w-5xl py-8 px-4 space-y-8">
        {/* Header skeleton with stagger animation */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Stats cards with stagger animation */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardSkeleton />
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="rounded-2xl border border-border p-6 space-y-4"
                style={{ animationDelay: `${400 + i * 100}ms` }}
              >
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent requests skeleton */}
        <div className="rounded-2xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <RequestListSkeleton count={3} />
        </div>
      </div>
    </div>
  )
}
