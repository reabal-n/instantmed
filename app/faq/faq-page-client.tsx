"use client"

import Link from "next/link"
import { FAQSchema } from "@/components/seo/healthcare-schema"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import { AccordionSection, CTABanner } from "@/components/sections"
import { GENERAL_FAQ } from "@/lib/data/general-faq"

/* ────────────────────────────── Component ────────────────────────────── */

export default function FAQPage() {
  // Flat list for schema.org structured data
  const allFaqs = GENERAL_FAQ.flatMap((group) => group.items)

  return (
    <div className="flex min-h-screen flex-col">
      <FAQSchema faqs={allFaqs} />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="Help Centre"
          title="Got questions? We've got answers."
          highlightWords={["answers"]}
          subtitle="Everything you need to know about InstantMed."
        >
          <p className="text-sm text-muted-foreground">
            Can&apos;t find your answer?{" "}
            <Link
              href="/contact"
              className="text-primary hover:underline font-medium"
            >
              Get in touch
            </Link>
          </p>
        </CenteredHero>

        {/* FAQ Sections - 7 categories with accordion */}
        <AccordionSection
          groups={GENERAL_FAQ}
          hideHeader
        />

        {/* CTA */}
        <CTABanner
          title="Still have questions?"
          subtitle="Our support team is here to help - reach out anytime."
          ctaText="Contact Support"
          ctaHref="/contact"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
