import { Skeleton } from "@/components/ui/skeleton"

export default function PathologyLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="container py-16 text-center">
        <Skeleton className="h-6 w-36 mx-auto mb-4 rounded-full" />
        <Skeleton className="h-12 w-72 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto mb-8" />
      </div>

      {/* Test categories */}
      <div className="container pb-16">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
