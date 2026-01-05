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
        base: cn("max-w-fit", className),
        wrapper: "group-data-[selected=true]:bg-primary",
      }}
      {...props}
    />
  )
}

export { Switch }
