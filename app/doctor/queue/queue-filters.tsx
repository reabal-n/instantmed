"use client"

import { ArrowRight, HelpCircle, RefreshCw, Search, Volume2, VolumeOff } from "lucide-react"
import { useEffect, useRef } from "react"

import { KeyboardShortcutsModal } from "@/components/doctor/keyboard-shortcuts-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  lastUpdatedLabel?: string
  compactShell?: boolean
  onReviewNext?: () => void
}

const SEARCH_TOKENS = [
  { token: "risk:high", desc: "High-risk or flagged cases" },
  { token: "priority:true", desc: "Express / priority cases" },
  { token: "type:ed", desc: "Filter by service type (ed, certs, rx…)" },
  { token: "status:paid", desc: "Filter by exact status" },
  { token: "flags:true", desc: "Any red-flag cases" },
]

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
  lastUpdatedLabel,
  compactShell = false,
  onReviewNext,
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
            {compactShell ? "Clinical queue" : `${filteredCount} case${filteredCount !== 1 ? "s" : ""} waiting`}
          </h2>
          {compactShell && (
            <span className="rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {filteredCount} ready
            </span>
          )}
          {/* Live connection indicator */}
          {!isStale && !isReconnecting && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Live
            </span>
          )}
          {lastUpdatedLabel && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {isRefreshing ? "Refreshing..." : lastUpdatedLabel}
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
              Review next
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
          <div className="relative flex flex-1 items-center sm:flex-none">
            <Input
              ref={searchRef}
              placeholder={compactShell ? "Search patient, ref, Medicare, email, phone" : "Search… or / to focus"}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={cn("w-full h-9 text-sm", compactShell ? "sm:w-80" : "sm:w-56")}
              startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="absolute right-2.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label="Search token help"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-72 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Smart search tokens</p>
                <div className="space-y-1.5">
                  {SEARCH_TOKENS.map(({ token, desc }) => (
                    <div key={token} className="flex items-baseline gap-2">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground shrink-0">
                        {token}
                      </code>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2.5 pt-2 border-t border-border/40">
                  Combine with a name or Medicare number.
                </p>
              </PopoverContent>
            </Popover>
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
      <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1 sm:w-fit sm:flex-wrap">
        {([
          { key: "all", label: "All" },
          { key: "review", label: compactShell ? "Review" : "Needs Review" },
          { key: "pending_info", label: compactShell ? "Info" : "Pending Info" },
          { key: "scripts", label: "Scripts" },
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
