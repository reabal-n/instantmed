import { Skeleton } from "@/components/ui/skeleton"

export default function AdminSubLoading() {
  return (
    <div className="space-y-4">
      <div><Skeleton className="h-7 w-40 mb-1" /><Skeleton className="h-4 w-64" /></div>
      <div className="rounded-lg border p-4 space-y-3">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  )
}
