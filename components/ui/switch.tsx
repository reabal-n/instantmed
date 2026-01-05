"use client"

import * as React from "react"
import { Switch as HeroSwitch, type SwitchProps as HeroSwitchProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends HeroSwitchProps {}

function Switch({
  className,
  ...props
}: SwitchProps) {
  return (
    <HeroSwitch
      radius="full"
      classNames={{
        base: cn("max-w-fit", className),
        wrapper: "group-data-[selected=true]:bg-primary",
      }}
      {...props}
    />
  )
}

export { Switch }
