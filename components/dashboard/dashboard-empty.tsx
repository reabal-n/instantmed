"use client"

import { type ReactNode } from "react"

import { LottieAnimation } from "@/components/ui/lottie-animation"
import { cn } from "@/lib/utils"

export interface DashboardEmptyProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** Hide the empty-state Lottie. Useful on tightly-spaced sub-surfaces. */
  hideAnimation?: boolean
}

/**
 * DashboardEmpty
 *
 * Empty state for portal surfaces. Lottie is permitted per §13 ("Lottie
 * animations for empty states and feedback are still permitted" even in
 * the no-decorative-motion portal exception).
 *
 * Replaces the legacy `dashboard-empty` class (which used dashed neon
 * borders + glass-tinted background). Now uses canonical Morning Canvas
 * tokens: warm-tinted muted background, dashed border, generous padding.
 */
export function DashboardEmpty({
  icon,
  title,
  description,
  action,
  hideAnimation = false,
  className,
}: DashboardEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "rounded-xl border border-dashed border-border/60 bg-muted/30",
        "py-12 px-6",
        className,
      )}
    >
      {!hideAnimation && (
        <div className="mb-4">
          <LottieAnimation name="empty-state" size={80} loop={false} />
        </div>
      )}
      {icon && (
        <div className="mb-4 p-3 rounded-full bg-muted/50 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1 tracking-[-0.01em]">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
