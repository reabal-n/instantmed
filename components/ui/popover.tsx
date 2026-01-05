"use client"

import * as React from "react"
import {
  Popover as HeroPopover,
  PopoverTrigger,
  PopoverContent,
  type PopoverProps as HeroPopoverProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface PopoverProps extends Omit<HeroPopoverProps, "isOpen" | "onOpenChange" | "children"> {
  children?: React.ReactNode
  // Support shadcn/ui API
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Support HeroUI API
  isOpen?: boolean
}

function Popover({
  children,
  open,
  onOpenChange,
  isOpen,
  ...props
}: PopoverProps) {
  // Map shadcn/ui API to HeroUI API
  const heroIsOpen = isOpen ?? open
  const heroOnOpenChange = onOpenChange

  return (
    <HeroPopover
      placement="bottom"
      showArrow
      backdrop="blur"
      isOpen={heroIsOpen}
      onOpenChange={heroOnOpenChange}
      classNames={{
        content: "bg-background border border-default-100",
      }}
      {...props}
    >
      {React.Children.toArray(children)}
    </HeroPopover>
  )
}

function PopoverAnchor({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Wrap PopoverContent to accept side and onPointerDownOutside props for API compatibility
const WrappedPopoverContent = React.forwardRef<
  HTMLDivElement,
  Omit<React.ComponentProps<typeof PopoverContent>, "ref"> & { 
    side?: "top" | "right" | "bottom" | "left"
    onPointerDownOutside?: (event: PointerEvent) => void
  }
>(({ side, onPointerDownOutside, ...props }, ref) => {
  // Note: HeroUI handles placement on the Popover component, not the content
  // The side and onPointerDownOutside props are accepted for API compatibility
  return <PopoverContent {...props} />
})

WrappedPopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, WrappedPopoverContent as PopoverContent, PopoverAnchor }
