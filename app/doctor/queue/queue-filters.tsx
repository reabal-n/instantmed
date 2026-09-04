"use client"

import { ArrowRight, Keyboard, RefreshCw, Search, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import {
  getQueuePressureState,
  QUEUE_WAIT_TARGET_MINUTES,
  type QueuePressureSeverity,
} from "@/lib/doctor/queue-pressure"
import type { QueueStatusCounts } from "@/lib/doctor/queue-utils"
import { isEditableOrInteractiveKeyboardTarget } from "@/lib/hooks/use-doctor-shortcuts"
import { cn } from "@/lib/utils"

import type { QueueSearchState } from "./types"

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
  onOpenSingleMatch?: () => void
  onOpenOldest?: () => void
  hasOpenCase?: boolean
  statusFilter: QueueStatusFilter
  onStatusFilterChange: (value: QueueStatusFilter) => void
  statusCounts?: QueueStatusCounts | null
  filteredCount: number
  searchMatchCount?: number | null
  searchState?: QueueSearchState
  isSearchPending?: boolean
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
}

export function QueueFilters({
  searchQuery,
  onSearchChange,
  onRefresh,
  onOpenSingleMatch,
  onOpenOldest,
  hasOpenCase = false,
  statusFilter,
  onStatusFilterChange,
  statusCounts = null,
  filteredCount,
  searchMatchCount = null,
  searchState = "idle",
  isSearchPending = false,
  isStale,
  isReconnecting,
  isRefreshing = false,
  compactShell = false,
  oldestWaitingMinutes,
  showOldestWaiting = true,
}: QueueFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const manualRefreshRequestedRef = useRef(false)
  const manualRefreshStartedRef = useRef(false)
  const refreshReceiptTimerRef = useRef<number | null>(null)
  const [showRefreshReceipt, setShowRefreshReceipt] = useState(false)
  const hasActiveSearch = searchQuery.trim().length > 0
  const matchLabel = isSearchPending
    ? "Searching…"
    : searchState === "unavailable"
      ? "Search unavailable"
      : searchState === "too_broad"
        ? "Narrow your search"
        : typeof searchMatchCount === "number"
          ? `${searchMatchCount} ${searchMatchCount === 1 ? "match" : "matches"}`
          : "Match count unavailable"
  const pressure = getQueuePressureState(oldestWaitingMinutes, QUEUE_WAIT_TARGET_MINUTES)
  const pressureClass = pressureClasses[pressure.severity]
  const openOldest = onOpenOldest ?? onOpenSingleMatch
  const showNextCaseAction = compactShell
    && filteredCount > 1
    && Boolean(openOldest)
    && !hasOpenCase
    && !isSearchPending

  // `/` key focuses the search input (standard queue shortcut)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return
      if (isEditableOrInteractiveKeyboardTarget(e.target)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!manualRefreshRequestedRef.current) return
    if (isRefreshing) {
      manualRefreshStartedRef.current = true
      return
    }
    if (!manualRefreshStartedRef.current) return

    manualRefreshRequestedRef.current = false
    manualRefreshStartedRef.current = false
    setShowRefreshReceipt(true)
    if (refreshReceiptTimerRef.current) {
      window.clearTimeout(refreshReceiptTimerRef.current)
    }
    refreshReceiptTimerRef.current = window.setTimeout(() => {
      setShowRefreshReceipt(false)
      refreshReceiptTimerRef.current = null
    }, 3_000)
  }, [isRefreshing])

  useEffect(() => () => {
    if (refreshReceiptTimerRef.current) {
      window.clearTimeout(refreshReceiptTimerRef.current)
    }
  }, [])

  const handleManualRefresh = () => {
    manualRefreshRequestedRef.current = true
    manualRefreshStartedRef.current = false
    setShowRefreshReceipt(false)
    onRefresh()
  }

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
        </div>
        <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {showNextCaseAction ? (
              <Button
                type="button"
                size="sm"
                className="h-11 shrink-0 bg-primary px-3 text-xs text-primary-foreground shadow-sm shadow-primary/[0.12] hover:bg-primary/90 sm:h-8"
                onClick={openOldest}
                data-open-next-case
              >
                Open next case
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            ) : null}
            <div className="relative flex flex-1 items-center sm:flex-none">
              <Input
                ref={searchRef}
                aria-label="Search active requests"
                aria-keyshortcuts="/"
                placeholder={compactShell ? "Search name, email or request" : "Search… or / to focus"}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={96}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return
                  if (!onOpenSingleMatch || filteredCount !== 1 || isSearchPending) return
                  event.preventDefault()
                  onOpenSingleMatch()
                }}
                className={cn(
                  "w-full",
                  "[&>div]:h-11 [&>div]:min-h-0 [&>div]:border-slate-300 [&>div]:bg-white [&>div]:shadow-sm [&>div]:shadow-primary/[0.03] [&>div]:focus-within:border-primary/45 [&>div]:focus-within:ring-primary/20 dark:[&>div]:bg-card sm:[&>div]:h-9",
                  "[&_input]:h-11 [&_input]:py-0 [&_input]:text-base [&_input]:leading-11 [&_input]:placeholder:text-slate-500 sm:[&_input]:h-9 sm:[&_input]:text-sm sm:[&_input]:leading-9",
                  compactShell ? "sm:w-72" : "sm:w-56",
                )}
                inputClassName="queue-search-input"
                startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
                endContent={
                  searchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear patient search"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10"
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hidden h-8 w-8 shrink-0 text-muted-foreground sm:inline-flex"
                  aria-label="Keyboard shortcuts"
                  title="Keyboard shortcuts"
                >
                  <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-64 rounded-xl p-3">
                <p className="text-xs font-semibold text-foreground">Keyboard shortcuts</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  <dt><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">/</kbd></dt>
                  <dd>Focus search</dd>
                  <dt className="flex gap-1"><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">J</kbd><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">K</kbd><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">↑↓</kbd></dt>
                  <dd>Move selection</dd>
                  <dt><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">Enter</kbd></dt>
                  <dd>Open selected</dd>
                  <dt><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">A</kbd></dt>
                  <dd>Approve or open review</dd>
                  <dt><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">D</kbd></dt>
                  <dd>Open decline dialog</dd>
                  <dt><kbd className="rounded border border-border/70 bg-muted/45 px-1.5 py-0.5 font-mono text-[10px] text-foreground">Esc</kbd></dt>
                  <dd>Clear selection</dd>
                </dl>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 sm:h-8 sm:w-8"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title={isRefreshing ? "Refreshing queue" : "Refresh queue"}
              aria-label={isRefreshing ? "Refreshing queue" : "Refresh queue"}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>
          {(hasActiveSearch || showRefreshReceipt) && (
            <p
              className="pr-10 text-[11px] leading-none text-muted-foreground"
              aria-live="polite"
              data-queue-refresh-receipt={showRefreshReceipt ? "complete" : undefined}
            >
              {hasActiveSearch ? matchLabel : null}
              {hasActiveSearch && showRefreshReceipt ? " · " : null}
              {showRefreshReceipt ? "Queue updated just now" : null}
            </p>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div
        role="group"
        aria-label="Filter queue by status"
        className="grid w-full grid-cols-4 gap-1 rounded-lg bg-muted/25 p-1 sm:flex sm:w-fit sm:flex-wrap sm:gap-1.5"
      >
        {([
          { key: "all", mobileLabel: "All", desktopLabel: "All" },
          { key: "review", mobileLabel: "Review", desktopLabel: "Needs review" },
          { key: "pending_info", mobileLabel: "Info", desktopLabel: "Needs info" },
          { key: "scripts", mobileLabel: "Scripts", desktopLabel: "Scripts to write" },
        ] as const).map((tab) => {
          const count = statusCounts?.[tab.key] ?? null
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={statusFilter === tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={cn(
                "min-h-11 min-w-0 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-[background-color,color,box-shadow] duration-150 ease-in-out sm:min-h-8 sm:shrink-0 sm:px-3.5 sm:text-xs",
                statusFilter === tab.key
                  ? "bg-white text-foreground shadow-sm shadow-primary/[0.03] dark:bg-card"
                  : "text-slate-600 hover:bg-card/60 hover:text-foreground dark:text-muted-foreground"
              )}
            >
              {compactShell && tab.mobileLabel !== tab.desktopLabel ? (
                <>
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.desktopLabel}</span>
                </>
              ) : tab.desktopLabel}
              <span
                className={cn("ml-1 tabular-nums sm:ml-1.5", count === 0 && "text-muted-foreground")}
                aria-label={count === null ? "count unavailable" : undefined}
              >
                ({count ?? "—"})
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
