import Link from "next/link"
import { AlertTriangle, Bolt } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  type CaseRowData,
  type Density,
  ROW_HEIGHT,
} from "@/lib/operator/cases/types"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"

import { StatusDot } from "./status-dot"

type CaseRowProps = {
  row: CaseRowData
  density: Density
  selected?: boolean
  actions?: React.ReactNode
  className?: string
  /**
   * When provided, plain left-click on the row calls this handler instead
   * of navigating to `row.href`. Cmd/Ctrl/Shift/middle-click still follow
   * the link as a browser default. Used to wire the slide-over case panel
   * in the Ledger while keeping the row's link semantics intact.
   */
  onPrimary?: (id: string) => void
}

/**
 * Case row primitive used across the cockpit (Ledger, Dashboard, Patients,
 * Ops). One primary navigation link wraps the row via the "stretched link"
 * pattern — visual content sits above the link with `pointer-events-none`
 * so clicks pass through. Action buttons re-enable pointer events so they
 * take precedence over the link. This keeps HTML valid (no nested
 * interactives) while preserving the "click anywhere to open" UX.
 *
 * Portal motion rule: transition-colors only. No spring, no transform.
 */
export function CaseRow({
  row,
  density,
  selected = false,
  actions,
  className,
  onPrimary,
}: CaseRowProps) {
  const relativeTime = formatRelativeTime(row.createdAt)
  const fullTimestamp = (() => {
    const d = new Date(row.createdAt)
    if (Number.isNaN(d.getTime())) return row.createdAt
    return d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  })()

  return (
    <div
      role="row"
      data-row-id={row.id}
      data-density={density}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "group relative grid items-center gap-3 px-4",
        // Columns: avatar | identity | service+ref | status+flags | time | actions
        "grid-cols-[28px_minmax(160px,1.5fr)_minmax(160px,1fr)_minmax(140px,auto)_90px_auto]",
        "border-b border-border/40 transition-colors",
        "hover:bg-muted/30",
        "data-[selected=true]:bg-primary/[0.04] data-[selected=true]:ring-1 data-[selected=true]:ring-inset data-[selected=true]:ring-primary/30",
        ROW_HEIGHT[density],
        className,
      )}
    >
      {/* Stretched primary link. Sits behind content (z-0) so visual cells
          can sit above with pointer-events disabled. When onPrimary is set,
          plain left-click opens the slide-over instead of navigating; Cmd/
          Ctrl/Shift/middle-click still follow the link. */}
      <Link
        href={row.href}
        onClick={(event) => {
          if (!onPrimary) return
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          if (event.button !== 0) return
          event.preventDefault()
          onPrimary(row.id)
        }}
        className={cn(
          "absolute inset-0 z-0 rounded-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        )}
        aria-label={`Open case ${row.intakeRef} for ${row.patientName}`}
      >
        <span className="sr-only">Open case</span>
      </Link>

      {/* Avatar (decorative) */}
      <div className="relative z-[1] pointer-events-none">
        <Avatar className="h-7 w-7">
          {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-[10px] font-medium">
            {row.avatarInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Identity: name + secondary line */}
      <div className="relative z-[1] pointer-events-none min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {row.patientName}
        </div>
        {row.patientEmail ? (
          <div className="truncate text-xs text-muted-foreground">
            {row.patientEmail}
          </div>
        ) : row.patientLocation ? (
          <div className="truncate text-xs text-muted-foreground">
            {row.patientLocation}
          </div>
        ) : null}
      </div>

      {/* Service + ref */}
      <div className="relative z-[1] pointer-events-none min-w-0">
        <div className="truncate text-sm text-foreground">
          {row.serviceLabel}
        </div>
        <div className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
          {row.intakeRef}
        </div>
      </div>

      {/* Status + flags */}
      <div className="relative z-[1] pointer-events-none flex min-w-0 items-center gap-2">
        <StatusDot status={row.status} />
        {row.isPriority ? (
          <span
            className="inline-flex h-5 items-center gap-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-700"
            aria-label="Express priority"
            title="Express priority"
          >
            <Bolt className="h-3 w-3" aria-hidden="true" />
            Express
          </span>
        ) : null}
        {row.isStale ? (
          <span
            className="inline-flex items-center"
            aria-label="Stale: no movement in 4 hours"
            title="Stale: no movement in 4 hours"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span className="sr-only">Stale</span>
          </span>
        ) : null}
      </div>

      {/* Relative time */}
      <div
        className="relative z-[1] pointer-events-none text-right text-xs tabular-nums text-muted-foreground"
        title={fullTimestamp}
      >
        {relativeTime}
      </div>

      {/* Actions: hover-revealed, real buttons (siblings of the link). */}
      {actions ? (
        <div className="relative z-[2] flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {actions}
        </div>
      ) : (
        <div className="relative z-[1] pointer-events-none" aria-hidden="true" />
      )}
    </div>
  )
}
