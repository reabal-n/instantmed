"use client"

import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

export type StatusBadgeStatus = "success" | "warning" | "error" | "info" | "neutral"

export interface StatusBadgeProps {
  status: StatusBadgeStatus
  children: ReactNode
  icon?: ReactNode
  pulse?: boolean
  size?: "sm" | "md"
  className?: string
}

/**
 * Canonical status-pill palette from `DESIGN.md` §10.
 */
const statusStyles: Record<StatusBadgeStatus, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 " +
    "ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/30",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 " +
    "ring-1 ring-inset ring-amber-200 dark:ring-amber-500/30",
  error:
    "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 " +
    "ring-1 ring-inset ring-rose-200 dark:ring-rose-500/30",
  info:
    "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 " +
    "ring-1 ring-inset ring-blue-200 dark:ring-blue-500/30",
  neutral:
    "bg-muted text-muted-foreground ring-1 ring-inset ring-border/60 " +
    "dark:bg-white/[0.06] dark:ring-white/15",
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
}

/**
 * Canonical status pill. Inset ring instead of outset glow. Status
 * communicated through tinted background + foreground.
 */
export function StatusBadge({
  status,
  children,
  icon,
  pulse = false,
  size = "md",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        statusStyles[status],
        sizeClasses[size],
        pulse && status !== "success" && "motion-safe:animate-pulse",
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

// Pre-configured shorthand badges
export function SuccessBadge({ children, ...props }: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="success" {...props}>{children}</StatusBadge>
}
export function WarningBadge({ children, ...props }: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="warning" {...props}>{children}</StatusBadge>
}
export function ErrorBadge({ children, ...props }: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="error" {...props}>{children}</StatusBadge>
}
export function InfoBadge({ children, ...props }: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="info" {...props}>{children}</StatusBadge>
}
export function NeutralBadge({ children, ...props }: Omit<StatusBadgeProps, "status">) {
  return <StatusBadge status="neutral" {...props}>{children}</StatusBadge>
}
