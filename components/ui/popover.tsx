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
        base: "before:bg-white/90 dark:before:bg-gray-900/90",
        content: cn(
          // Glass surface
          "bg-white/85 dark:bg-gray-900/80 backdrop-blur-xl",
          // Border
          "border border-white/50 dark:border-white/15",
          // Shape
          "rounded-2xl",
          // Glow shadow
          "shadow-[0_8px_30px_rgb(59,130,246,0.15)] dark:shadow-[0_8px_30px_rgb(139,92,246,0.15)]"
        ),
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
