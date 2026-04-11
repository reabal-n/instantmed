"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { SectionHeader } from "./section-header"
import { useReducedMotion } from "@/components/ui/motion"

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  id?: string
  pill?: string
  title?: string
  subtitle?: string
  items: readonly FAQItem[]
  className?: string
  onFAQOpen?: (question: string, index: number) => void
}

export function FAQSection({
  id = "faq",
  pill,
  title = "Common questions",
  subtitle,
  items,
  className,
  onFAQOpen,
}: FAQSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id={id} className={cn("py-16 lg:py-24 scroll-mt-20", className)}>
      {title && (
        <SectionHeader pill={pill} title={title} subtitle={subtitle} />
      )}

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Accordion
          type="single"
          collapsible
          onValueChange={(value) => {
            if (value && onFAQOpen) {
              const idx = parseInt(value, 10)
              if (!isNaN(idx)) onFAQOpen(items[idx]?.question ?? "", idx)
            }
          }}
        >
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={animate ? { y: 6 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <AccordionItem
                value={index.toString()}
                className="border-b border-border/40 last:border-b-0"
              >
                <AccordionTrigger className="py-5 text-left text-sm font-medium text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
