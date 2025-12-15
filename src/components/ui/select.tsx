"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Base styles
        "flex w-fit items-center justify-between gap-2 rounded-lg",
        "px-3 py-2 text-sm whitespace-nowrap",
        "data-[size=default]:h-10 data-[size=sm]:h-8",
        // Placeholder
        "data-[placeholder]:text-muted-foreground",
        // Glassy background
        "bg-background/50 backdrop-blur-sm",
        "dark:bg-surface/50",
        // Border
        "border border-border",
        "dark:border-border/50",
        // Shadow
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        "dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        // Transitions
        "transition-all duration-200 ease-out",
        // Hover
        "hover:border-border-strong",
        "hover:bg-accent/30",
        "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)]",
        "dark:hover:border-border",
        "dark:hover:bg-surface-elevated/50",
        // Focus glow (accessible)
        "outline-none",
        "focus-visible:border-primary",
        "focus-visible:ring-2 focus-visible:ring-primary/20",
        "focus-visible:shadow-[0_0_0_4px_var(--primary)/0.1]",
        "dark:focus-visible:ring-primary/30",
        // Error state
        "aria-invalid:border-destructive",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:aria-invalid:ring-destructive/30",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        "disabled:bg-muted disabled:border-muted",
        // Icon styles
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        // Value container
        "*:data-[slot=select-value]:line-clamp-1",
        "*:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50 transition-transform duration-200 data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // Base styles
          "relative z-50 overflow-hidden rounded-lg",
          "max-h-(--radix-select-content-available-height) min-w-[8rem]",
          "origin-(--radix-select-content-transform-origin)",
          // Glassy background
          "bg-popover/95 backdrop-blur-xl",
          "dark:bg-surface-elevated/95",
          // Border & shadow
          "border border-border/50",
          "shadow-[0_8px_30px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)]",
          "dark:border-border/30",
          "dark:shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]",
          // Text
          "text-popover-foreground",
          // Animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          // Position offset
          position === "popper" && [
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
            "data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          ],
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(
        "px-2 py-1.5 text-xs font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Base styles
        "relative flex w-full cursor-default select-none items-center gap-2",
        "rounded-md py-2 pl-2 pr-8 text-sm",
        // Transitions
        "transition-colors duration-150",
        // Hover/focus
        "outline-hidden",
        "focus:bg-accent/50 focus:text-accent-foreground",
        "dark:focus:bg-surface/80",
        // Disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Icons
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground",
        // Content container
        "*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border/50 pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
