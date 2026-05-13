"use client"

import { ArrowRight, RefreshCw, Search, Volume2, VolumeOff } from "lucide-react"
import { useEffect, useRef } from "react"

import { KeyboardShortcutsModal } from "@/components/doctor/keyboard-shortcuts-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { QueueStatusFilter } from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

export interface QueueFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  soundMuted: boolean
  onToggleSound: () => void
  onRefresh: () => void
  statusFilter: QueueStatusFilter
  onStatusFilterChange: (value: QueueStatusFilter) => void
  intakes: IntakeWithPatient[]
  filteredCount: number
  isStale: boolean
  isReconnecting: boolean
  isRefreshing?: boolean
  /** No longer rendered (kept on the type for back-compat). */
  lastUpdatedLabel?: string
  compactShell?: boolean
  onReviewNext?: () => void
  /**
   * Live median wait in minutes, computed from `recentlyCompleted` over a
   * rolling 4-hour window. Brand spec (docs/BRAND.md §6.1). Null when
   * there's no recent data; the readout self-hides in that case.
   */
  liveMedianMinutes?: number | null
}

export function QueueFilters({
  searchQuery,
  onSearchChange,
  soundMuted,
  onToggleSound,
  onRefresh,
  statusFilter,
  onStatusFilterChange,
  intakes,
  filteredCount,
  isStale,
  isReconnecting,
  isRefreshing = false,
  // lastUpdatedLabel is no longer rendered; kept on props for back-compat.
  lastUpdatedLabel: _lastUpdatedLabel,
  compactShell = false,
  onReviewNext,
  liveMedianMinutes,
}: QueueFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null)

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-testid="queue-header">
        <div className="flex items-center gap-3">
          <h2
            className={cn(
              "font-semibold tracking-tight text-foreground font-sans",
              compactShell ? "text-base" : "text-xl",
            )}
            data-testid="queue-heading"
          >
            {compactShell ? "Review and scripts" : `${filteredCount} case${filteredCount !== 1 ? "s" : ""} waiting`}
          </h2>
          {/* Status dot only when stale/reconnecting. Healthy state is implicit; */}
          {/* the per-tab counts already say how many cases are in play. */}
          {(isStale || isReconnecting) && (
            <span className="inline-flex items-center gap-1.5 text-xs text-warning font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {isReconnecting ? "Reconnecting" : "Stale"}
            </span>
          )}
          {/* Live wait readout (Phase 10). Brand-spec signature device #1
              applied to the staff surface: median paid→reviewed minutes
              over the last 4 hours, computed client-side from
              `recentlyCompleted`. Self-hides when no recent data. */}
          {typeof liveMedianMinutes === "number" && liveMedianMinutes > 0 && (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
              title={`Median paid → reviewed over the last 4 hours: ${liveMedianMinutes} minute${liveMedianMinutes === 1 ? "" : "s"}.`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              <span className="tabular-nums">{liveMedianMinutes}m</span>
              <span className="text-muted-foreground/80">median today</span>
            </span>
          )}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {compactShell && (
            <Button
              size="sm"
              className="h-9 shrink-0 px-3 text-xs"
              onClick={onReviewNext}
              disabled={filteredCount === 0 || !onReviewNext}
            >
              Open next case
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
          <div className="relative flex flex-1 items-center sm:flex-none">
            <Input
              ref={searchRef}
              placeholder={compactShell ? "Search patients" : "Search… or / to focus"}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("w-full h-9 text-sm", compactShell ? "sm:w-72" : "sm:w-56")}
              startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </div>
          {!compactShell && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onToggleSound}
              aria-label={soundMuted ? "Unmute notifications" : "Mute notifications"}
              title={soundMuted ? "Unmute notifications" : "Mute notifications"}
            >
              {soundMuted ? <VolumeOff className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
          )}
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
          {!compactShell && (
            <KeyboardShortcutsModal
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  title="Keyboard shortcuts (?)"
                  aria-label="Show keyboard shortcuts"
                >
                  <kbd className="text-xs font-mono font-semibold">?</kbd>
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted/30 p-1 sm:w-fit sm:flex-wrap">
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
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                statusFilter === tab.key
                  ? "bg-white dark:bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 tabular-nums">({count})</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}
