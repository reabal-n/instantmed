import { Skeleton } from "@/components/ui/skeleton"

export default function RepeatRxLoading() {
  return (
    <div aria-busy="true">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <div className="rounded-xl border border-border/50 bg-card p-3 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
