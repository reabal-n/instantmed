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
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AlertDialogProps extends Omit<HeroModalProps, "children" | "isOpen" | "onClose"> {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function AlertDialog({
  open,
  onOpenChange,
  children,
  ...props
}: AlertDialogProps) {
  return (
    <HeroModal
      isOpen={open}
      onClose={() => onOpenChange?.(false)}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      {...props}
    >
      {children}
    </HeroModal>
  )
}

function AlertDialogTrigger({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function AlertDialogOverlay({ className }: { className?: string }) {
  return null // Handled by HeroUI Modal
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ModalContent>) {
  return (
    <ModalContent
      className={cn("bg-background border border-default-100", className)}
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "bg-background border border-default-100",
        header: "border-b border-default-100",
        footer: "border-t border-default-100",
      }}
      {...props}
    >
      {children}
    </ModalContent>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <ModalHeader
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
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

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
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

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={className} {...props} />
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button variant="outline" className={className} {...props} />
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
