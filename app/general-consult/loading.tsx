import { Skeleton } from "@/components/ui/skeleton"

export default function GeneralConsultLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="container py-16 text-center">
        <Skeleton className="h-6 w-36 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-12 w-96 mx-auto mb-4" />
        <Skeleton className="h-6 w-80 mx-auto mb-8" />
        <Skeleton className="h-12 w-44 mx-auto rounded-full" />
      </div>

      {/* What we can help with */}
      <div className="container pb-16">
        <Skeleton className="h-8 w-56 mx-auto mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="container pb-16">
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 text-center">
              <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
              <Skeleton className="h-5 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
