import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function VerifyCertificateLoading() {
  return (
    <div className="max-w-xl mx-auto space-y-6 py-12" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Verifying certificate</span>

      {/* Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-12 w-12 rounded-full mx-auto" />
        <Skeleton className="h-7 w-48 mx-auto" />
        <Skeleton className="h-4 w-64 mx-auto" />
      </div>

      {/* Verification result card */}
      <Card>
        <CardContent className="py-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
