import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Grid - 6 cards matching actual page */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intakes Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter row */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Skeleton className="h-10 flex-1 min-w-[200px] rounded-md" />
            <Skeleton className="h-10 w-[160px] rounded-md" />
            <Skeleton className="h-10 w-[180px] rounded-md" />
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            {/* Header row */}
            <div className="bg-muted/50 flex items-center gap-4 px-4 py-3 border-b">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14 ml-auto" />
            </div>
            {/* Data rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
                {/* Patient - avatar + name + subtitle */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                {/* Service */}
                <Skeleton className="h-4 w-24" />
                {/* Status badge */}
                <Skeleton className="h-6 w-20 rounded-full" />
                {/* Date */}
                <Skeleton className="h-4 w-16" />
                {/* Action button */}
                <Skeleton className="h-8 w-16 rounded-md ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
