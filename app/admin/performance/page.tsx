import { Suspense } from "react"
import { PerformanceMonitoringClient } from "./performance-client"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Performance Monitoring | Admin",
  description: "Monitor application performance metrics",
}

export default function PerformanceMonitoringPage() {
  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor Core Web Vitals and application performance
        </p>
      </div>
      
      <Suspense fallback={<PerformanceSkeleton />}>
        <PerformanceMonitoringClient />
      </Suspense>
    </div>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  )
}
