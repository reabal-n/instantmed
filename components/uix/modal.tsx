"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

/**
 * UIX Modal - Radix Dialog with glassmorphism design
 * Compatible with existing dialog patterns
 */

function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = React.useState(initial)
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: setIsOpen,
  }
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
  backdrop?: "transparent" | "opaque" | "blur"
  placement?: "auto" | "top" | "center" | "bottom"
  scrollBehavior?: "inside" | "outside"
  className?: string
}

const sizeClasses: Record<string, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-6xl",
  "4xl": "max-w-7xl",
  "5xl": "max-w-[80rem]",
  full: "max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
}

function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  className,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50",
            "bg-black/50 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2",
            sizeClasses[size] || sizeClasses.md,
            // Surface
            "bg-background/95 backdrop-blur-xl border border-default-100 shadow-2xl",
            // Shape
            "rounded-2xl",
            // Animation
            "duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        "border-b border-default-100",
        className
      )}
      {...props}
    />
  )
}
ModalHeader.displayName = "ModalHeader"

function ModalBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-6 overflow-y-auto", className)}
      {...props}
    />
  )
}
ModalBody.displayName = "ModalBody"

function ModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6",
        "border-t border-default-100",
        className
      )}
      {...props}
    />
  )
}
ModalFooter.displayName = "ModalFooter"

export { Modal, ModalHeader, ModalBody, ModalFooter, useDisclosure }
export { Modal as UIXModal }
