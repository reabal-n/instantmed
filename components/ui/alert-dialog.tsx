"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
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
      classNames={{
        backdrop: "bg-black/60 backdrop-blur-lg",
        base: cn(
          // Elevated glass surface
          "bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl",
          // Border
          "border border-white/60 dark:border-white/20",
          // Shape
          "rounded-3xl",
          // Glow shadow
          "shadow-[0_8px_40px_rgb(59,130,246,0.2)] dark:shadow-[0_8px_40px_rgb(139,92,246,0.2)]"
        ),
        header: "border-b border-white/50 dark:border-white/15",
        footer: "border-t border-white/50 dark:border-white/15",
      }}
      {...props}
    >
      {children}
    </HeroModal>
  )
}

interface AlertDialogTriggerProps extends React.ComponentProps<"button"> {
  asChild?: boolean
}

function AlertDialogTrigger({
  children,
  asChild,
  ...props
}: AlertDialogTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return <Slot {...props}>{children}</Slot>
  }
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
      className={cn(
        // Glass surface
        "bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl",
        // Border
        "border border-white/60 dark:border-white/20",
        // Shape
        "rounded-3xl",
        className
      )}
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
