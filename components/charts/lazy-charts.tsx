"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Lazy-loaded Recharts components
 * 
 * Reduces initial bundle size by code-splitting heavy chart library.
 * Only loads when charts are actually rendered.
 */

const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="w-full animate-pulse" style={{ height }}>
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
)

// Area Chart
export const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
)

// Bar Chart
export const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
)

// Line Chart
export const LazyLineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
)

// Pie Chart
export const LazyPieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { 
    loading: () => <ChartSkeleton height={200} />,
    ssr: false 
  }
)

// Composed Chart
export const LazyComposedChart = dynamic(
  () => import("recharts").then((mod) => mod.ComposedChart),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false 
  }
)

// Re-export common chart components (these are lightweight)
export {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  Line,
  Pie,
  Cell,
} from "recharts"

/**
 * Chart Container with Suspense-like loading
 */
export function ChartContainer({ 
  children, 
  height = 300,
  isLoading = false 
}: { 
  children: React.ReactNode
  height?: number
  isLoading?: boolean 
}) {
  if (isLoading) {
    return <ChartSkeleton height={height} />
  }

  return (
    <div className="w-full" style={{ height }}>
      {children}
    </div>
  )
}
