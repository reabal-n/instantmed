/* eslint-disable @typescript-eslint/no-explicit-any -- HeroUI wrapper requires type assertions for compatibility */
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
      radius="lg" // Soft Pop Glass: rounded-xl
      variant="bordered"
      selectedKeys={heroSelectedKeys}
      onSelectionChange={heroOnSelectionChange as any}
      classNames={{
        // Soft Pop Glass trigger button
        trigger: cn(
          "bg-white/60 dark:bg-slate-900/40",
          "backdrop-blur-lg",
          "border border-white/30 dark:border-white/10",
          // Motion
          "transition-all duration-200",
          // Hover state
          "hover:border-primary/30",
          "hover:bg-white/70 dark:hover:bg-slate-900/50",
          // Focus state with glow
          "data-[focused=true]:border-primary/50",
          "data-[focused=true]:bg-white/80 dark:data-[focused=true]:bg-slate-900/60",
          "data-[focused=true]:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        ),
        value: "text-foreground",
        // Soft Pop Glass dropdown
        popoverContent: cn(
          "bg-white/90 dark:bg-slate-900/90",
          "backdrop-blur-2xl",
          "border border-white/40 dark:border-white/10",
          "rounded-xl",
          "shadow-[0_20px_40px_rgba(0,0,0,0.15)]",
        ),
        listbox: "bg-transparent",
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

function SelectValue({ placeholder: _placeholder }: { placeholder?: string }) {
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
        // Soft Pop Glass trigger
        "bg-white/60 dark:bg-slate-900/40",
        "backdrop-blur-lg",
        "border border-white/30 dark:border-white/10",
        "rounded-xl",
        "flex w-fit items-center justify-between gap-2 px-3 py-2 text-sm",
        "transition-all duration-200",
        "hover:border-primary/30",
        "focus:border-primary/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        "data-[placeholder]:text-muted-foreground/50",
        size === "default" ? "h-11" : "h-9",
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
      className={cn("text-muted-foreground px-2 py-1.5 text-xs font-medium", className)}
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
      className={cn(
        "rounded-lg",
        "transition-colors duration-150",
        "data-[hover=true]:bg-primary/5",
        "data-[selectable=true]:focus:bg-primary/10",
        className
      )}
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
      className={cn("bg-white/20 dark:bg-white/10 pointer-events-none -mx-1 my-1 h-px", className)}
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
