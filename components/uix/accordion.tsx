"use client"

/**
 * UIX Accordion - Re-exports from ui/accordion with Radix primitives
 * Provides convenient access through the UIX layer
 */

// Re-export Radix-based Accordion components
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

// Type exports for convenience
export type {
  AccordionSingleProps,
  AccordionMultipleProps,
} from "@radix-ui/react-accordion"

// Aliases for consistency
export {
  Accordion as UIXAccordion,
  AccordionItem as UIXAccordionItem,
} from "@/components/ui/accordion"
