import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function TrackingLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading request tracking</span>

      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-56 mx-auto" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </div>

      {/* Status card */}
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="py-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-5 w-36 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Estimated time */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-20" />
        </CardContent>
      </Card>
    </div>
  )
}
