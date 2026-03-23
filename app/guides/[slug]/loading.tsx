import { Skeleton } from "@/components/ui/skeleton"

export default function GuidePageLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading guide</span>

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48 mb-8" />

        {/* Title */}
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-5 w-2/3 mb-8" />

        {/* Meta line */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Guide steps */}
        <div className="space-y-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-4 w-full ml-11" />
              <Skeleton className="h-4 w-full ml-11" />
              <Skeleton className="h-4 w-3/4 ml-11" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 p-6 rounded-xl border text-center space-y-3">
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-12 w-40 rounded-lg mx-auto" />
        </div>
      </article>
    </div>
  )
}
