"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
  highlightWords?: string[]
  items: readonly FAQItem[]
  className?: string
  onFAQOpen?: (question: string, index: number) => void
  viewAllHref?: string
}

export function FAQSection({
  id = "faq",
  pill,
  title = "Common questions",
  subtitle,
  highlightWords,
  items,
  className,
  onFAQOpen,
  viewAllHref,
}: FAQSectionProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id={id} className={cn("py-10 sm:py-14 lg:py-24 scroll-mt-20", className)}>
      <div className="mx-auto max-w-3xl px-4">
        {title && (
          <SectionHeader pill={pill} title={title} subtitle={subtitle} highlightWords={highlightWords} className="mb-6" />
        )}
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
              initial={animate ? { y: 6, opacity: 0 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <AccordionItem
                value={index.toString()}
                className="border-b border-border/30 first:border-t first:border-t-border/30"
              >
                <AccordionTrigger className="py-4 text-left text-[15px] font-medium text-foreground hover:no-underline gap-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {viewAllHref && (
          <div className="mt-6 text-center">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all questions
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
