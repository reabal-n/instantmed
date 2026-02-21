import { Skeleton } from "@/components/ui/skeleton"

export default function PatientsLoading() {
  return (
    <div className="container max-w-6xl py-8 px-4" aria-busy="true">
      <div className="mb-6">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-48 ml-4" />
              <Skeleton className="h-6 w-20 rounded-full ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
