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
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    error: "bg-destructive-light text-destructive",
    info: "bg-info-light text-info",
    neutral: "bg-muted text-muted-foreground dark:bg-white/10 dark:text-muted-foreground",
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground mt-0.5">
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
                    ? "text-success"
                    : trend.value < 0
                    ? "text-destructive"
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
              "group-hover:scale-[1.02]"
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
