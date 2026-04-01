"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/components/ui/motion"
import { safeJsonLd } from "@/lib/seo/safe-json-ld"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { StatsHero } from "@/components/heroes"
import { ComparisonTable, AccordionSection, CTABanner } from "@/components/sections"
import { Check, Star, ArrowRight, Shield, Clock, Zap, FileText, Pill } from "lucide-react"
import { DoctorCredibility } from "@/components/marketing/doctor-credibility"
import { RegulatoryPartners } from "@/components/marketing/media-mentions"
import { PricingGuideSection } from "@/components/marketing/sections/pricing-guide-section"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { SOCIAL_PROOF } from "@/lib/social-proof"

/* ────────────────────────────── Data ────────────────────────────── */

const services = [
  {
    name: "Medical Certificate",
    price: PRICING.MED_CERT,
    priceLabel: `From $${PRICING.MED_CERT}`,
    priceSubtext: `1 day: $${PRICING.MED_CERT} · 2 days: $${PRICING.MED_CERT_2DAY}`,
    description: "Work, uni, or carer's leave",
    features: [
      "Same-day delivery",
      "Accepted by all employers",
      "AHPRA-registered doctor",
      "PDF via email",
    ],
    popular: true,
    href: "/medical-certificate",
    icon: FileText,
    color: "#2563EB",
  },
  {
    name: "Prescription",
    price: PRICING.REPEAT_SCRIPT,
    priceLabel: `$${PRICING.REPEAT_SCRIPT}`,
    description: "Repeat scripts for ongoing meds",
    features: [
      "E-script to your phone",
      "Any pharmacy Australia-wide",
      "Usually under 1 hour",
      "SMS token delivery",
    ],
    popular: false,
    href: "/prescriptions",
    icon: Pill,
    color: "#4f46e5",
  },
]

const comparisonItems = [
  { label: "No appointment needed", us: true, them: false },
  { label: "Available 7 days a week", us: true, them: false },
  { label: "AHPRA-registered doctors", us: true, them: true },
  { label: "Same-day turnaround", us: true, them: false },
  { label: "Full refund if declined", us: true, them: false },
  { label: "No subscriptions or memberships", us: true, them: false },
  { label: "Accepted by all employers", us: true, them: true },
  { label: "E-scripts to any pharmacy", us: true, them: false },
]

