"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export interface DashboardHeaderProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  badge?: ReactNode
  className?: string
}

/**
 * DashboardHeader
 * 
 * Page header for dashboard pages with optional back navigation and actions.
 */
export function DashboardHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  badge,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn("dashboard-header", className)}>
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
