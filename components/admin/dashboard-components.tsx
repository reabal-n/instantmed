"use client"

/**
 * Admin Dashboard Components
 * 
 * Clean, professional dashboard elements inspired by HeroUI Pro.
 * - Minimal borders, uses subtle shadows and backgrounds
 * - Clear visual hierarchy with consistent spacing
 * - Neutral color palette with accent colors for status
 */

import { ReactNode } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react"

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  status?: "success" | "warning" | "error" | "neutral"
  href?: string
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  status = "neutral",
  href,
  className,
}: StatCardProps) {
  const statusColors = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    error: "text-red-600",
    neutral: "text-foreground",
  }

  const content = (
    <div
      className={cn(
        "relative p-5 rounded-xl bg-white dark:bg-slate-900",
        "border border-slate-100 dark:border-slate-800",
        href && "hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-semibold tracking-tight", statusColors[status])}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.value > 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3 h-3 text-red-500" />
              ) : (
                <Minus className="w-3 h-3 text-muted-foreground" />
              )}
              <span className={cn(
                trend.value > 0 ? "text-emerald-600" : 
                trend.value < 0 ? "text-red-600" : 
                "text-muted-foreground"
              )}>
                {trend.value > 0 ? "+" : ""}{trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            "p-2.5 rounded-lg",
            status === "success" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600",
            status === "warning" && "bg-amber-50 dark:bg-amber-950/30 text-amber-600",
            status === "error" && "bg-red-50 dark:bg-red-950/30 text-red-600",
            status === "neutral" && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
          )}>
            {icon}
          </div>
        )}
      </div>
      {href && (
        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    )
  }

  return content
}

// ============================================
// SECTION HEADER
// ============================================

interface SectionHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-muted-foreground">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

// ============================================
// STATUS BADGE
// ============================================

interface StatusBadgeProps {
  status: "healthy" | "warning" | "error" | "neutral"
  label: string
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, label, pulse, className }: StatusBadgeProps) {
  const colors = {
    healthy: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    neutral: "bg-slate-400",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          colors[status],
          pulse && status !== "healthy" && "animate-pulse"
        )}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ============================================
// DATA ROW
// ============================================

interface DataRowProps {
  primary: string
  secondary?: string
  trailing?: ReactNode
  status?: "success" | "warning" | "error" | "neutral"
  onClick?: () => void
  className?: string
}

export function DataRow({
  primary,
  secondary,
  trailing,
  status: _status,
  onClick,
  className,
}: DataRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        "bg-slate-50 dark:bg-slate-800/50",
        onClick && "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{primary}</p>
        {secondary && (
          <p className="text-xs text-muted-foreground">{secondary}</p>
        )}
      </div>
      {trailing}
    </div>
  )
}

// ============================================
// PAGE HEADER
// ============================================

interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  status?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  status,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status}
          {actions}
        </div>
      </div>
    </div>
  )
}
