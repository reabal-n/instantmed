"use client"

import * as React from "react"
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

function TooltipTrigger({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function TooltipContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
