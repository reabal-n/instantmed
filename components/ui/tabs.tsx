/* eslint-disable @typescript-eslint/no-explicit-any -- HeroUI wrapper requires type assertions for compatibility */
"use client"

import * as React from "react"
import { Tabs as HeroTabs, Tab, type TabsProps as HeroTabsProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TabsProps extends Omit<HeroTabsProps, "selectedKey" | "onSelectionChange"> {
  className?: string
  // Support shadcn/ui API
  value?: string
  defaultValue?: string
  onValueChange?: ((value: string) => void) | React.Dispatch<React.SetStateAction<string>>
  // Support HeroUI API
  selectedKey?: string
  defaultSelectedKey?: string
  onSelectionChange?: (key: React.Key) => void
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  ...props
}: TabsProps) {
  // Map shadcn/ui API to HeroUI API
  const heroSelectedKey = selectedKey ?? value ?? defaultSelectedKey ?? defaultValue
  const heroOnSelectionChange = onSelectionChange ?? (onValueChange ? (key: React.Key) => onValueChange(String(key)) : undefined)

  return (
    <HeroTabs
      variant="solid"
      color="primary"
      radius="full" // Soft Pop Glass: pill-shaped tabs
      className={cn("flex flex-col gap-2", className)}
      selectedKey={heroSelectedKey}
      onSelectionChange={heroOnSelectionChange}
      classNames={{
        // Soft Pop Glass tab list container
        tabList: cn(
          "bg-white/60 dark:bg-slate-900/40",
          "backdrop-blur-xl",
          "border border-white/40 dark:border-white/10",
          "rounded-full",
          "p-1",
          "shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
        ),
        // Tab button
        tab: cn(
          "rounded-full",
          "transition-all duration-200",
          "data-[hover=true]:bg-white/50 dark:data-[hover=true]:bg-white/10",
        ),
        // Active tab with glow
        cursor: cn(
          "bg-white dark:bg-slate-800",
          "shadow-[0_4px_16px_rgba(59,130,246,0.2)]",
          "dark:shadow-[0_4px_16px_rgba(139,92,246,0.2)]",
        ),
        // Tab content panel
        panel: cn(
          "pt-4",
        ),
      }}
      {...props}
    />
  )
}

function TabsList({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div 
      className={cn(
        // Soft Pop Glass tab list (standalone)
        "inline-flex items-center gap-1 p-1",
        "bg-white/60 dark:bg-slate-900/40",
        "backdrop-blur-xl",
        "border border-white/40 dark:border-white/10",
        "rounded-full",
        "shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Tab>) {
  return (
    <Tab
      key={value as any}
      value={value}
      className={cn(
        "rounded-full px-4 py-2",
        "transition-all duration-200",
        "hover:bg-white/50 dark:hover:bg-white/10",
        "data-[selected=true]:bg-white dark:data-[selected=true]:bg-slate-800",
        "data-[selected=true]:shadow-[0_4px_16px_rgba(59,130,246,0.2)]",
        "dark:data-[selected=true]:shadow-[0_4px_16px_rgba(139,92,246,0.2)]",
        className
      )}
      {...props}
    >
      {children}
    </Tab>
  )
}

function TabsContent({
  value: _value,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  return (
    <div
      className={cn("flex-1 outline-none pt-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
