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
        base: "bg-foreground text-background",
        content: "bg-foreground text-background rounded-md px-3 py-1.5 text-xs",
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
  side,
  ...props
}: TooltipContentProps) {
  // Note: HeroUI handles placement on the Tooltip component, not the content
  // The side prop is accepted for API compatibility but placement should be set on Tooltip
  return <div {...props}>{children}</div>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
