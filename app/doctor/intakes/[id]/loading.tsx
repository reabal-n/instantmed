import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function IntakeDetailLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading intake details</span>

      {/* Header: Back button + status badge */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Actions card */}
      <Card>
        <CardContent className="px-4 py-4">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Patient Info card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Patient name + age row */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-36 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          {/* Info grid: Medicare, email, phone, dates, etc. */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1.5" />
                <Skeleton className="h-5 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Summary / Answers card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex justify-between items-start py-2 border-b border-border/30 last:border-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Previous Intakes card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Doctor Notes / Drafts card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="flex justify-end mt-3">
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
