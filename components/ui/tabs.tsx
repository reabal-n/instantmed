"use client"

import * as React from "react"
import { Tabs as HeroTabs, Tab, type TabsProps as HeroTabsProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TabsProps extends Omit<HeroTabsProps, "selectedKey" | "onSelectionChange"> {
  className?: string
  // Support shadcn/ui API
  value?: string
  onValueChange?: ((value: string) => void) | React.Dispatch<React.SetStateAction<string>>
  // Support HeroUI API
  selectedKey?: string
  onSelectionChange?: (key: React.Key) => void
}

function Tabs({
  className,
  value,
  onValueChange,
  selectedKey,
  onSelectionChange,
  ...props
}: TabsProps) {
  // Map shadcn/ui API to HeroUI API
  const heroSelectedKey = selectedKey ?? value
  const heroOnSelectionChange = onSelectionChange ?? (onValueChange ? (key: React.Key) => onValueChange(String(key)) : undefined)

  return (
    <HeroTabs
      variant="solid"
      color="primary"
      radius="lg"
      className={cn("flex flex-col gap-2", className)}
      selectedKey={heroSelectedKey}
      onSelectionChange={heroOnSelectionChange}
      {...props}
    />
  )
}

function TabsList({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function TabsTrigger({
  value,
  children,
  ...props
}: React.ComponentProps<typeof Tab>) {
  return (
    <Tab
      key={value}
      value={value}
      {...props}
    >
      {children}
    </Tab>
  )
}

function TabsContent({
  value,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  return (
    <div
      className={cn("flex-1 outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
