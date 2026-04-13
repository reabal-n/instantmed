import { Skeleton, SkeletonForm } from "@/components/ui/skeleton"

export default function FollowupLoading() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading check-in form</span>
      <div className="space-y-2 mb-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <SkeletonForm />
    </div>
  )
}
