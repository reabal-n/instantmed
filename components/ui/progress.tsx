"use client"

import * as React from "react"
import { Progress as HeroProgress, type ProgressProps as HeroProgressProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface ProgressProps extends HeroProgressProps {
  value?: number
}

function Progress({
  className,
  value,
  ...props
}: ProgressProps) {
  return (
    <HeroProgress
      value={value}
      color="primary"
      radius="full"
      className={cn("w-full", className)}
      classNames={{
        track: "bg-primary/20",
        indicator: "bg-primary",
      }}
      {...props}
    />
  )
}

export { Progress }
