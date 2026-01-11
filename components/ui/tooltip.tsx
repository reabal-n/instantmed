"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  Tooltip as HeroTooltip,
  type TooltipProps as HeroTooltipProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TooltipProps extends HeroTooltipProps {
  children?: React.ReactNode
}

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({
  children,
  content,
  ...props
}: TooltipProps) {
  return (
    <HeroTooltip
      content={content}
      placement="top"
      showArrow
      classNames={{
        base: "before:bg-white/90 dark:before:bg-slate-900/90",
        content: cn(
          // Glass surface
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
          // Border
          "border border-white/50 dark:border-white/15",
          // Shape
          "rounded-xl px-3 py-2 text-xs",
          // Glow shadow
          "shadow-[0_4px_20px_rgb(59,130,246,0.15)] dark:shadow-[0_4px_20px_rgb(139,92,246,0.15)]",
          // Text
          "text-foreground"
        ),
      }}
      {...props}
    >
      {children}
    </HeroTooltip>
  )
}

interface TooltipTriggerProps extends React.ComponentProps<"div"> {
  asChild?: boolean
}

function TooltipTrigger({
  children,
  asChild,
  ...props
}: TooltipTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return <Slot {...props}>{children}</Slot>
  }
  return <div {...props}>{children}</div>
}

interface TooltipContentProps extends React.ComponentProps<"div"> {
  side?: "top" | "right" | "bottom" | "left"
}

function TooltipContent({
  children,
  side: _side,
  ...props
}: TooltipContentProps) {
  // Note: HeroUI handles placement on the Tooltip component, not the content
  // The side prop is accepted for API compatibility but placement should be set on Tooltip
  return <div {...props}>{children}</div>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
