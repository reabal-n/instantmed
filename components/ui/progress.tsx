"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  value?: number
}

function Progress({
  className,
  value = 0,
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        // Glass track
        "bg-white/50 dark:bg-white/10 backdrop-blur-sm",
        "border border-white/30 dark:border-white/10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-all duration-300",
          // Gradient indicator with glow
          "bg-gradient-to-r from-primary via-primary to-blue-500",
          "shadow-[0_0_20px_rgb(59,130,246,0.4)]"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
