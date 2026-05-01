import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: "sm" | "md" | "lg"
  className?: string
}

const columnClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}

const gapClasses = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
}

/**
 * DashboardGrid
 *
 * Plain responsive grid for KPI rows + card grids. Animation removed in
 * Phase 1 because the legacy `dashboard-grid` CSS stagger violated §12
 * for portal surfaces.
 */
export function DashboardGrid({
  children,
  columns = 3,
  gap = "md",
  className,
}: DashboardGridProps) {
  return (
    <div
      className={cn(
        "grid",
        columnClasses[columns],
        gapClasses[gap],
        className,
      )}
    >
      {children}
    </div>
  )
}
