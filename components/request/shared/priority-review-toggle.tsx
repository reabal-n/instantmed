"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Clock } from "lucide-react"

import { PRICING_DISPLAY } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface PriorityReviewToggleProps {
  checked: boolean
  className?: string
  id: string
  onCheckedChange: (checked: boolean) => void
  onOptIn?: () => void
  onOptOut?: () => void
}

/**
 * Priority review opt-in. Compliant: describes queue priority, never an SLA or
 * turnaround promise.
 * Fires opt-in AND opt-out so decline is measurable.
 */
export function PriorityReviewToggle({
  checked,
  className,
  id,
  onCheckedChange,
  onOptIn,
  onOptOut,
}: PriorityReviewToggleProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      type="button"
      checked={checked}
      onCheckedChange={(next) => {
        onCheckedChange(next)
        if (next) onOptIn?.()
        else onOptOut?.()
      }}
      aria-label={checked ? "Disable priority review" : "Enable priority review"}
      className={cn(
        // Quiet, understated row — not an upsell card. No icon tile, no boxed
        // background, smaller switch. Reads as an optional add-on, not a hard sell.
        "flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-1 py-1 text-left",
        "transition-colors hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm text-foreground">
            Priority review{" "}
            <span className="text-muted-foreground">+{PRICING_DISPLAY.PRIORITY_FEE}</span>
          </span>
          <span className="block text-xs leading-snug text-muted-foreground">
            Moves ahead of standard review. No time guarantee.
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-success" : "bg-muted-foreground/25",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none mt-0.5 block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow-sm",
            "transition-transform duration-200 ease-out data-[state=checked]:translate-x-[18px]",
          )}
        />
      </span>
    </SwitchPrimitive.Root>
  )
}
