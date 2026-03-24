import { Skeleton } from "@/components/ui/skeleton"

export default function SymptomPageLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading symptom information</span>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48 mb-8" />

        {/* Title */}
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-5 w-3/4 mb-8" />

        {/* CTA */}
        <Skeleton className="h-12 w-44 rounded-lg mb-12" />

        {/* Content sections */}
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>

        {/* Related conditions */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-32 rounded-lg mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
