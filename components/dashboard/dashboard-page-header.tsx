import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { type ReactNode } from "react"

import { Heading } from "@/components/ui/heading"
import { cn } from "@/lib/utils"

export interface DashboardPageHeaderProps {
  /** Page title rendered as <Heading level="h1">. */
  title: string
  /** Optional supporting description below title. */
  description?: string
  /** Optional badge / status chip rendered inline next to the title. */
  badge?: ReactNode
  /** Optional back-link breadcrumb above the title. */
  backHref?: string
  /** Default "Back". */
  backLabel?: string
  /** Right-aligned actions (buttons, refresh, primary CTA). */
  actions?: ReactNode
  className?: string
}

/**
 * DashboardPageHeader
 *
 * Canonical h1 surface for every patient + doctor + admin sub-page.
 * Replaces 18+ hand-rolled `<h1 className="text-2xl font-semibold
 * tracking-tight">` instances across the portal codebase. Locks heading
 * styles to the design-system primitive (`<Heading level="h1">`).
 */
export function DashboardPageHeader({
  title,
  description,
  badge,
  backHref,
  backLabel = "Back",
  actions,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 space-y-4 sm:flex sm:items-start sm:justify-between sm:gap-4 sm:space-y-0",
        className,
      )}
    >
      <div className="space-y-2 min-w-0 sm:flex-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          <p className="text-base text-muted-foreground max-w-2xl">{description}</p>
        )}
      </div>
      {actions && (
        <div
          className="flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0"
        >
          {actions}
        </div>
      )}
    </header>
  )
}
