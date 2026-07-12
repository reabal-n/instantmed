import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-true skeleton for the patient directory. Auto-prefetch from the staff
 * sidebar warms this boundary, so it doubles as the instant click feedback.
 * Mirrors the real layout: header with action, thin stat strip (single row —
 * not a card grid), search, then list rows.
 */
export default function AdminPatientsLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header: back link + title + description + add action */}
      <div className="shrink-0 px-6 pb-4 pt-5">
        <Skeleton className="h-3.5 w-24" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 px-6 pb-6">
        {/* Thin stat strip (single row, calm chrome) */}
        <div className="flex items-center gap-4 rounded-lg border border-border/50 px-4 py-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Search */}
        <Skeleton className="h-10 w-full rounded-md" />

        {/* Patient rows */}
        <div className="overflow-hidden rounded-xl border border-border/50">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-0"
            >
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="hidden h-4 w-28 sm:block" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
