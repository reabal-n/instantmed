"use client"

import * as React from "react"
import {
  Tooltip as RadixTooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

export interface TooltipProps {
  /** Tooltip content text or node */
  content?: React.ReactNode
  children: React.ReactNode
  /** Placement side */
  placement?: "top" | "right" | "bottom" | "left"
  /** Delay in ms */
  delay?: number
  /** Additional class name */
  className?: string
}

/**
 * Tooltip - HeroUI-compatible API wrapper around Radix Tooltip
 *
 * Supports the `<Tooltip content="..."><trigger /></Tooltip>` pattern
 * used throughout the app.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  if (!content) {
    return <>{children}</>
  }

  return (
    <TooltipProvider>
      <RadixTooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={placement} className={className}>
          {content}
        </TooltipContent>
      </RadixTooltip>
    </TooltipProvider>
  )
}
