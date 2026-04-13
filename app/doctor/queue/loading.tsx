import { Skeleton } from "@/components/ui/skeleton"

export default function QueueLoading() {
  return (
    <div className="space-y-6">
      {/* Header + Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-56 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* Queue table rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-3 flex items-center gap-4">
            {/* Avatar + patient info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-28 mb-1.5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            {/* Service badge */}
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
            {/* Status badge */}
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
            {/* Wait time */}
            <Skeleton className="h-4 w-14 shrink-0" />
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
