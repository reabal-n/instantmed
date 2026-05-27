"use client"

import { RefreshCw, Search, X } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import type { FormToInboxStats } from "@/lib/data/intakes"
import {
  getQueuePressureState,
  QUEUE_WAIT_TARGET_MINUTES,
  type QueuePressureSeverity,
} from "@/lib/doctor/queue-pressure"
import { formatMinutes } from "@/lib/format/dates"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

const pressureClasses: Record<QueuePressureSeverity, { root: string; dot: string; value: string }> = {
  idle: {
    root: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
    value: "text-slate-700 dark:text-muted-foreground",
  },
  clear: {
    root: "text-muted-foreground",
    dot: "bg-slate-500",
    value: "text-slate-700 dark:text-muted-foreground",
  },
  watch: {
    root: "text-warning",
    dot: "bg-warning",
    value: "text-warning",
  },
  urgent: {
    root: "text-destructive",
    dot: "bg-destructive",
    value: "text-destructive",
  },
}

export interface QueueFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  statusFilter: QueueStatusFilter
  onStatusFilterChange: (value: QueueStatusFilter) => void
  intakes: IntakeWithPatient[]
  filteredCount: number
  isStale: boolean
  isReconnecting: boolean
  isRefreshing?: boolean
  compactShell?: boolean
  /**
   * Oldest case age in minutes for the currently visible queue scope.
   * This is a doctor-facing operational pressure signal, not a public
   * delivery-time claim.
   */
  oldestWaitingMinutes?: number | null
  showOldestWaiting?: boolean
  formToInboxStats?: FormToInboxStats | null
}

export function QueueFilters({
  searchQuery,
  onSearchChange,
  onRefresh,
  statusFilter,
  onStatusFilterChange,
  intakes,
  filteredCount,
  isStale,
  isReconnecting,
  isRefreshing = false,
  compactShell = false,
  oldestWaitingMinutes,
  showOldestWaiting = true,
  formToInboxStats = null,
}: QueueFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const hasActiveSearch = searchQuery.trim().length > 0
  const matchLabel = `${filteredCount} ${filteredCount === 1 ? "match" : "matches"}`
  const pressure = getQueuePressureState(oldestWaitingMinutes, QUEUE_WAIT_TARGET_MINUTES)
  const pressureClass = pressureClasses[pressure.severity]
  const formToInboxLabel = formToInboxStats ? formatMinutes(formToInboxStats.medianMinutes) : null

  // `/` key focuses the search input (standard queue shortcut)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <>
      {/* Header + Search */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-testid="queue-header">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h2
              className={cn(
                "font-semibold tracking-tight text-foreground font-sans",
                compactShell ? "text-base" : "text-xl",
              )}
              data-testid="queue-heading"
            >
              {compactShell ? "Today's queue" : `${filteredCount} case${filteredCount !== 1 ? "s" : ""} waiting`}
            </h2>
            {/* Status dot only when stale/reconnecting. Healthy state is implicit; */}
            {/* the per-tab counts already say how many cases are in play. */}
            {(isStale || isReconnecting) && (
              <span className="inline-flex items-center gap-1.5 text-xs text-warning font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {isReconnecting ? "Reconnecting" : "Stale"}
              </span>
            )}
            {showOldestWaiting && typeof oldestWaitingMinutes === "number" && oldestWaitingMinutes >= 0 && (
              <span
                className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-150", pressureClass.root)}
                title={pressure.title}
                data-queue-pressure={pressure.severity}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", pressureClass.dot)} aria-hidden />
                <span>Oldest wait:</span>
                <span className={cn("tabular-nums", pressureClass.value)}>{pressure.value}</span>
              </span>
            )}
          </div>
          {compactShell && formToInboxLabel ? (
            <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-muted-foreground">
              Form to inbox {formToInboxLabel} · target under 2h
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex flex-1 items-center sm:flex-none">
              <Input
                ref={searchRef}
                placeholder={compactShell ? "Search patients" : "Search… or / to focus"}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={cn(
                  "w-full",
                  "[&>div]:h-9 [&>div]:min-h-0 [&>div]:border-slate-300 [&>div]:bg-white [&>div]:shadow-sm [&>div]:shadow-primary/[0.03] [&>div]:focus-within:border-primary/45 [&>div]:focus-within:ring-primary/20 dark:[&>div]:bg-card",
                  "[&_input]:h-9 [&_input]:py-0 [&_input]:text-sm [&_input]:leading-9 [&_input]:placeholder:text-slate-500",
                  compactShell ? "sm:w-64" : "sm:w-56",
                )}
                startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
                endContent={
                  searchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear patient search"
                      className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onSearchChange("")
                        searchRef.current?.focus()
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onRefresh}
              disabled={isRefreshing}
              title={isRefreshing ? "Refreshing queue" : "Refresh queue"}
              aria-label={isRefreshing ? "Refreshing queue" : "Refresh queue"}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>
          {hasActiveSearch && (
            <p className="pr-10 text-[11px] leading-none text-muted-foreground" aria-live="polite">
              {matchLabel}
            </p>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex w-full gap-1.5 overflow-x-auto rounded-lg bg-muted/25 p-1 sm:w-fit sm:flex-wrap">
        {([
          { key: "all", label: "All" },
          { key: "review", label: compactShell ? "Review" : "Needs Review" },
          { key: "pending_info", label: compactShell ? "Info" : "Pending Info" },
          { key: "scripts", label: compactShell ? "Scripts to write" : "Scripts" },
        ] as const).map((tab) => {
          const count =
            tab.key === "all"
              ? intakes.length
              : tab.key === "review"
              ? intakes.filter((r) => ["paid", "in_review"].includes(r.status)).length
              : tab.key === "pending_info"
              ? intakes.filter((r) => r.status === "pending_info").length
              : intakes.filter((r) => r.status === "awaiting_script").length
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={statusFilter === tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={cn(
                "shrink-0 rounded-md px-3.5 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 ease-in-out",
                statusFilter === tab.key
                  ? "bg-white text-foreground shadow-sm shadow-primary/[0.03] dark:bg-card"
                  : "text-slate-600 hover:bg-card/60 hover:text-foreground dark:text-muted-foreground"
              )}
            >
              {tab.label}
              <span className={cn("ml-1.5 tabular-nums", count === 0 && "text-muted-foreground/70")}>({count})</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
