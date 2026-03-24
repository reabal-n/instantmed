import { Skeleton } from "@/components/ui/skeleton"

export default function IntentPageLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading page</span>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Title + subtitle */}
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-2/3 mb-4" />
        <Skeleton className="h-5 w-3/4 mb-8" />

        {/* CTA */}
        <Skeleton className="h-12 w-40 rounded-lg mb-12" />

        {/* Content sections */}
        <div className="space-y-8">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>

        {/* FAQ section */}
        <div className="mt-12 space-y-3">
          <Skeleton className="h-7 w-40 mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
