import { Skeleton } from "@/components/ui/loader"

export default function DoctorIntakesLoading() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only" role="status">Loading intake details</span>

      {/* Header: back button + status badge */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Patient Information Card */}
      <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        {/* CardHeader */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Skeleton className="h-4 w-4 rounded" animated={false} />
          <Skeleton className="h-5 w-44" animated={false} />
        </div>
        {/* CardContent: grid-cols-2 md:grid-cols-4 — 6 info cells */}
        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" animated={false} />
              <Skeleton className="h-4 w-24" animated={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Request Info Card */}
      <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        {/* CardHeader */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Skeleton className="h-4 w-4 rounded" animated={false} />
          <Skeleton className="h-5 w-40" animated={false} />
        </div>
        {/* CardContent: timestamps row + clinical summary lines */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex gap-8">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" animated={false} />
              <Skeleton className="h-4 w-32" animated={false} />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" animated={false} />
              <Skeleton className="h-4 w-32" animated={false} />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" animated={false} />
            <Skeleton className="h-3 w-5/6" animated={false} />
            <Skeleton className="h-3 w-4/6" animated={false} />
          </div>
        </div>
      </div>

      {/* Clinical Notes Card */}
      <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        {/* CardHeader */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Skeleton className="h-4 w-4 rounded" animated={false} />
          <Skeleton className="h-5 w-32" animated={false} />
        </div>
        {/* CardContent: textarea */}
        <div className="px-4 py-3">
          <Skeleton className="h-28 w-full rounded-lg" animated={false} />
        </div>
      </div>

      {/* Action buttons Card */}
      <div className="rounded-xl border border-border/50 bg-card animate-pulse">
        <div className="px-4 py-3 flex items-center justify-end gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" animated={false} />
          <Skeleton className="h-10 w-28 rounded-lg" animated={false} />
        </div>
      </div>
    </div>
  )
}
