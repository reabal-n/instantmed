"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw, Volume2, VolumeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

export interface QueueFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  soundMuted: boolean
  onToggleSound: () => void
  onRefresh: () => void
  statusFilter: "all" | "review" | "pending_info" | "scripts"
  onStatusFilterChange: (value: "all" | "review" | "pending_info" | "scripts") => void
  intakes: IntakeWithPatient[]
  filteredCount: number
  isStale: boolean
  isReconnecting: boolean
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
}: QueueFiltersProps) {
  return (
    <>
      {/* Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-testid="queue-header">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-foreground font-sans" data-testid="queue-heading">
            {filteredCount} case{filteredCount !== 1 ? "s" : ""} waiting
          </h2>
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
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full sm:w-56 h-9 text-sm"
            startContent={<Search className="h-3.5 w-3.5 text-muted-foreground" />}
          />
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
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/50 bg-muted/30 rounded border border-border/30">
            j/k
          </kbd>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {([
          { key: "all", label: "All" },
          { key: "review", label: "Needs Review" },
          { key: "pending_info", label: "Pending Info" },
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
