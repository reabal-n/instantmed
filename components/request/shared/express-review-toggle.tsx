"use client"

import { Switch } from "@/components/ui/switch"
import { PRICING_DISPLAY } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface ExpressReviewToggleProps {
  checked: boolean
  className?: string
  id: string
  onCheckedChange: (checked: boolean) => void
  onOptIn?: () => void
}

export function ExpressReviewToggle({
  checked,
  className,
  id,
  onCheckedChange,
  onOptIn,
}: ExpressReviewToggleProps) {
  return (
    <Switch
      id={id}
      size="sm"
      checked={checked}
      onCheckedChange={(next) => {
        onCheckedChange(next)
        if (next) onOptIn?.()
      }}
      aria-label={checked ? "Disable express review" : "Enable express review"}
      className={cn(
        "inline-flex h-8 w-fit max-w-full flex-row-reverse gap-1.5 rounded-full border px-2 shadow-sm shadow-primary/[0.03]",
        "transition-[background-color,border-color,box-shadow] duration-200",
        checked
          ? "border-primary/35 bg-primary/[0.05] text-primary"
          : "border-border/50 bg-white text-muted-foreground hover:border-border/70 dark:bg-card",
        className,
      )}
      childrenClassName="flex items-baseline gap-1 text-[11px] font-medium text-inherit"
    >
      <span>Express</span>
      <span className="text-[10px] font-medium text-muted-foreground">
        +{PRICING_DISPLAY.PRIORITY_FEE}
      </span>
    </Switch>
  )
}
