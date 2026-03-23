import { Skeleton } from "@/components/ui/skeleton"

export default function MedicationPageLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading medication information</span>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-52 mb-8" />

        {/* Title + badge */}
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-8" />

        {/* Quick info cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-xl border p-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
