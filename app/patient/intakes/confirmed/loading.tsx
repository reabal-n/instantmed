import { Skeleton } from "@/components/ui/skeleton"

export default function ConfirmedLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading confirmation</span>
      <div className="max-w-lg mx-auto text-center space-y-6">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-7 w-56 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
        <Skeleton className="h-12 w-48 rounded-xl mx-auto" />
      </div>
    </div>
  )
}
