import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"

export type RecoverySeverity = "warning" | "critical"

const SEVERITY_DOT: Record<RecoverySeverity, string> = {
  warning: "bg-amber-500",
  critical: "bg-red-500",
}

type RecoveryRowProps = {
  title: string
  detail: string
  occurredAt: string
  severity: RecoverySeverity
  href: string
  className?: string
}

export function RecoveryRow({
  title,
  detail,
  occurredAt,
  severity,
  href,
  className,
}: RecoveryRowProps) {
  const fullTimestamp = (() => {
    const d = new Date(occurredAt)
    if (Number.isNaN(d.getTime())) return occurredAt
    return d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  })()

  return (
    <Link
      href={href}
      data-testid="recovery-row"
      data-severity={severity}
      className={cn(
        "group flex items-center gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-b-0",
        "hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          SEVERITY_DOT[severity],
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      <div
        className="shrink-0 text-right text-xs tabular-nums text-muted-foreground"
        title={fullTimestamp}
      >
        {formatRelativeTime(occurredAt)}
      </div>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </Link>
  )
}
