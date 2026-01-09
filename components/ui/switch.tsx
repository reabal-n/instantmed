"use client"

import * as React from "react"
import { Switch as HeroSwitch, type SwitchProps as HeroSwitchProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<HeroSwitchProps, "isSelected" | "onValueChange" | "defaultSelected"> {
  // Support shadcn/ui API
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  // Support HeroUI API
  isSelected?: boolean
  defaultSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
}

function Switch({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  isSelected,
  defaultSelected,
  onValueChange,
  ...props
}: SwitchProps) {
  // Map shadcn/ui API to HeroUI API
  const heroIsSelected = isSelected ?? checked
  const heroDefaultSelected = defaultSelected ?? defaultChecked
  const heroOnValueChange = onValueChange ?? onCheckedChange

  return (
    <HeroSwitch
      radius="full"
      isSelected={heroIsSelected}
      defaultSelected={heroDefaultSelected}
      onValueChange={heroOnValueChange}
      classNames={{
        base: cn(
          "max-w-fit",
          // Scale effect on press for tactile feel
          "active:scale-95",
          "transition-transform duration-150",
          className
        ),
        wrapper: cn(
          // Larger size for iOS feel
          "w-[52px] h-[32px]",
          // Base glass track
          "bg-slate-200 dark:bg-slate-700",
          "border border-slate-300/50 dark:border-slate-600/50",
          // Selected state with vibrant color
          "group-data-[selected=true]:bg-gradient-to-r group-data-[selected=true]:from-primary group-data-[selected=true]:to-blue-500",
          "group-data-[selected=true]:shadow-[0_0_16px_rgb(59,130,246,0.35)]",
          "group-data-[selected=true]:border-primary/30",
          // Snappy spring transition
          "transition-all duration-200 ease-out"
        ),
        thumb: cn(
          // Larger thumb for iOS feel
          "w-[26px] h-[26px]",
          // Glass thumb with depth
          "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)]",
          // Selected glow
          "group-data-[selected=true]:shadow-[0_2px_8px_rgba(0,0,0,0.15),0_0_12px_rgba(255,255,255,0.4)]",
          // Snappy spring transition for thumb movement
          "transition-all duration-200 ease-out"
        ),
        startContent: "hidden",
        endContent: "hidden",
      }}
      {...props}
    />
  )
}

export { Switch }
