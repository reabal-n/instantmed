import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-true skeleton for the request ledger. The staff sidebar uses default
 * (auto) Link prefetch, which warms exactly this loading boundary — so the
 * skeleton IS the instant click feedback. It mirrors the real layout (header,
 * search row, quick-filter chips, flat table rows) instead of the generic
 * admin stats-grid fallback, so the swap to live content doesn't jump.
 */
export default function AdminIntakesLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: back link + title + description */}
      <div className="shrink-0 space-y-2 px-6 pb-4 pt-5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="min-h-0 flex-1 space-y-3 px-6 pb-6">
        {/* Search row + view controls */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        {/* Quick-filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>

        {/* Flat ledger table */}
        <div className="overflow-hidden rounded-xl border border-border/50">
          {/* Column header */}
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-4 py-2.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="ml-auto h-3.5 w-16" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 w-10" />
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0"
            >
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="hidden min-w-0 flex-1 space-y-1.5 sm:block">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
