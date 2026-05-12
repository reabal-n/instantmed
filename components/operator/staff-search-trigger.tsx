"use client"

import { Search } from "lucide-react"

import { openStaffPalette } from "@/components/operator/staff-command-palette"
import { cn } from "@/lib/utils"

interface StaffSearchTriggerProps {
  className?: string
  /** Compact (icon-only on mobile, text on desktop) vs full (always shows text). */
  compact?: boolean
}

/**
 * Search-bar style trigger for the global staff command palette.
 *
 * Replaces the "Staff palette" outline button in the header. Reads as a
 * search input (Linear/Vercel pattern): muted search icon, placeholder
 * text, and a right-aligned `⌘K` kbd badge. Single click opens the
 * palette; the global Cmd+K shortcut does the same. Width keeps headers
 * scannable on small screens by collapsing to icon-only.
 */
export function StaffSearchTrigger({ className, compact = false }: StaffSearchTriggerProps) {
  return (
    <button
      type="button"
      onClick={openStaffPalette}
      aria-label="Open command palette (Cmd+K)"
      className={cn(
        "group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors duration-150",
        "hover:border-primary/40 hover:bg-muted/40 hover:text-foreground",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
        compact ? "w-auto sm:w-56" : "w-56",
        className,
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      <span className={cn("flex-1 truncate", compact && "hidden sm:inline")}>
        Search or jump to
      </span>
      <kbd
        className={cn(
          "ml-auto inline-flex h-5 items-center rounded border border-border/60 bg-muted/40 px-1.5 font-sans text-[10px] font-semibold tabular-nums text-muted-foreground/80",
          compact && "hidden sm:inline-flex",
        )}
      >
        ⌘K
      </kbd>
    </button>
  )
}
