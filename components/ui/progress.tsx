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
        base: "max-w-full",
        track: cn(
          // Glass track
          "bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm",
          "border border-white/30 dark:border-white/10"
        ),
        indicator: cn(
          // Gradient indicator with glow
          "bg-gradient-to-r from-primary via-primary to-violet-500",
          "shadow-[0_0_20px_rgb(59,130,246,0.4)]"
        ),
      }}
      {...props}
    />
  )
}

export { Progress }
