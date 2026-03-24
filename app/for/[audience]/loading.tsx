import { Skeleton } from "@/components/ui/skeleton"

export default function AudiencePageLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading page</span>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-40 mb-8" />

        {/* Hero */}
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-5 w-3/4 mb-8" />

        {/* CTA */}
        <Skeleton className="h-12 w-40 rounded-lg mb-12" />

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 space-y-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  )
}
