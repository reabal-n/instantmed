'use client'

import { Accordion, AccordionItem, Link } from '@heroui/react'
import { faqItems } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import { HelpCirclePremium } from '@/components/icons/certification-logos'

export function FAQSection() {
  return (
    <section id="faq" className="py-16 lg:py-20 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default">
            <HelpCirclePremium className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">FAQ</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Common questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Everything you need to know about our service.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
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
                  base: "bg-content1 border border-divider shadow-sm hover:border-primary/20 transition-colors",
                  title: "text-foreground",
                  content: "text-muted-foreground leading-relaxed pb-4",
                }}
              >
                {item.answer}
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact support */}
        <motion.div 
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-2 text-sm">Still have questions?</p>
          <Link 
            href="mailto:hello@LumenHealth.com.au" 
            color="primary"
            showAnchorIcon
          >
            Contact our support team
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
