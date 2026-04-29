"use client"

import dynamic from "next/dynamic"
import type { ComponentProps } from "react"
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts"

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
  Area,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type ResponsiveContainerProps = ComponentProps<typeof RechartsResponsiveContainer>

/**
 * Recharts initializes percentage-based containers at -1/-1 before the
 * ResizeObserver reports a real card size. The dashboards render charts inside
 * dynamic grids and tabs, so provide a positive initial size to avoid noisy
 * zero-size warnings while still allowing the chart to resize normally.
 */
export function ResponsiveContainer({
  debounce = 50,
  initialDimension,
  minWidth = 0,
  minHeight = 0,
  ...props
}: ResponsiveContainerProps) {
  const fallbackHeight = typeof props.height === "number" ? props.height : 300

  return (
    <RechartsResponsiveContainer
      debounce={debounce}
      initialDimension={initialDimension ?? { width: 320, height: fallbackHeight }}
      minHeight={minHeight}
      minWidth={minWidth}
      {...props}
    />
  )
}

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
