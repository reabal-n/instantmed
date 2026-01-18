import { Skeleton } from "@/components/ui/skeleton"

export default function RepeatPrescriptionLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="container py-16 text-center">
        <Skeleton className="h-6 w-32 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-12 w-80 mx-auto mb-4" />
        <Skeleton className="h-6 w-72 mx-auto mb-8" />
        <Skeleton className="h-12 w-40 mx-auto rounded-full" />
      </div>

      {/* How it works */}
      <div className="container pb-16">
        <Skeleton className="h-8 w-48 mx-auto mb-8" />
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 text-center">
              <Skeleton className="h-12 w-12 rounded-xl mx-auto mb-4" />
              <Skeleton className="h-5 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA section */}
      <div className="container pb-16 text-center">
        <Skeleton className="h-10 w-64 mx-auto mb-4" />
        <Skeleton className="h-5 w-80 mx-auto mb-6" />
        <Skeleton className="h-12 w-36 mx-auto rounded-full" />
      </div>
    </div>
  )
}
