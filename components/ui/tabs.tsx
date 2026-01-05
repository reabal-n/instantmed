"use client"

import * as React from "react"
import { Tabs as HeroTabs, Tab, type TabsProps as HeroTabsProps } from "@heroui/react"
import { cn } from "@/lib/utils"

export interface TabsProps extends HeroTabsProps {
  className?: string
}

function Tabs({
  className,
  ...props
}: TabsProps) {
  return (
    <HeroTabs
      variant="solid"
      color="primary"
      radius="lg"
      className={cn("flex flex-col gap-2", className)}
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
