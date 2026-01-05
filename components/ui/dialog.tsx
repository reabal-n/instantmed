"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  type ModalProps as HeroModalProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"
import { FocusTrap } from "./focus-trap"

export interface DialogProps extends Omit<HeroModalProps, "children" | "isOpen" | "onClose"> {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({
  open,
  onOpenChange,
  children,
  ...props
}: DialogProps) {
  return (
    <HeroModal
      isOpen={open}
      onClose={() => onOpenChange?.(false)}
      {...props}
    >
      {children}
    </HeroModal>
  )
}

function DialogTrigger({
  children,
  asChild,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props as any)
  }
  return <button {...props}>{children}</button>
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DialogClose({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function DialogOverlay({ className }: { className?: string }) {
  return null // Handled by HeroUI Modal
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof ModalContent> & {
  showCloseButton?: boolean
}) {
  return (
    <ModalContent
      className={cn(
        "bg-background border border-default-100",
        // Mobile optimizations
        "max-h-[90vh] overflow-y-auto",
        "md:rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
    </ModalContent>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalHeader
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalFooter
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  useDisclosure,
}
