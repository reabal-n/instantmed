'use client'

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { ExternalLink, CheckCircle2 } from 'lucide-react'
import { faqItems } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'

/**
 * Generate FAQ Schema markup for SEO
 * This helps Google display FAQ rich snippets in search results
 */
function FAQSchema({ items }: { items: Array<{ question: string; answer: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function FAQSection() {
  return (
    <section id="faq" className="py-16 lg:py-20 scroll-mt-20">
      {/* FAQ Schema for SEO */}
      <FAQSchema items={faqItems} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">FAQ</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
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
            type="single"
            collapsible
            defaultValue="0"
            className="space-y-3"
          >
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index.toString()}
                value={index.toString()}
                className="rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-border/60 shadow-sm hover:border-primary/20 hover:shadow-md transition-all px-5 !border-b-border/60"
              >
                <AccordionTrigger className="text-foreground hover:no-underline py-5">
                  <span className="font-medium text-foreground text-left">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
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
          <a
            href="mailto:hello@instantmed.com.au"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
          >
            Contact our support team
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
