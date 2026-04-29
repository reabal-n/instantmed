import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: "sm" | "md" | "lg"
  className?: string
  /**
   * @deprecated No-op. Use Framer `stagger.container` from `lib/motion.ts`.
   * FIXME(2026-10-29): remove after admin + doctor portal migrations land.
   * The legacy `dashboard-grid` CSS-based stagger is gone (banned by §12).
   */
  animate?: boolean
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
 * for portal surfaces. The `animate` prop is preserved as a no-op for
 * back-compat; it has no visual effect.
 */
export function DashboardGrid({
  children,
  columns = 3,
  gap = "md",
  className,
  animate: _animate,
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
