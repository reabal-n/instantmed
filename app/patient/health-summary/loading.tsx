import { Skeleton } from "@/components/ui/skeleton"

export default function HealthSummaryLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-44 mb-2" />
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}
