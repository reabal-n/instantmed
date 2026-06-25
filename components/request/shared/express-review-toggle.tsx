"use client"

import { Clock } from "lucide-react"

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
 * Express review opt-in. Compliant: describes queue priority, never an SLA or
 * turnaround promise.
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
          ? "border-primary/30 bg-primary/[0.035] shadow-sm shadow-primary/[0.04]"
          : "border-border/50 bg-muted/25 hover:border-border/80 dark:bg-card/70",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground",
          )}
          aria-hidden
        >
          <Clock className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Priority review{" "}
            <span className="font-normal text-muted-foreground">· +{PRICING_DISPLAY.PRIORITY_FEE}</span>
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            Moves this request ahead of standard review. No time guarantee.
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
