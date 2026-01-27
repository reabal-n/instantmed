"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  useDisclosure,
  type ModalProps as HeroModalProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

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
      // Soft Pop Glass styling
      classNames={{
        // Glass backdrop
        backdrop: cn(
          "bg-black/40",
          "backdrop-blur-sm",
        ),
        // Elevated glass wrapper
        wrapper: "z-50",
      }}
      // Spring physics motion (Linear style)
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 200,
              damping: 30,
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: "easeOut",
            },
          },
        },
      }}
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.cloneElement requires any for props spread
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

function DialogOverlay({ className: _className }: { className?: string }) {
  return null // Handled by HeroUI Modal
}

function DialogContent({
  className,
  children,
  showCloseButton: _showCloseButton = true,
  ...props
}: React.ComponentProps<typeof ModalContent> & {
  showCloseButton?: boolean
}) {
  return (
    <ModalContent
      className={cn(
        // Clean surface
        "bg-white dark:bg-slate-900",
        "border border-border",
        // Restrained radius
        "rounded-xl",
        // Subtle shadow
        "shadow-xl",
        // Mobile optimizations
        "max-h-[90vh] overflow-y-auto",
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
      className={cn(
        "flex flex-col gap-2 text-center sm:text-left",
        "border-b border-border",
        "pb-4",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalFooter
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "border-t border-border",
        "pt-4",
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
      className={cn("text-muted-foreground text-sm", className)}
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
