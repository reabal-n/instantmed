import Link from "next/link"
import { type ReactNode } from "react"

import { Heading } from "@/components/ui/heading"
import { cn } from "@/lib/utils"

export interface DashboardSectionProps {
  /** Section title rendered as <Heading level="h2"> by default. */
  title: string
  /** Optional small label above title (e.g. "Documents", "Activity"). */
  pill?: ReactNode
  /** Optional supporting description below title. */
  description?: string
  /** Optional right-aligned action (link, button, count). */
  action?: ReactNode
  /** Optional "View all" link, shorthand alternative to `action`. */
  viewAllHref?: string
  /** Optional viewAll label override. */
  viewAllLabel?: string
  /** Use level="h3" for compact / nested sections. Defaults to "h2". */
  headingLevel?: "h2" | "h3"
  /** Render the heading as a different semantic element (e.g. h3 styled, but h2 semantically). */
  headingAs?: "h2" | "h3" | "h4"
  children: ReactNode
  className?: string
}

/**
 * DashboardSection
 *
 * Replaces the hand-rolled `flex items-center justify-between mb-5 + h2` block
 * pattern repeated ~12 times across patient + doctor surfaces. Standardises
 * heading scale, action slot, and viewAll convenience.
 */
export function DashboardSection({
  title,
  pill,
  description,
  action,
  viewAllHref,
  viewAllLabel = "View all",
  headingLevel = "h2",
  headingAs,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-5", className)}>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0 flex-1">
          {pill && (
            <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">
              {pill}
            </span>
          )}
          <Heading
            level={headingLevel}
            as={headingAs}
            className={headingLevel === "h3" ? "!text-lg" : "!text-xl sm:!text-2xl"}
          >
            {title}
          </Heading>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action ? (
          <div className="shrink-0">{action}</div>
        ) : viewAllHref ? (
          <Link
            href={viewAllHref}
            className="shrink-0 text-sm font-medium text-primary hover:underline transition-colors"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  )
}
