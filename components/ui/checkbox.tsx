"use client"

import * as React from "react"
import { Checkbox as HeroCheckbox, type CheckboxProps as HeroCheckboxProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<HeroCheckboxProps, "isSelected" | "onValueChange"> {
  // Support shadcn/ui API
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  // Support HeroUI API
  isSelected?: boolean
  onValueChange?: (isSelected: boolean) => void
}

function Checkbox({
  className,
  checked,
  onCheckedChange,
  isSelected,
  onValueChange,
  ...props
}: CheckboxProps) {
  // Map shadcn/ui API to HeroUI API
  const heroIsSelected = isSelected ?? checked
  const heroOnValueChange = onValueChange ?? onCheckedChange

  return (
    <HeroCheckbox
      radius="md"
      isSelected={heroIsSelected}
      onValueChange={heroOnValueChange}
      classNames={{
        base: cn("max-w-fit", className),
        label: "text-foreground",
      }}
      {...props}
    />
  )
}

export { Checkbox }
