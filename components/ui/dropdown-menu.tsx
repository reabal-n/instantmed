"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu as HeroDropdownMenu,
  DropdownItem,
  type DropdownProps as HeroDropdownProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface DropdownMenuProps extends Omit<HeroDropdownProps, "children"> {
  children?: React.ReactNode
}

function DropdownMenu({
  children,
  className,
  ...props
}: DropdownMenuProps) {
  return (
    <Dropdown
      placement="bottom-start"
      backdrop="blur"
      classNames={{
        content: cn(
          // Glass surface
          "bg-white/85 dark:bg-slate-900/80 backdrop-blur-xl",
          // Border
          "border border-white/50 dark:border-white/15",
          // Shape
          "rounded-2xl",
          // Glow shadow
          "shadow-[0_8px_30px_rgb(59,130,246,0.15)] dark:shadow-[0_8px_30px_rgb(139,92,246,0.15)]",
          // Z-index
          "z-[100]",
          className
        ),
      }}
      {...props}
    >
      {children as any}
    </Dropdown>
  )
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface DropdownMenuTriggerProps extends React.ComponentProps<"button"> {
  asChild?: boolean
}

function DropdownMenuTrigger({
  children,
  asChild,
  ...props
}: DropdownMenuTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return (
      <DropdownTrigger {...props}>
        <Slot>{children}</Slot>
      </DropdownTrigger>
    )
  }
  return <DropdownTrigger {...props}>{children}</DropdownTrigger>
}

interface DropdownMenuContentProps extends React.ComponentProps<"div"> {
  align?: "start" | "end" | "center"
}

function DropdownMenuContent({
  children,
  align,
  className,
  ...props
}: DropdownMenuContentProps) {
  // Note: HeroUI handles placement on the Dropdown component, not the content
  // The align prop is accepted for API compatibility but placement should be set on DropdownMenu
  return (
    <HeroDropdownMenu 
      className={cn(className)}
      {...(props as any)}
    >
      {children as any}
    </HeroDropdownMenu>
  )
}

function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

interface DropdownMenuItemProps extends Omit<React.ComponentProps<typeof DropdownItem>, "key" | "isDisabled" | "variant"> {
  variant?: "default" | "destructive"
  key?: string | number
  asChild?: boolean
  // Support shadcn/ui API
  disabled?: boolean
  // Support HeroUI API
  isDisabled?: boolean
}

// Use a counter for stable keys
let dropdownItemCounter = 0

function DropdownMenuItem({
  className,
  variant = "default",
  children,
  asChild,
  disabled,
  isDisabled,
  ...props
}: DropdownMenuItemProps) {
  // HeroUI requires a key prop, so we generate one from children if not provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemKey = (props as any).key || String(children) || `dropdown-item-${++dropdownItemCounter}`
  
  // Map shadcn/ui API to HeroUI API
  const heroIsDisabled = isDisabled ?? disabled
  
  // If asChild, wrap children with Slot
  const content = asChild && React.isValidElement(children) ? (
    <Slot>{children}</Slot>
  ) : children
  
  return (
    <DropdownItem
      key={itemKey}
      color={variant === "destructive" ? "danger" : "default"}
      isDisabled={heroIsDisabled}
      className={className}
      {...props}
    >
      {content}
    </DropdownItem>
  )
}

function DropdownMenuCheckboxItem({
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownItem> & { checked?: boolean }) {
  const { key: itemKey, ...restProps } = props as any
  return (
    <DropdownItem
      key={String(itemKey || children)}
      startContent={checked ? "✓" : ""}
      {...restProps}
    >
      {children}
    </DropdownItem>
  )
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuRadioItem({
  children,
  ...props
}: React.ComponentProps<typeof DropdownItem>) {
  const { key: itemKey, ...restProps } = props as any
  return (
    <DropdownItem
      key={String(itemKey || children)}
      {...restProps}
    >
      {children}
    </DropdownItem>
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-2 py-1.5 text-sm font-medium", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-default-500 ml-auto text-xs tracking-widest", className)}
      {...props}
    />
  )
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubTrigger({
  children,
  ...props
}: React.ComponentProps<typeof DropdownItem>) {
  const { key: itemKey, ...restProps } = props as any
  return (
    <DropdownItem
      key={String(itemKey || children)}
      {...restProps}
    >
      {children}
    </DropdownItem>
  )
}

function DropdownMenuSubContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
