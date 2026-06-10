"use client"

import { Zap } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { PRICING_DISPLAY } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface ExpressReviewToggleProps {
  checked: boolean
  className?: string
  id: string
  onCheckedChange: (checked: boolean) => void
  onOptIn?: () => void
  onOptOut?: () => void
}

/**
 * Express review opt-in, rendered as a prominent full-width option row above the
 * pay button (was an 11px pill in the price summary at 1.9% attach — 2026-06-11
 * review). Compliant: describes queue priority, never an SLA/turnaround promise.
 * Fires opt-in AND opt-out so decline is measurable.
 */
export function ExpressReviewToggle({
  checked,
  className,
  id,
  onCheckedChange,
  onOptIn,
  onOptOut,
}: ExpressReviewToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl border px-3.5 py-3",
        "transition-[background-color,border-color,box-shadow] duration-200",
        checked
          ? "border-primary/40 bg-primary/[0.05] shadow-sm shadow-primary/[0.06]"
          : "border-border/60 bg-white hover:border-border/80 dark:bg-card",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <Zap className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Express review{" "}
            <span className="font-normal text-muted-foreground">· +{PRICING_DISPLAY.PRIORITY_FEE}</span>
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            Your request is placed ahead of the standard queue.
          </p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(next) => {
          onCheckedChange(next)
          if (next) onOptIn?.()
          else onOptOut?.()
        }}
        aria-label={checked ? "Disable express review" : "Enable express review"}
      />
    </label>
  )
}
