import type { ReactNode } from "react"

import {
  DashboardCard,
  DashboardPageHeader,
  type DashboardPageHeaderProps,
} from "@/components/dashboard"
import { cn } from "@/lib/utils"

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

export function OperatorPageHeader({
  className,
  backLabel = "Operations",
  ...props
}: DashboardPageHeaderProps) {
  return (
    <DashboardPageHeader
      backLabel={backLabel}
      className={cn("mb-0 shrink-0", className)}
      {...props}
    />
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
