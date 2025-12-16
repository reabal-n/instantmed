import { Skeleton } from "@/components/ui/skeleton"

export default function MedCertLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="container py-16 text-center">
        <Skeleton className="h-6 w-32 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-12 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-80 mx-auto mb-8" />
        <Skeleton className="h-12 w-40 mx-auto rounded-full" />
      </div>

      {/* Options grid */}
      <div className="container pb-16">
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-6">
              <Skeleton className="h-12 w-12 rounded-xl mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
