import { FAQList } from '@/components/ui/faq-list'
import { Heading } from '@/components/ui/heading'
import { SectionPill } from '@/components/ui/section-pill'
import { CONTACT_EMAIL } from '@/lib/constants'

import type { ServiceFunnelConfig } from './funnel-types'

interface FaqSectionProps {
  config: ServiceFunnelConfig
}

export function FaqSection({ config }: FaqSectionProps) {
  if (!config.faq) return null

  return (
    <section id="faq" className="py-16 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="mb-6">
            <SectionPill>FAQ</SectionPill>
          </div>

          <Heading level="h2" className="mb-4">
            {config.faq.title}
          </Heading>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {config.faq.subtitle}
          </p>
        </div>

        <FAQList items={config.faq.items} defaultValue="0" />

        {/* Contact support */}
        <div className="mt-10 text-center">
          <p className="text-muted-foreground mb-2 text-sm">Still have questions?</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Contact our support team
          </a>
        </div>
      </div>
    </section>
  )
}
