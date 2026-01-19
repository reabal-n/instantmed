/* eslint-disable @typescript-eslint/no-explicit-any -- HeroUI wrapper requires type assertions for compatibility */
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
  align: _align,
  className,
  ...props
}: DropdownMenuContentProps) {
  // Note: HeroUI handles placement on the Dropdown component, not the content
  // The align prop is accepted for API compatibility but placement should be set on DropdownMenu
  return (
    <HeroDropdownMenu 
      aria-label="Menu"
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
  const itemKey = (props as any).key || `dropdown-item-${++dropdownItemCounter}`
  
  // Map shadcn/ui API to HeroUI API
  const heroIsDisabled = isDisabled ?? disabled
  
  // If asChild with a Link, extract href and render content inside DropdownItem
  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as any
    const href = childProps?.href
    
    // For Next.js Link, use HeroUI's native href support
    if (href) {
      return (
        <DropdownItem
          key={itemKey}
          href={href}
          color={variant === "destructive" ? "danger" : "default"}
          isDisabled={heroIsDisabled}
          className={className}
          {...props}
        >
          {childProps.children}
        </DropdownItem>
      )
    }
    
    // For other elements, render children directly
    return (
      <DropdownItem
        key={itemKey}
        color={variant === "destructive" ? "danger" : "default"}
        isDisabled={heroIsDisabled}
        className={className}
        {...props}
      >
        {childProps.children}
      </DropdownItem>
    )
  }
  
  return (
    <DropdownItem
      key={itemKey}
      color={variant === "destructive" ? "danger" : "default"}
      isDisabled={heroIsDisabled}
      className={className}
      {...props}
    >
      {children}
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
