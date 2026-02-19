"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

/**
 * UIX Tabs - Radix Tabs with built-in styling
 * Modern tab component with smooth transitions
 */

export interface TabsProps {
  children: React.ReactNode
  selectedKey?: string
  onSelectionChange?: (key: React.Key) => void
  variant?: "solid" | "bordered" | "light" | "underlined"
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
  radius?: "none" | "sm" | "md" | "lg" | "full"
  fullWidth?: boolean
  className?: string
  classNames?: {
    base?: string
    tabList?: string
    tab?: string
    tabContent?: string
    cursor?: string
    panel?: string
  }
}

export function Tabs({
  children,
  selectedKey,
  onSelectionChange,
  fullWidth = false,
  className,
  classNames,
}: TabsProps) {
  // Extract Tab children to build the Radix trigger list + content panels
  const tabs: { key: string; title: React.ReactNode; content: React.ReactNode; className?: string }[] = []

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === Tab) {
      const props = child.props as TabProps
      tabs.push({
        key: props.key ?? String(tabs.length),
        title: props.title,
        content: props.children,
        className: props.className,
      })
    }
  })

  const defaultValue = selectedKey ?? tabs[0]?.key

  return (
    <TabsPrimitive.Root
      value={selectedKey}
      defaultValue={defaultValue}
      onValueChange={onSelectionChange ? (v) => onSelectionChange(v) : undefined}
      className={cn("w-full", classNames?.base, className)}
    >
      <TabsPrimitive.List
        className={cn(
          "inline-flex items-center justify-center",
          "bg-default-100/50 backdrop-blur-sm p-1 rounded-xl",
          "text-muted-foreground",
          fullWidth && "w-full",
          classNames?.tabList
        )}
      >
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.key}
            value={tab.key}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
              "ring-offset-background transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
              fullWidth && "flex-1",
              classNames?.tab,
              tab.className
            )}
          >
            {tab.title}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.key}
          value={tab.key}
          className={cn(
            "pt-4",
            "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            classNames?.panel
          )}
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}

export interface TabProps {
  key: string
  title: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Tab(_props: TabProps) {
  // Tab is a data-only component; rendering is handled by Tabs
  return null
}

export { Tabs as UIXTabs, Tab as UIXTab }
