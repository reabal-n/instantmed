"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent as HeroModalContent,
  ModalHeader as HeroModalHeader,
  ModalFooter as HeroModalFooter,
  useDisclosure,
  type ModalProps as HeroModalProps,
} from "@heroui/react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ModalProps extends Omit<HeroModalProps, "children" | "isOpen" | "onClose"> {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const sizeMap: Record<string, HeroModalProps["size"]> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  full: "full",
}

function Modal({
  open,
  onOpenChange,
  children,
  size = "md",
  ...props
}: ModalProps) {
  return (
    <HeroModal
      isOpen={open}
      onClose={() => onOpenChange?.(false)}
      size={typeof size === "string" ? sizeMap[size] : size}
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
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

function ModalTrigger({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function ModalPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function ModalClose({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      {...props}
    >
      {children || (
        <>
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </>
      )}
    </button>
  )
}

function ModalOverlay({ className: _className }: { className?: string }) {
  return null // Handled by HeroUI Modal
}

function ModalContent({
  className,
  children,
  showClose = true,
  size: _size = "md",
  ...props
}: Omit<React.ComponentProps<typeof HeroModalContent>, "size"> & {
  showClose?: boolean
  size?: "sm" | "md" | "lg" | "xl" | "full"
}) {
  return (
    <HeroModalContent
      className={cn("bg-background border border-default-100", className)}
      {...props}
    >
      {children as React.ReactNode}
      {showClose && <ModalClose />}
    </HeroModalContent>
  )
}

function ModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <HeroModalHeader
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
}

function ModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <HeroModalFooter
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
}

function ModalTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function ModalDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-default-500", className)}
      {...props}
    />
  )
}

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
  useDisclosure,
}
