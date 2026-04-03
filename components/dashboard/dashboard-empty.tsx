"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { LottieAnimation } from "@/components/ui/lottie-animation"

export interface DashboardEmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/**
 * DashboardEmpty
 *
 * Empty state component for dashboards.
 * Shows when there's no data to display.
 */
export function DashboardEmpty({
  icon,
  title,
  description,
  action,
  className,
}: DashboardEmptyProps) {
  return (
    <div className={cn("dashboard-empty", className)}>
      <div className="mb-4">
        <LottieAnimation name="empty-state" size={80} loop={false} />
      </div>
      {icon && (
        <div className="mb-4 p-3 rounded-full bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
