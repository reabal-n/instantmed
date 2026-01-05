"use client"

import * as React from "react"
import {
  Accordion as HeroAccordion,
  AccordionItem as HeroAccordionItem,
  type AccordionProps as HeroAccordionProps,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface AccordionProps extends HeroAccordionProps {
  children?: React.ReactNode
}

function Accordion({
  children,
  ...props
}: AccordionProps) {
  return (
    <HeroAccordion
      variant="bordered"
      selectionMode="multiple"
      className={cn("w-full", props.className)}
      {...props}
    >
      {children}
    </HeroAccordion>
  )
}

function AccordionItem({
  key,
  title,
  children,
  ...props
}: React.ComponentProps<typeof HeroAccordionItem>) {
  return (
    <HeroAccordionItem
      key={key}
      title={title}
      {...props}
    >
      {children}
    </HeroAccordionItem>
  )
}

function AccordionTrigger({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return <div {...props}>{children}</div>
}

function AccordionContent({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("pt-0 pb-4", className)} {...props}>
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
