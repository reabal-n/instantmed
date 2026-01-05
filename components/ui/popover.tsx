"use client"

import * as React from "react"
import {
  Popover as HeroPopover,
  PopoverTrigger,
  PopoverContent,
  type PopoverProps as HeroPopoverProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface PopoverProps extends HeroPopoverProps {
  children?: React.ReactNode
}

function Popover({
  children,
  ...props
}: PopoverProps) {
  return (
    <HeroPopover
      placement="bottom"
      showArrow
      backdrop="blur"
      classNames={{
        content: "bg-background border border-default-100",
      }}
      {...props}
    >
      {children}
    </HeroPopover>
  )
}

function PopoverAnchor({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
