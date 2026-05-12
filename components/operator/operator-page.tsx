import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { DashboardCard } from "@/components/dashboard"
import { cn } from "@/lib/utils"

export interface OperatorPageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

interface OperatorPageProps {
  children: ReactNode
  bounded?: boolean
  className?: string
}

export function OperatorPage({
  children,
  bounded = true,
  className,
}: OperatorPageProps) {
  return (
    <div
      data-testid="operator-page"
      className={cn(
        "flex flex-col gap-3",
        bounded && "lg:h-[calc(100vh-4rem)] lg:min-h-0 lg:overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * OperatorPageHeader — Linear-tier portal page header.
 *
 * Replaces the marketing-sized DashboardPageHeader (which still uses
 * Heading h1 at text-3xl/4xl). Portal pages need a tighter, calmer h1
 * because the page is dense and the title is reference, not hero copy.
 *
 * Renders a 20px (text-xl) h1 with tracking-tight + negative weight,
 * a 13px back-breadcrumb chevron, and a single-line action cluster
 * right. Total chrome ≈ 48px tall vs the previous ~120px.
 */
export function OperatorPageHeader({
  title,
  description,
  badge,
  backHref,
  backLabel = "Operations",
  actions,
  className,
}: OperatorPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-0 shrink-0 flex flex-wrap items-center gap-3 sm:flex-nowrap",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <ChevronLeft className="h-3 w-3" aria-hidden />
            {backLabel}
          </Link>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}

interface OperatorScrollAreaProps {
  children: ReactNode
  className?: string
}

export function OperatorScrollArea({ children, className }: OperatorScrollAreaProps) {
  return (
    <div
      data-testid="operator-scroll-area"
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface OperatorPanelProps {
  children: ReactNode
  className?: string
  padding?: "sm" | "md" | "lg" | "none"
}

export function OperatorPanel({
  children,
  className,
  padding = "md",
}: OperatorPanelProps) {
  return (
    <DashboardCard
      padding={padding}
      className={cn("overflow-hidden", className)}
    >
      {children}
    </DashboardCard>
  )
}

interface OperatorSplitPaneProps {
  list: ReactNode
  detail: ReactNode
  className?: string
  listClassName?: string
  detailClassName?: string
}

export function OperatorSplitPane({
  list,
  detail,
  className,
  listClassName,
  detailClassName,
}: OperatorSplitPaneProps) {
  return (
    <div
      data-testid="operator-split-pane"
      className={cn(
        "grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.4fr)]",
        className,
      )}
    >
      <div
        className={cn(
          "min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]",
          listClassName,
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]",
          detailClassName,
        )}
      >
        {detail}
      </div>
    </div>
  )
}
