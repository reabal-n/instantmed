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
        "flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl border px-3.5 py-3",
        "transition-[background-color,border-color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        checked
          ? "border-primary/30 bg-primary/[0.035] shadow-sm shadow-primary/[0.04]"
          : "border-border/50 bg-muted/25 hover:border-border/80 dark:bg-card/70",
        className,
      )}
    >
      <span className="flex min-w-0 items-start gap-2.5 text-left">
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
            checked ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground",
          )}
          aria-hidden
        >
          <Clock className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">
            Priority review{" "}
            <span className="font-normal text-muted-foreground">· +{PRICING_DISPLAY.PRIORITY_FEE}</span>
          </span>
          <span className="block text-xs leading-snug text-muted-foreground">
            Moves this request ahead of standard review. No time guarantee.
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-[32px] w-[52px] shrink-0 rounded-full border transition-[background-color,border-color]",
          checked
            ? "border-success/40 bg-success"
            : "border-border/30 bg-muted/80 dark:border-white/20 dark:bg-white/10",
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "pointer-events-none mt-[2px] block h-[26px] w-[26px] translate-x-0.5 rounded-full bg-white shadow-sm shadow-primary/[0.12]",
            "transition-[transform,box-shadow] duration-300 ease-out data-[state=checked]:translate-x-[22px]",
          )}
        />
      </span>
    </SwitchPrimitive.Root>
  )
}
