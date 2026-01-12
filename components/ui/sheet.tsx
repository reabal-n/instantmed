"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody as _ModalBody,
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
      // Soft Pop Glass styling
      classNames={{
        // Glass backdrop
        backdrop: cn(
          "bg-black/40",
          "backdrop-blur-sm",
        ),
        wrapper: "z-50",
      }}
      // Spring physics motion
      motionProps={{
        variants: {
          enter: {
            x: side === "right" ? 0 : side === "left" ? 0 : undefined,
            y: side === "bottom" ? 0 : side === "top" ? 0 : undefined,
            opacity: 1,
            transition: {
              type: "spring",
              stiffness: 200,
              damping: 30,
            },
          },
          exit: {
            x: side === "right" ? 20 : side === "left" ? -20 : undefined,
            y: side === "bottom" ? 20 : side === "top" ? -20 : undefined,
            opacity: 0,
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
      className={cn(
        "group absolute right-3 top-3 flex size-8 items-center justify-center",
        // Soft Pop Glass close button
        "rounded-full",
        "bg-white/50 dark:bg-slate-800/50",
        "backdrop-blur-lg",
        "border border-white/30 dark:border-white/10",
        "transition-all duration-200",
        "hover:bg-white/80 dark:hover:bg-slate-800/80",
        "hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)]",
        "active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
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

function _SheetPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function _SheetOverlay({ className: _className }: { className?: string }) {
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
        "flex flex-col gap-4",
        // Soft Pop Glass elevated surface
        "bg-white/90 dark:bg-slate-900/90",
        "backdrop-blur-2xl",
        // Border based on side
        side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l border-white/40 dark:border-white/10 sm:max-w-sm rounded-l-3xl",
        side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r border-white/40 dark:border-white/10 sm:max-w-sm rounded-r-3xl",
        side === "top" && "inset-x-0 top-0 h-auto border-b border-white/40 dark:border-white/10 rounded-b-3xl",
        side === "bottom" && "inset-x-0 bottom-0 h-auto border-t border-white/40 dark:border-white/10 rounded-t-3xl",
        // Glow shadow
        "shadow-[0_25px_60px_rgba(0,0,0,0.15)]",
        "dark:shadow-[0_25px_60px_rgba(0,0,0,0.4)]",
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
      className={cn(
        "flex flex-col gap-1.5 p-6",
        "border-b border-white/20 dark:border-white/10",
        className
      )}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ModalFooter
      className={cn(
        "mt-auto flex flex-col gap-2 p-6",
        "border-t border-white/20 dark:border-white/10",
        className
      )}
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
      className={cn("text-foreground font-semibold text-lg", className)}
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
      className={cn("text-muted-foreground text-sm", className)}
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
