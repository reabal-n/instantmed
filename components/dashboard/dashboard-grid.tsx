"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: "sm" | "md" | "lg"
  className?: string
  animate?: boolean
}

/**
 * DashboardGrid
 * 
 * Responsive grid with staggered entrance animations.
 * Used for laying out stat cards, feature cards, etc.
 */
export function DashboardGrid({
  children,
  columns = 3,
  gap = "md",
  className,
  animate = true,
}: DashboardGridProps) {
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

  return (
    <div
      className={cn(
        "grid",
        columnClasses[columns],
        gapClasses[gap],
        animate && "dashboard-grid",
        className
      )}
    >
      {children}
    </div>
  )
}
