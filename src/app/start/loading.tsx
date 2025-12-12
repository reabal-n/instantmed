import { Skeleton } from '@/components/ui/skeleton'

export default function LoadingStart() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <Skeleton className="h-2 w-full rounded-full mb-2" />
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl shadow-sm border p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-72" />
          </div>

          {/* Service cards */}
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>

          {/* Button */}
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  )
}
