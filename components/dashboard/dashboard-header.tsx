import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { Heading } from "@/components/ui/heading"
import { cn } from "@/lib/utils"

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
 * DashboardHeader (legacy alias)
 *
 * Page header used in admin / doctor surfaces. Internally renders the
 * canonical `<Heading level="h1">` primitive instead of a hand-rolled
 * `text-2xl font-semibold` string. Stripped the legacy `dashboard-header`
 * class (was a flex+padding+border-bottom block; reproduced inline here
 * with canonical tokens).
 *
 * For new code prefer `<DashboardPageHeader>` which has a more flexible
 * action slot. Kept here for back-compat with existing admin imports.
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
    <div
      className={cn(
        "flex items-start justify-between gap-4 flex-wrap",
        "py-6 mb-6 border-b border-border/60",
        className,
      )}
    >
      <div className="space-y-1 min-w-0 flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </Link>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <Heading level="h1">{title}</Heading>
          {badge}
        </div>
        {description && (
          <p className="text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
