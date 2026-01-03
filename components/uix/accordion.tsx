"use client"

import * as React from "react"
import { Accordion as HeroAccordion, AccordionItem as HeroAccordionItem } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Accordion - HeroUI Pro with built-in animations
 * Replaces Framer Motion usage with HeroUI's native transitions
 */

export interface AccordionProps {
  children: React.ReactNode
  variant?: "splitted" | "bordered" | "light" | "shadow"
  selectionMode?: "single" | "multiple"
  defaultExpandedKeys?: string[]
  className?: string
}

export function Accordion({
  children,
  variant = "splitted",
  selectionMode = "single",
  defaultExpandedKeys,
  className,
}: AccordionProps) {
  return (
    <HeroAccordion
      variant={variant}
      selectionMode={selectionMode}
      defaultExpandedKeys={defaultExpandedKeys}
      className={cn("gap-3", className)}
    >
      {children}
    </HeroAccordion>
  )
}

export interface AccordionItemProps {
  title: React.ReactNode
  children: React.ReactNode
  key?: string
  "aria-label"?: string
  className?: string
  startContent?: React.ReactNode
  subtitle?: React.ReactNode
}

export function AccordionItem({
  title,
  children,
  className,
  startContent,
  subtitle,
  ...props
}: AccordionItemProps) {
  return (
    <HeroAccordionItem
      title={<span className="font-medium text-foreground">{title}</span>}
      subtitle={subtitle}
      startContent={startContent}
      classNames={{
        base: cn(
          "bg-content1 border border-divider shadow-sm",
          "hover:border-primary/20 transition-colors duration-200",
          className
        ),
        title: "text-foreground",
        content: "text-muted-foreground leading-relaxed pb-4",
        trigger: "data-[hover=true]:bg-default-50/50",
        indicator: "text-primary",
      }}
      {...props}
    >
      {children}
    </HeroAccordionItem>
  )
}

export { Accordion as UIXAccordion, AccordionItem as UIXAccordionItem }
