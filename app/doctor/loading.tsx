import { Skeleton } from "@/components/ui/skeleton"

export default function DoctorLoading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading doctor dashboard</span>

      {/* Page header */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      {/* Queue card */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        {/* Card header */}
        <div className="p-4 pb-3 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3.5 w-52" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
          {/* Tab pills */}
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Queue rows */}
        <div className="divide-y divide-border/30">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3"
              style={{ animationDelay: `${100 + i * 50}ms` }}
            >
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
