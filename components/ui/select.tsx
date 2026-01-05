"use client"

import * as React from "react"
import {
  Select as HeroSelect,
  SelectItem as HeroSelectItem,
  type SelectProps as HeroSelectProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface SelectProps extends Omit<HeroSelectProps, "children" | "selectedKeys" | "onSelectionChange"> {
  children?: React.ReactNode
  // Support shadcn/ui API
  value?: string
  onValueChange?: (value: string) => void
  // Support HeroUI API
  selectedKeys?: string[] | Set<string>
  onSelectionChange?: (keys: any) => void
}

function Select({
  className,
  children,
  value,
  onValueChange,
  selectedKeys,
  onSelectionChange,
  ...props
}: SelectProps) {
  // Map shadcn/ui API to HeroUI API
  const heroSelectedKeys = selectedKeys ?? (value ? [value] : undefined)
  const heroOnSelectionChange = onSelectionChange ?? (onValueChange ? (keys: any) => {
    const selected = Array.from(keys)[0] as string
    onValueChange(selected)
  } : undefined)

  return (
    <HeroSelect
      radius="lg"
      variant="bordered"
      selectedKeys={heroSelectedKeys}
      onSelectionChange={heroOnSelectionChange as any}
      classNames={{
        trigger: "bg-background/50 backdrop-blur-sm border-default-200 hover:border-primary data-[focused=true]:border-primary",
        value: "text-foreground",
      }}
      className={className}
      {...props}
    >
      {children as any}
    </HeroSelect>
  )
}

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  return null // Handled by HeroUI Select
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "default"
}) {
  return (
    <button
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm",
        size === "default" ? "h-9" : "h-8",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function SelectContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-default-500 px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

interface SelectItemProps extends Omit<React.ComponentProps<typeof HeroSelectItem>, "key"> {
  value?: string
  key?: string
}

function SelectItem({
  className,
  children,
  value,
  key,
  ...props
}: SelectItemProps) {
  // Map shadcn/ui API (value) to HeroUI API (key)
  const itemKey = key ?? value
  
  return (
    <HeroSelectItem
      key={itemKey}
      className={className}
      {...props}
    >
      {children}
    </HeroSelectItem>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    />
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    />
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
