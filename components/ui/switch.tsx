"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    "checked" | "defaultChecked" | "onCheckedChange"
  > {
  // Support shadcn/ui API
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  // Legacy API compatibility
  isSelected?: boolean
  defaultSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
  /** Label text rendered next to the switch */
  children?: React.ReactNode
}

function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  isSelected,
  defaultSelected,
  onValueChange,
  children,
  ...props
}: SwitchProps) {
  // Merge dual APIs: isSelected/onValueChange take precedence if both provided
  const resolvedChecked = isSelected ?? checked
  const resolvedDefault = defaultSelected ?? defaultChecked
  const resolvedOnChange = onValueChange ?? onCheckedChange

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 cursor-pointer select-none",
        "transition-transform duration-150",
        props.disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <SwitchPrimitive.Root
        checked={resolvedChecked}
        defaultChecked={resolvedDefault}
        onCheckedChange={resolvedOnChange}
        className={cn(
          // iOS-style sizing
          "relative inline-flex h-[32px] w-[52px] shrink-0",
          "cursor-pointer rounded-full",
          // Neutral off state
          "bg-slate-200/80 dark:bg-white/10",
          "border border-slate-300/30 dark:border-white/20",
          // Selected state - soft sage green
          "data-[state=checked]:bg-[#6BBF8A]",
          "data-[state=checked]:border-[#6BBF8A]/40",
          // Gentle transition
          "transition-all duration-300 ease-out",
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            // iOS-style thumb
            "pointer-events-none block h-[26px] w-[26px] rounded-full",
            // Clean white thumb with subtle shadow
            "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]",
            // Slide animation
            "translate-x-0.5 data-[state=checked]:translate-x-[22px]",
            // Gentle transition
            "transition-all duration-300 ease-out",
            // Vertical centering
            "mt-[2px]"
          )}
        />
      </SwitchPrimitive.Root>
      {children && (
        <span className="text-sm font-medium text-foreground leading-none">
          {children}
        </span>
      )}
    </label>
  )
}

export { Switch }
