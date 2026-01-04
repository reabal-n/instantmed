"use client"

/**
 * UIX Accordion - Re-exports HeroUI Accordion with built-in animations
 * Provides convenient access through the UIX layer
 */

// Re-export HeroUI Accordion components directly
// These already have excellent built-in animations
export { 
  Accordion, 
  AccordionItem 
} from "@heroui/react"

// Type exports for convenience
export type { AccordionProps, AccordionItemProps } from "@heroui/react"

// Aliases for consistency
export { Accordion as UIXAccordion, AccordionItem as UIXAccordionItem } from "@heroui/react"
