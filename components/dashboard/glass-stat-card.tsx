"use client"

import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * StatCard status. Canonical 5-step palette aligned with `DESIGN.md`
 * §1 (semantic colors) and §10 (severity badges). Replaces the legacy
 * `dashboard-stat-*` inset-glow shadows from `app/dashboard-styles.css`.
 */
export type StatCardStatus = "success" | "warning" | "error" | "info" | "neutral"

export interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  status?: StatCardStatus
  href?: string
  onClick?: () => void
  className?: string
}

const iconBgClasses: Record<StatCardStatus, string> = {
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  error: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  neutral:
    "bg-muted text-muted-foreground dark:bg-white/[0.06] dark:text-muted-foreground",
}

/**
 * Canonical KPI tile. Solid depth from `DESIGN.md` §5; status is communicated
 * through the icon tint, not a colored ring or glow.
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  status = "neutral",
  href,
  onClick,
  className,
}: StatCardProps) {
  const Wrapper = href ? "a" : onClick ? "button" : "div"
  const wrapperProps = href
    ? { href }
    : onClick
      ? { onClick, type: "button" as const }
      : {}

  const isInteractive = Boolean(href || onClick)

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        // Canonical solid-depth (Morning Canvas §5)
        "block w-full text-left bg-white dark:bg-card",
        "border border-border/50 dark:border-white/15",
        "shadow-sm shadow-primary/[0.04] dark:shadow-none",
        "rounded-xl p-5",
        "transition-[transform,box-shadow,border-color] duration-300",
        isInteractive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.06] hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.10em] truncate">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground mt-0.5">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5 text-xs">
              {trend.value > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
              )}
              <span
                className={cn(
                  "font-medium",
                  trend.value > 0
                    ? "text-success"
                    : trend.value < 0
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "shrink-0 p-3 rounded-xl transition-transform duration-200",
              iconBgClasses[status],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
