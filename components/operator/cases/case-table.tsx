"use client"

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

import {
  groupByTime,
  type TimeGroup,
} from "@/lib/operator/cases/time-grouping"
import {
  type CaseRowData,
  type Density,
  type SortDirection,
  type SortField,
  type SortState,
} from "@/lib/operator/cases/types"
import { cn } from "@/lib/utils"

import { CaseRow } from "./case-row"

type EmptyStateConfig = {
  title: string
  body?: string
  action?: React.ReactNode
}

type CaseTableProps = {
  rows: CaseRowData[]
  density: Density
  sortable?: boolean
  sortState?: SortState
  onSortChange?: (sort: SortState) => void
  groupByTime?: boolean
  /** Override for "now" in tests / SSR */
  now?: Date
  emptyState?: EmptyStateConfig
  rowActions?: (row: CaseRowData) => React.ReactNode
  /**
   * Plain-click handler for rows. Threaded into CaseRow's `onPrimary`. When
   * set, left-click opens the callback (e.g. a slide-over) instead of
   * navigating; modifier-click still follows the row href.
   */
  onRowPrimary?: (id: string) => void
  /**
   * The id of the currently selected row (for keyboard navigation visuals).
   */
  selectedRowId?: string | null
  className?: string
}

/**
 * Layout grid shared between the header row and CaseRow itself. Keep these
 * column definitions in sync — they MUST match so the header chevrons
 * align with their data cells.
 */
const GRID_TEMPLATE =
  "grid-cols-[28px_minmax(160px,1.5fr)_minmax(160px,1fr)_minmax(140px,auto)_90px_auto]"

/**
 * Default direction when a column is first activated.
 * Time defaults to DESC (newest first), everything else to ASC (alphabetical).
 */
const DEFAULT_DIRECTION_FOR_FIELD: Record<SortField, SortDirection> = {
  createdAt: "desc",
  status: "asc",
  patient: "asc",
  service: "asc",
}

const SORTABLE_HEADERS: Array<{
  field: SortField
  label: string
  colStart: number // 1-indexed grid column
  colSpan: number
  align?: "left" | "right"
}> = [
  { field: "patient", label: "Patient", colStart: 2, colSpan: 1 },
  { field: "service", label: "Service", colStart: 3, colSpan: 1 },
  { field: "status", label: "Status", colStart: 4, colSpan: 1 },
  { field: "createdAt", label: "Time", colStart: 5, colSpan: 1, align: "right" },
]

export function CaseTable({
  rows,
  density,
  sortable = false,
  sortState,
  onSortChange,
  groupByTime: doGroupByTime = false,
  now,
  emptyState,
  rowActions,
  onRowPrimary,
  selectedRowId,
  className,
}: CaseTableProps) {
  if (rows.length === 0) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-card",
          className,
        )}
      >
        {emptyState ? (
          <EmptyState {...emptyState} />
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No cases.
          </div>
        )}
      </div>
    )
  }

  const groups: Array<TimeGroup<CaseRowData> | { label: null; items: CaseRowData[] }> =
    doGroupByTime
      ? groupByTime(rows, "createdAt", now)
      : [{ label: null, items: rows }]

  return (
    <div
      role="grid"
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-card",
        className,
      )}
    >
      {sortable ? (
        <SortableHeader
          sortState={sortState}
          onSortChange={onSortChange}
        />
      ) : null}

      <div role="rowgroup">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <div
                role="presentation"
                className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-1.5"
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
              <CaseRow
                key={row.id}
                row={row}
                density={density}
                actions={rowActions?.(row)}
                onPrimary={onRowPrimary}
                selected={selectedRowId === row.id}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SortableHeader({
  sortState,
  onSortChange,
}: {
  sortState?: SortState
  onSortChange?: (sort: SortState) => void
}) {
  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-3 border-b border-border/60 bg-muted/20 px-4 py-2",
        GRID_TEMPLATE,
      )}
    >
      {/* avatar column: blank */}
      <div aria-hidden="true" />

      {SORTABLE_HEADERS.map((h) => {
        const active = sortState?.field === h.field
        const direction = active ? sortState!.direction : null
        const ariaSort = active
          ? direction === "asc"
            ? "ascending"
            : "descending"
          : "none"

        const handleClick = () => {
          if (!onSortChange) return
          const nextDirection: SortDirection = active
            ? direction === "asc"
              ? "desc"
              : "asc"
            : DEFAULT_DIRECTION_FOR_FIELD[h.field]
          onSortChange({ field: h.field, direction: nextDirection })
        }

        return (
          <button
            key={h.field}
            type="button"
            role="columnheader"
            aria-sort={ariaSort}
            onClick={handleClick}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:text-foreground",
              h.align === "right" && "justify-end",
              active && "text-foreground",
            )}
          >
            <span>{h.label}</span>
            {active ? (
              direction === "asc" ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )
            ) : (
              <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
            )}
          </button>
        )
      })}

      {/* actions column: blank */}
      <div aria-hidden="true" />
    </div>
  )
}

function EmptyState({ title, body, action }: EmptyStateConfig) {
  return (
    <div className="py-16 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {body ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
