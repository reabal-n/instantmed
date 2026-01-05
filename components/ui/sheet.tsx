"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalProps as HeroModalProps,
} from "@heroui/react"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SheetProps extends Omit<HeroModalProps, "children" | "isOpen" | "onClose"> {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "top" | "right" | "bottom" | "left"
}

const placementMap: Record<string, HeroModalProps["placement"]> = {
  top: "top",
  right: "center",
  bottom: "bottom",
  left: "center",
}

function Sheet({
  open,
  onOpenChange,
  children,
  side = "right",
  ...props
}: SheetProps) {
  return (
    <HeroModal
      isOpen={open}
      onClose={() => onOpenChange?.(false)}
      placement={placementMap[side]}
      scrollBehavior="inside"
      classNames={{
        backdrop: "bg-black/80 backdrop-blur-sm",
        base: "bg-background border border-default-100",
        header: "border-b border-default-100",
        footer: "border-t border-default-100",
      }}
      {...props}
    >
      {children}
    </HeroModal>
  )
}

function SheetTrigger({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function SheetClose({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className="group absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg outline-offset-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none"
      {...props}
    >
      {children || (
        <>
          <XIcon className="size-4 opacity-60 transition-opacity group-hover:opacity-100" />
          <span className="sr-only">Close</span>
        </>
      )}
    </button>
  )
}

function SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SheetOverlay({ className }: { className?: string }) {
  return null // Handled by HeroUI Modal
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof ModalContent> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <ModalContent
      className={cn(
        "flex flex-col gap-4 bg-background shadow-lg",
        side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
        side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        side === "top" && "inset-x-0 top-0 h-auto border-b",
        side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
        className
      )}
      {...props}
    >
      {children}
    </ModalContent>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalHeader
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalFooter
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-default-500 text-sm", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
