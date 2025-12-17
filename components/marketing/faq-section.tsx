'use client'

import { Accordion, AccordionItem, Chip, Link } from '@heroui/react'
import { faqItems } from '@/lib/marketing/homepage'

export function FAQSection() {
  return (
    <section id="faq" className="py-20 lg:py-28 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Chip color="primary" variant="flat" className="mb-4">
            FAQ
          </Chip>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Common questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about our service.
          </p>
        </div>

        <Accordion 
          variant="splitted"
          defaultExpandedKeys={["0"]}
          className="gap-3"
        >
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index.toString()}
              aria-label={item.question}
              title={<span className="font-medium text-foreground">{item.question}</span>}
              classNames={{
                base: "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm",
                title: "text-foreground",
                content: "text-muted-foreground leading-relaxed pb-4",
              }}
            >
              {item.answer}
            </AccordionItem>
          ))}
        </Accordion>

        {/* Contact support */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-2">Still have questions?</p>
          <Link 
            href="mailto:support@instantmed.com.au" 
            color="primary"
            showAnchorIcon
          >
            Contact our support team
          </Link>
        </div>
      </div>
    </section>
  )
}
