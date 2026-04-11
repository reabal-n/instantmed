"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { FAQList } from "@/components/ui/faq-list"
import { CONTACT_EMAIL } from "@/lib/constants"
import { MED_CERT_FAQ } from "@/lib/data/med-cert-faq"

// =============================================================================
// COMPONENT
// =============================================================================

type FAQItem = { readonly question: string; readonly answer: string }

/** Section 5: FAQ with expanded items */
export function FaqCtaSection({
  onFAQOpen,
  faqs = MED_CERT_FAQ,
  subtitle = "Everything you need to know about getting your certificate.",
}: {
  onFAQOpen?: (question: string, index: number) => void
  faqs?: readonly FAQItem[]
  subtitle?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section id="faq" aria-label="Frequently asked questions" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4 tracking-tight">
            Common questions
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {subtitle}
          </p>
        </motion.div>

        {/* Accordion - flat style, no double containers */}
        <FAQList
          items={faqs}
          itemClassName="border-b border-border/40 last:border-b-0 first:border-t first:border-t-border/40 rounded-none bg-transparent shadow-none px-0 hover:border-border/40 hover:shadow-none"
          onValueChange={(value) => {
            if (value && onFAQOpen) {
              const idx = parseInt(value, 10)
              onFAQOpen(faqs[idx]?.question ?? "", idx)
            }
          }}
        />

        {/* Contact */}
        <motion.div
          className="mt-10 text-center"
          initial={{}}
          whileInView={animate ? { opacity: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-muted-foreground mb-2 text-sm">
            Still have questions?
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Contact our support team
          </a>
        </motion.div>

        {/* Emergency note */}
        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          For emergencies, call 000. This service is for non-urgent conditions
          only.
        </p>
      </div>
    </section>
  )
}
