"use client"

import * as React from "react"
import { Divider, type DividerProps as HeroDividerProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends HeroDividerProps {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <Divider
      orientation={orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
