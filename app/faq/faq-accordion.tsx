"use client"

import { Accordion, AccordionItem } from "@/components/ui/accordion"

interface FAQItem {
  q: string
  a: string
}

interface FAQCategory {
  title: string
  emoji: string
  faqs: FAQItem[]
}

interface FAQAccordionProps {
  categories: FAQCategory[]
}

export function FAQAccordion({ categories }: FAQAccordionProps) {
  return (
    <div className="space-y-10">
      {categories.map((category, catIndex) => (
        <div
          key={category.title}
          className="animate-fade-in-up opacity-0"
          style={{ animationDelay: `${0.1 + catIndex * 0.1}s`, animationFillMode: "forwards" }}
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
            <span className="text-2xl">{category.emoji}</span>
            {category.title}
          </h2>
          <div className="relative rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl overflow-hidden">
            <Accordion
              variant="light"
              type="multiple"
              className="px-0"
            >
              {category.faqs.map((faq, faqIndex) => (
                <AccordionItem
                  key={`${catIndex}-${faqIndex}`}
                  aria-label={faq.q}
                  title={
                    <span className="font-medium text-foreground pr-4 text-left">
                      {faq.q}
                    </span>
                  }
                  className="px-6 border-b border-white/10 last:border-0"
                  classNames={{
                    trigger: "py-4 hover:bg-white/5 transition-colors",
                    content: "pb-4 text-muted-foreground leading-relaxed",
                  }}
                >
                  {faq.a}
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      ))}
    </div>
  )
}
