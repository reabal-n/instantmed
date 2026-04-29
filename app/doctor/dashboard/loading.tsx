import { Skeleton } from "@/components/ui/loader"

export default function DoctorLoading() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading doctor dashboard</span>

      {/* Page header skeleton */}
      <Skeleton className="h-8 w-36" />

      {/* IntakeMonitor skeleton - single surface with 4 separated stat cells */}
      <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        {/* CardHeader */}
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <Skeleton className="h-5 w-28" animated={false} />
          <Skeleton className="h-6 w-20 rounded-md" animated={false} />
        </div>
        {/* CardContent */}
        <div className="space-y-3 px-4 py-3">
          {/* 4-cell stat grid: grid-cols-2 sm:grid-cols-4 */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 bg-card px-3 py-3">
                <Skeleton className="h-3 w-14" animated={false} />
                <Skeleton className="h-7 w-10" animated={false} />
              </div>
            ))}
          </div>
          {/* Secondary metrics row (paid count, badges, approval rate) */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-16 rounded-full" animated={false} />
            ))}
          </div>
        </div>
      </div>

      {/* QueueClient skeleton - no tabs, just header + card list */}
      <div className="space-y-3">
        {/* Queue header: count text + search input + refresh button */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-60 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        </div>

        {/* Queue card rows (expandable cards with chevron) */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border/50 bg-card px-4 py-3.5 animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" animated={false} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" animated={false} />
                    <Skeleton className="h-5 w-16 rounded-full" animated={false} />
                  </div>
                  <Skeleton className="h-3 w-44" animated={false} />
                </div>
                <Skeleton className="h-3 w-12 shrink-0" animated={false} />
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" animated={false} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
