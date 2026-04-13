import { Skeleton } from "@/components/ui/skeleton"

export default function HealthSummaryLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-80 mt-1" />
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>

      {/* Stats Grid - 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-9 w-12 mt-1" />
                <Skeleton className="h-3 w-28 mt-1" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex gap-1 bg-muted/50 p-1 rounded-lg">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>

        {/* Tab content - recent requests list */}
        <div className="rounded-xl border border-border/50 bg-card shadow-md shadow-primary/[0.06]">
          <div className="p-6 pb-2">
            <Skeleton className="h-5 w-36 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-6 pt-2 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 pt-8 border-t">
        <Skeleton className="h-6 w-28 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
