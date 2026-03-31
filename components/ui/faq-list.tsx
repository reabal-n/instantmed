"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useReducedMotion } from "@/components/ui/motion"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQGroup {
  category?: string
  items: FAQItem[]
}

interface FAQListProps {
  /** Flat list of FAQ items (ungrouped) */
  items?: readonly FAQItem[]
  /** Grouped FAQ items with category headings */
  groups?: readonly FAQGroup[]
  /** Accordion type — single (one open) or multiple */
  type?: "single" | "multiple"
  /** Default open item value */
  defaultValue?: string
  /** Callback when an item is opened */
  onValueChange?: (value: string) => void
  /** Additional className for the outer wrapper */
  className?: string
  /** Whether to animate items on scroll */
  animate?: boolean
  /** Override per-item className (replaces default card styling) */
  itemClassName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared item styles
// ─────────────────────────────────────────────────────────────────────────────

const itemClassName =
  "rounded-xl bg-white dark:bg-card border border-border/30 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none hover:border-primary/20 hover:shadow-md hover:shadow-primary/[0.06] transition-all duration-300 px-5"

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FAQList({
  items,
  groups,
  type = "single",
  defaultValue,
  onValueChange,
  className,
  animate: animateProp,
  itemClassName: itemClassNameProp,
}: FAQListProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animateProp !== false && !prefersReducedMotion
  const resolvedItemClassName = itemClassNameProp ?? itemClassName

  // Flat list mode
  if (items && !groups) {
    return (
      <Accordion
        type={type as "single"}
        collapsible={type === "single" ? true : undefined}
        defaultValue={defaultValue ?? "0"}
        onValueChange={onValueChange}
        className={cn("space-y-3", className)}
      >
        {items.map((item, index) => (
          <motion.div
            key={index.toString()}
            initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
          >
            <AccordionItem
              value={index.toString()}
              className={resolvedItemClassName}
            >
              <AccordionTrigger className="text-foreground py-5">
                <span className="font-medium text-foreground text-left">
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    )
  }

  // Grouped mode
  if (groups) {
    return (
      <div className={cn("space-y-10", className)}>
        {groups.map((group, gi) => (
          <div key={gi}>
            <motion.h3
              className="mb-4 text-lg font-semibold text-foreground"
              initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
              whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: gi * 0.08 }}
            >
              {group.category}
            </motion.h3>
            <Accordion
              type={type as "single"}
              collapsible={type === "single" ? true : undefined}
              className="space-y-3"
            >
              {group.items.map((item, ii) => (
                <motion.div
                  key={ii}
                  initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
                  whileInView={
                    shouldAnimate ? { opacity: 1, y: 0 } : undefined
                  }
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.3,
                    delay: gi * 0.08 + ii * 0.04,
                  }}
                >
                  <AccordionItem
                    value={`${gi}-${ii}`}
                    className={itemClassName}
                  >
                    <AccordionTrigger className="text-sm font-semibold text-foreground">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        ))}
      </div>
    )
  }

  return null
}
