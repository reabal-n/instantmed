"use client"

import * as React from "react"
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu as HeroDropdownMenu,
  DropdownItem,
  type DropdownProps as HeroDropdownProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface DropdownMenuProps extends HeroDropdownProps {
  children?: React.ReactNode
}

function DropdownMenu({
  children,
  ...props
}: DropdownMenuProps) {
  return (
    <Dropdown
      placement="bottom-start"
      backdrop="blur"
      classNames={{
        content: "bg-background/90 backdrop-blur-xl border border-default-100 rounded-xl",
      }}
      {...props}
    >
      {children}
    </Dropdown>
  )
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuTrigger({
  children,
  ...props
}: React.ComponentProps<"button">) {
  return <DropdownTrigger {...props}>{children}</DropdownTrigger>
}

function DropdownMenuContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <HeroDropdownMenu {...props}>{children}</HeroDropdownMenu>
}

function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuItem({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof DropdownItem> & {
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownItem
      key={String(props.key || children)}
      color={variant === "destructive" ? "danger" : "default"}
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
  return (
    <DropdownItem
      key={String(props.key || children)}
      startContent={checked ? "✓" : ""}
      {...props}
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
  return (
    <DropdownItem
      key={String(props.key || children)}
      {...props}
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
  return (
    <DropdownItem
      key={String(props.key || children)}
      {...props}
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
