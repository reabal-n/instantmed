"use client"

import { cn } from "@/lib/utils"

type QuickFilterChipProps = {
  label: string
  active: boolean
  onClick: () => void
  count?: number
  className?: string
}

/**
 * Toggle chip used in the FilterBar for quick filters like Express,
 * Stale > 4h, Mine, Failed payment, Awaiting script. Uses --primary for
 * the active state (system blue), never brand coral.
 */
export function QuickFilterChip({
  label,
  active,
  onClick,
  count,
  className,
}: QuickFilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border",
        className,
      )}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={cn(
            "tabular-nums text-[10px]",
            active ? "text-primary/80" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
