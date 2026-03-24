import { Skeleton } from "@/components/ui/skeleton"

export default function BlogPostLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Loading article</span>

      <article className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Skeleton className="h-4 w-48 mb-8" />

        {/* Category + read time */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Title */}
        <Skeleton className="h-10 w-full mb-2" />
        <Skeleton className="h-10 w-3/4 mb-6" />

        {/* Author + date */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Hero image */}
        <Skeleton className="h-64 w-full rounded-xl mb-10" />

        {/* Article body */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />

          {/* Subheading */}
          <Skeleton className="h-7 w-64 mt-8 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />

          {/* Another subheading */}
          <Skeleton className="h-7 w-48 mt-8 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </article>
    </div>
  )
}
