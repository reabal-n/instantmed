/**
 * Dynamically Loaded Components
 * 
 * Heavy components that should be loaded on-demand to improve initial page load.
 * Uses Next.js dynamic imports with loading states.
 */

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/unified-skeleton'

// Loading skeleton for dashboard
const DashboardLoadingSkeleton = () => (
  <div className="container py-8 space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
)

// Doctor Dashboard (loads heavy dependencies)
export const DynamicDoctorDashboard = dynamic(
  () => import('@/app/doctor/dashboard/dashboard-client').then((mod) => ({ default: mod.DoctorDashboardClient })),
  {
    loading: () => <DashboardLoadingSkeleton />,
    ssr: false,
  }
)
