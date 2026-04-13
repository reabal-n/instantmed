import { Skeleton } from "@/components/ui/skeleton"

export default function CompleteAccountLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30 pt-32 pb-20">
      <div className="max-w-md mx-auto px-4">
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <span className="sr-only" role="status">Loading account setup</span>
          <div className="text-center space-y-2 mb-6">
            <Skeleton className="h-8 w-56 mx-auto" />
            <Skeleton className="h-4 w-72 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}
