/**
 * Shared Dashboard Layout Components
 * 
 * Provides consistent spacing and layout for /admin and /doctor dashboards.
 * Use these primitives to ensure visual consistency across the application.
 */

import { cn } from "@/lib/utils"

/**
 * Layout constants for consistent spacing
 */
export const LAYOUT = {
  /** Max width for main content area */
  maxWidth: "max-w-7xl",
  /** Responsive horizontal padding */
  paddingX: "px-4 sm:px-6 lg:px-8",
  /** Vertical padding for page content */
  paddingY: "py-6",
  /** Standard gap for card grids */
  gap: "gap-6",
  /** Larger gap for major sections */
  sectionGap: "gap-8",
} as const

/**
 * Main content container with consistent max-width and padding.
 * Use this as the outer wrapper for dashboard page content.
 */
export function DashboardContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto",
        LAYOUT.maxWidth,
        LAYOUT.paddingX,
        LAYOUT.paddingY,
        className
      )}
      data-testid="dashboard-container"
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Page content wrapper with consistent vertical spacing.
 * Use inside DashboardContainer for page sections.
 */
export function DashboardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="dashboard-content"
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Grid layout for cards with consistent gap.
 * Responsive: 1 column on mobile, 2-3 on larger screens.
 */
export function DashboardGrid({
  children,
  columns = 3,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  columns?: 2 | 3 | 4
}) {
  const colsClass = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  }[columns]

  return (
    <div
      className={cn(
        "grid grid-cols-1",
        colsClass,
        LAYOUT.gap,
        className
      )}
      data-testid="dashboard-grid"
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Section wrapper with consistent spacing between major page sections.
 */
export function DashboardSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("space-y-4", className)}
      data-testid="dashboard-section"
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Page header with title and optional actions.
 */
export function DashboardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      data-testid="dashboard-header"
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Stats row with consistent gap for metric cards.
 */
export function DashboardStats({
  children,
  columns = 4,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  columns?: 2 | 3 | 4
}) {
  const colsClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns]

  return (
    <div
      className={cn(
        "grid grid-cols-1",
        colsClass,
        LAYOUT.gap,
        className
      )}
      data-testid="dashboard-stats"
      {...props}
    >
      {children}
    </div>
  )
}
