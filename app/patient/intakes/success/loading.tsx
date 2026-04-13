import { Skeleton } from "@/components/ui/skeleton"

export default function SuccessLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading your request status</span>
      <div className="w-full max-w-lg mx-auto text-center space-y-6">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-7 w-48 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
        <div className="rounded-2xl border border-border p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  )
}
