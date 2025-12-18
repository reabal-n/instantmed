import { Skeleton } from "@/components/ui/skeleton"
import { Loader } from "@/components/ui/loader"

export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Loader */}
      <div className="flex justify-center pt-8">
        <Loader size="md" />
      </div>
      {/* Hero */}
      <div className="container py-24 text-center">
        <Skeleton className="h-6 w-32 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-14 w-96 mx-auto mb-6" />
        <Skeleton className="h-6 w-[500px] mx-auto" />
      </div>

      {/* Stats */}
      <div className="container pb-16">
        <div className="grid gap-6 md:grid-cols-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-12 w-20 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="container pb-16">
        <Skeleton className="h-8 w-32 mx-auto mb-8" />
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 text-center">
              <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