const pricingFaqs = [
  {
    category: "Pricing & Payments",
    items: [
      {
        question: "Are there any hidden fees?",
        answer:
          "Nope. The price you see is the price you pay. No subscriptions, no memberships, no surprises.",
      },
      {
        question: "What if my request is declined?",
        answer:
          "Full refund, no questions asked. We only charge if we can actually help you.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "All major credit and debit cards (Visa, Mastercard, American Express), Apple Pay, and Google Pay. All payments are processed securely through Stripe with full encryption.",
      },
      {
        question: "Can I get a receipt for my health insurance?",
        answer:
          "Yes. You\u2019ll receive a tax invoice via email after payment. Whether your health insurer reimburses telehealth consultations depends on your policy and fund — check with your insurer directly. We provide the documentation either way.",
      },
      {
        question: "Why isn\u2019t this covered by Medicare?",
        answer:
          "Most asynchronous telehealth services in Australia operate outside of Medicare. Medicare item numbers are structured around real-time consultations with an established provider-patient relationship. Our service \u2014 where a doctor reviews your request without a scheduled appointment \u2014 doesn\u2019t fit existing Medicare billing categories. This is standard across the telehealth industry, not specific to us.",
      },
      {
        question: "Do I need a Medicare card to use InstantMed?",
        answer:
          "Not for medical certificates. For prescriptions and consultations, a Medicare card is required so we can verify your identity and ensure continuity of care. If you hold an international student visa or don\u2019t have Medicare, you can still access medical certificates.",
      },
      {
        question: "How much do prescriptions cost at the pharmacy?",
        answer:
          "Our fee covers the doctor\u2019s review and eScript generation only. Medication costs are separate and paid at your pharmacy. With a Medicare card, most PBS-listed medications cost $31.60 or less ($7.70 for concession card holders). Without Medicare, you\u2019ll pay the full retail price. Your pharmacist can confirm the exact cost before you purchase.",
      },
      {
        question: "Is there a fee for follow-up questions?",
        answer:
          "No. If the reviewing doctor needs more information to make a clinical decision about your request, that follow-up is included in your original consultation fee. You won\u2019t be charged extra for the doctor doing their job properly.",
      },
      {
        question: "Do you offer discounts for students or concession card holders?",
        answer:
          "Our pricing is already designed to be accessible \u2014 significantly less than the average out-of-pocket cost of a private GP visit. We don\u2019t currently offer tiered pricing by concession status, but we\u2019re exploring this for the future. If cost is a barrier, reach out to us at support@instantmed.com.au.",
      },
      {
        question: "What if I need a longer medical certificate?",
        answer:
          "We offer 1-day, 2-day, and 3-day medical certificates at different price points. For absences beyond 3 days, we\u2019d generally recommend seeing a GP in person for a more thorough assessment. If your situation requires an extended certificate, start a request and the reviewing doctor will advise on the best path forward.",
      },
      {
        question: "How long does it take to get my refund?",
        answer:
          "Refunds are processed automatically when a doctor declines a request. The funds typically appear back in your account within 3\u20135 business days, depending on your bank or card provider.",
      },
      {
        question: "Can I use InstantMed for my family members?",
        answer:
          "Each request must be submitted by \u2014 or on behalf of \u2014 the individual patient. You can submit a request for a dependent (such as a child with parental consent), but each person needs their own profile. You can\u2019t use a single account to get certificates for multiple adults.",
      },
    ],
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export function PricingClient() {
  const pricingCardsRef = useRef<HTMLElement>(null)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const el = pricingCardsRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyCTA(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pricingFaqs.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      }))
    ),
  }

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqStructuredData) }}
      />
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <StatsHero
          pill="Simple pricing"
          title="Pay per consult. No subscriptions."
          highlightWords={["subscriptions"]}
          subtitle="Transparent pricing with no hidden fees. Only pay when you need care — and only if we can help."
          stats={[
            { value: SOCIAL_PROOF.refundPercent, suffix: "%", label: "Refund if declined" },
            { value: 0, prefix: "$", label: "Hidden fees" },
            { value: SOCIAL_PROOF.operatingDays, label: "Days a week" },
          ]}
        />

        {/* Pricing Cards */}
        <section ref={pricingCardsRef} className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service) => (
                <div
                  key={service.name}
                  className={cn(
                    "rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card p-5 lg:p-6 relative hover:-translate-y-1 transition-all duration-300",
                    service.popular
                      ? "ring-2 ring-primary shadow-lg shadow-primary/[0.1] hover:shadow-xl hover:shadow-primary/[0.15]"
                      : "shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:shadow-primary/[0.08]"
                  )}
                >
                  {service.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-lg font-medium text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex justify-center mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}20` }}
                    >
                      <service.icon className="w-7 h-7" style={{ color: service.color }} />
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">
                      {service.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  </div>

                  <div className="text-center mb-4">
                    <span className="text-3xl font-semibold">
                      {service.priceLabel || `$${service.price}`}
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">
                      AUD
                    </span>
                    {service.priceSubtext && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {service.priceSubtext}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-xs"
                      >
                        <Check
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          style={{ color: service.color }}
                        />
                        <span className="text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={cn(
                      "w-full rounded-xl h-12 font-medium",
                      service.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-foreground hover:bg-foreground/90 text-background"
                    )}
                  >
                    <Link href={service.href}>
                      Start a request
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.06] rounded-full px-3 py-1.5 border border-border/50">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span>AHPRA registered doctors</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.06] rounded-full px-3 py-1.5 border border-border/50">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Same-day response</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.06] rounded-full px-3 py-1.5 border border-border/50">
                <Zap className="w-3.5 h-3.5 text-success" />
                <span className="text-success font-medium">
                  100% refund guarantee
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Doctor Credibility */}
        <DoctorCredibility
          variant="inline"
          stats={["experience", "approval", "reviews"]}
          className="max-w-3xl mx-auto px-4 sm:px-6 pb-8"
        />

        {/* Comparison Table */}
        <ComparisonTable
          pill="Why InstantMed?"
          title="How we compare to a GP visit"
          highlightWords={["compare"]}
          subtitle="Same quality care, without the waiting room."
          usLabel="InstantMed"
          themLabel="GP clinic"
          items={comparisonItems}
        />

        {/* Pricing Guide */}
        <PricingGuideSection />

        {/* FAQ */}
        <AccordionSection
          title="Common questions"
          subtitle="Everything you need to know about our pricing."
          highlightWords={["questions"]}
          groups={pricingFaqs}
        />

        {/* Regulatory Partners */}
        <RegulatoryPartners className="py-12" />

        {/* CTA */}
        <CTABanner
          title="Ready to get started?"
          subtitle="Get started in under 2 minutes. Only pay if we can help."
          ctaText="Start a consult"
          ctaHref="/medical-certificate"
        />
      </main>

      {/* Sticky mobile CTA — appears when pricing cards scroll out of view */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
            initial={prefersReducedMotion ? {} : { y: 100 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="bg-white/95 dark:bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg px-4 pt-2.5 pb-3 safe-area-pb">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {PRICING_DISPLAY.FROM_MED_CERT}
                </p>
                <Button asChild size="sm" className="shrink-0 shadow-md shadow-primary/20">
                  <Link href="/request">
                    Get started
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MarketingFooter />
    </div>
  )
}
