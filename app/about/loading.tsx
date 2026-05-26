import { Skeleton } from "@/components/ui/skeleton"

/**
 * About-page loading skeleton.
 *
 * Mirrors the live page shape (centered hero with pill, headline, supporting
 * paragraph, primary CTA) so the swap from skeleton -> rendered content
 * does not cause a visible layout shift on first paint. Older skeleton used
 * a stats grid and 3-up team grid that no longer exist on the page; the
 * mismatch caused the flash flagged in the 2026-05-25 video review.
 */
export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero: matches the live pt-16 sm:pt-24 spacing + max-w-2xl centered layout */}
      <section className="pt-16 sm:pt-24 pb-8 sm:pb-12 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <Skeleton className="h-7 w-36 mx-auto mb-6 rounded-full" />
          <Skeleton className="h-12 w-full max-w-md mx-auto mb-2" />
          <Skeleton className="h-12 w-5/6 max-w-sm mx-auto mb-4" />
          <Skeleton className="h-4 w-full max-w-lg mx-auto mb-2" />
          <Skeleton className="h-4 w-4/5 max-w-md mx-auto mb-7" />
          <Skeleton className="h-11 w-full sm:w-48 mx-auto rounded-md" />
        </div>
      </section>

      {/* Editorial story body: single column max-w-3xl */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-5 w-28 mb-4 rounded-full" />
          <Skeleton className="h-9 w-3/4 mb-3" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </section>
    </div>
  )
}
