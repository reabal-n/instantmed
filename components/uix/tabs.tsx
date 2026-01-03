"use client"

import * as React from "react"
import { Tabs as HeroTabs, Tab as HeroTab } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Tabs - HeroUI Pro with built-in animations
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
  variant = "solid",
  color = "primary",
  size = "md",
  radius = "lg",
  fullWidth = false,
  className,
  classNames,
}: TabsProps) {
  return (
    <HeroTabs
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      variant={variant}
      color={color}
      size={size}
      radius={radius}
      fullWidth={fullWidth}
      className={cn(className)}
      classNames={{
        base: cn("w-full", classNames?.base),
        tabList: cn(
          "bg-default-100/50 backdrop-blur-sm p-1 rounded-xl",
          classNames?.tabList
        ),
        tab: cn(
          "data-[hover=true]:opacity-100",
          classNames?.tab
        ),
        tabContent: cn("group-data-[selected=true]:text-foreground", classNames?.tabContent),
        cursor: cn("bg-background shadow-sm", classNames?.cursor),
        panel: cn("pt-4", classNames?.panel),
      }}
    >
      {children}
    </HeroTabs>
  )
}

export interface TabProps {
  key: string
  title: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Tab({ title, children, className, ...props }: TabProps) {
  return (
    <HeroTab
      title={title}
      className={cn(className)}
      {...props}
    >
      {children}
    </HeroTab>
  )
}

export { Tabs as UIXTabs, Tab as UIXTab }
