import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  formatRelativeTime,
  groupByTime,
  type TimeGroup,
} from "@/lib/operator/cases/time-grouping"
import type { CaseRowData } from "@/lib/operator/cases/types"
import { cn } from "@/lib/utils"

import { StatusDot } from "./status-dot"

type EmptyStateConfig = {
  title: string
  body?: string
  action?: React.ReactNode
}

type CaseMobileListProps = {
  rows: CaseRowData[]
  groupByTime?: boolean
  /** Override for "now" in tests / SSR. */
  now?: Date
  emptyState?: EmptyStateConfig
  rowActions?: (row: CaseRowData) => React.ReactNode
  onRowPrimary?: (id: string) => void
  selectedRowId?: string | null
  className?: string
}

/**
 * Touch-first case list used where the desktop CaseTable would otherwise
 * require horizontal scrolling. It deliberately keeps recovery controls in
 * the normal flow so no permitted action depends on hover.
 */
export function CaseMobileList({
  rows,
  groupByTime: doGroupByTime = false,
  now,
  emptyState,
  rowActions,
  onRowPrimary,
  selectedRowId,
  className,
}: CaseMobileListProps) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-card px-4 py-10 text-center",
          className,
        )}
        data-case-mobile-list="true"
      >
        <p className="text-sm font-medium text-foreground">
          {emptyState?.title ?? "No cases"}
        </p>
        {emptyState?.body ? (
          <p className="mt-1 text-sm text-muted-foreground">{emptyState.body}</p>
        ) : null}
        {emptyState?.action ? <div className="mt-4">{emptyState.action}</div> : null}
      </div>
    )
  }

  const groups: Array<TimeGroup<CaseRowData> | { label: null; items: CaseRowData[] }> =
    doGroupByTime
      ? groupByTime(rows, "createdAt", now)
      : [{ label: null, items: rows }]

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
      data-case-mobile-list="true"
      role="list"
    >
      {groups.map((group, groupIndex) => (
        <div key={group.label ?? groupIndex}>
          {group.label ? (
            <div
              className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-1.5"
              role="presentation"
            >
              <span className="text-[10px] font-semibold tracking-[0.08em] text-muted-foreground">
                {group.label}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
                ({group.items.length})
              </span>
            </div>
          ) : null}

          {group.items.map((row) => (
            <MobileCaseRow
              key={row.id}
              row={row}
              actions={rowActions?.(row)}
              now={now}
              onPrimary={onRowPrimary}
              selected={selectedRowId === row.id}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MobileCaseRow({
  row,
  actions,
  now,
  onPrimary,
  selected = false,
}: {
  row: CaseRowData
  actions?: React.ReactNode
  now?: Date
  onPrimary?: (id: string) => void
  selected?: boolean
}) {
  const relativeTime = formatRelativeTime(row.createdAt, now)
  const fullTimestamp = (() => {
    const date = new Date(row.createdAt)
    if (Number.isNaN(date.getTime())) return row.createdAt
    return date.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  })()

  return (
    <article
      className={cn(
        "relative border-b border-border/40 px-3 py-3 transition-colors last:border-b-0",
        "data-[selected=true]:bg-primary/[0.04] data-[selected=true]:ring-1 data-[selected=true]:ring-inset data-[selected=true]:ring-primary/30",
      )}
      data-mobile-case-row="true"
      data-row-id={row.id}
      data-selected={selected ? "true" : undefined}
      role="listitem"
    >
      {row.href ? (
        <Link
          href={row.href}
          prefetch={false}
          onClick={(event) => {
            if (!onPrimary) return
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            if (event.button !== 0) return
            event.preventDefault()
            onPrimary(row.id)
          }}
          className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          aria-label={`Open case ${row.intakeRef} for ${row.patientName}`}
        >
          <span className="sr-only">Open case</span>
        </Link>
      ) : null}

      <div className="relative z-[1] pointer-events-none flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-xs font-medium">
            {row.avatarInitials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.patientName}
              </p>
              {row.patientEmail ? (
                <p className="truncate text-xs text-muted-foreground">{row.patientEmail}</p>
              ) : row.patientLocation ? (
                <p className="truncate text-xs text-muted-foreground">{row.patientLocation}</p>
              ) : null}
            </div>
            <time
              className="shrink-0 text-xs tabular-nums text-muted-foreground"
              dateTime={row.createdAt}
              title={fullTimestamp}
            >
              {relativeTime}
            </time>
          </div>

          <div className="mt-2 flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{row.serviceLabel}</p>
              <p className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
                {row.intakeRef}
              </p>
            </div>
            <StatusDot className="shrink-0" status={row.status} />
          </div>
        </div>
      </div>

      {actions ? (
        <div
          className="relative z-[2] mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3 [&_button]:min-h-11"
          data-mobile-row-actions="always-visible"
        >
          {actions}
        </div>
      ) : null}
    </article>
  )
}
