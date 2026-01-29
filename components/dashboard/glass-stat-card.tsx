"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface GlassStatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  status?: "success" | "warning" | "error" | "info" | "neutral"
  href?: string
  onClick?: () => void
  className?: string
}

/**
 * GlassStatCard
 * 
 * Premium stat card with glass effect and status-based glow.
 * Designed for dashboard KPI displays.
 */
export function GlassStatCard({
  label,
  value,
  icon,
  trend,
  status = "neutral",
  href,
  onClick,
  className,
}: GlassStatCardProps) {
  const statusClasses = {
    success: "dashboard-stat-success",
    warning: "dashboard-stat-warning",
    error: "dashboard-stat-error",
    info: "dashboard-stat-info",
    neutral: "",
  }

  const iconBgClasses = {
    success: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    error: "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400",
    info: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400",
    neutral: "bg-white/60 text-slate-500 dark:bg-white/10 dark:text-slate-400",
  }

  const Wrapper = href ? "a" : onClick ? "button" : "div"
  const wrapperProps = href 
    ? { href } 
    : onClick 
    ? { onClick, type: "button" as const } 
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "dashboard-stat",
        statusClasses[status],
        (href || onClick) && "cursor-pointer",
        "block w-full text-left",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1.5 text-xs">
              {trend.value > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "font-medium",
                  trend.value > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : trend.value < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
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
              "group-hover:scale-110"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
