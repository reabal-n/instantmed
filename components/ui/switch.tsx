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
          // Smooth transition (removed active:scale-95 to avoid double-scale with HeroUI)
          "transition-transform duration-150",
          className
        ),
        wrapper: cn(
          // iOS-style sizing
          "w-[52px] h-[32px]",
          // Neutral off state - calm, muted
          "bg-slate-200/80 dark:bg-slate-700/60",
          "border border-slate-300/30 dark:border-slate-600/30",
          // Selected state - soft sage green confirmation, no glow
          "group-data-[selected=true]:bg-[#6BBF8A]",
          "group-data-[selected=true]:border-[#6BBF8A]/40",
          // Gentle transition
          "transition-all duration-300 ease-out"
        ),
        thumb: cn(
          // iOS-style thumb
          "w-[26px] h-[26px]",
          // Clean white thumb with subtle shadow
          "bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]",
          // Explicit thumb translation for slide effect
          "translate-x-0.5",
          "group-data-[selected=true]:translate-x-[22px]",
          // Gentle transition
          "transition-all duration-300 ease-out"
        ),
        startContent: "hidden",
        endContent: "hidden",
      }}
      {...props}
    />
  )
}

export { Switch }
