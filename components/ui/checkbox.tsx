"use client"

import * as React from "react"
import { Checkbox as HeroCheckbox, type CheckboxProps as HeroCheckboxProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends HeroCheckboxProps {}

function Checkbox({
  className,
  ...props
}: CheckboxProps) {
  return (
    <HeroCheckbox
      radius="md"
      classNames={{
        base: cn("max-w-fit", className),
        label: "text-foreground",
      }}
      {...props}
    />
  )
}

export { Checkbox }
