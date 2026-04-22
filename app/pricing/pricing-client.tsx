"use client"

import { AnimatePresence,motion } from "framer-motion"
import { ArrowRight, Check, Clock, Gift, Shield, Star, Zap } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { StatsHero } from "@/components/heroes"
import { ServiceIconTile } from "@/components/icons/service-icons"
import { DoctorCredibility, RegulatoryPartners } from "@/components/marketing"
import { CompetitorLinksSection, PricingGuideSection } from "@/components/marketing/sections"
import { ComparisonBar, InformationalPageShell, TestimonialCard } from "@/components/marketing/shared"
import { ComparisonTable, CTABanner,FAQSection } from "@/components/sections"
import { FAQSchema } from "@/components/seo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"
import { getFeaturedTestimonials } from "@/lib/data/testimonials"
import { getPatientCount,SOCIAL_PROOF } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

/* ────────────────────────────── Data ────────────────────────────── */

// Pricing card services. Icon + colour tokens sourced from canonical
// service-catalog; hex `color` retained for legacy checkmark + button
// variants (cleaned up in Phase 2 sweep).
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
    iconKey: "FileText",
    colorToken: "emerald",
    color: "#059669",
    cta: `Get your certificate - $${PRICING.MED_CERT}`,
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
    iconKey: "Pill",
    colorToken: "cyan",
    color: "#0284C7",
    cta: `Renew medication - $${PRICING.REPEAT_SCRIPT}`,
  },
  {
    name: "Consultation",
    price: PRICING.HAIR_LOSS,
    priceLabel: `From $${PRICING.HAIR_LOSS}`,
    priceSubtext: `Hair loss: $${PRICING.HAIR_LOSS} · Weight loss: $${PRICING.WEIGHT_LOSS}`,
    description: "New scripts, specialist areas",
    features: [
      "Hair loss & weight management",
      "New medication prescribing",
      "Doctor-led treatment plans",
      "Ongoing support available",
    ],
    popular: false,
    href: "/consult",
    iconKey: "Stethoscope",
    colorToken: "sky",
    color: "#0284C7",
    cta: `Start assessment - from $${PRICING.HAIR_LOSS}`,
  },
]

const comparisonItems = [
  { label: "No appointment needed", us: true, them: false },
  { label: "Available 7 days a week", us: true, them: false },
  { label: "AHPRA-registered doctors", us: true, them: true },
  { label: "Same-day turnaround", us: true, them: false },
  { label: "Full refund if declined", us: true, them: false },
  { label: "No lock-in contracts", us: true, them: false },
  { label: "Accepted by all employers", us: true, them: true },
  { label: "E-scripts to any pharmacy", us: true, them: false },
]

const pricingFaqs = [
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
          "Yes. You\u2019ll receive a tax invoice via email after payment. Whether your health insurer reimburses telehealth consultations depends on your policy and fund - check with your insurer directly. We provide the documentation either way.",
      },
      {
        question: "Why isn\u2019t this covered by Medicare?",
        answer:
          "Most asynchronous telehealth services in Australia operate outside of Medicare. Medicare item numbers are structured around real-time consultations with an established provider-patient relationship. Our service (where a doctor reviews your request without a scheduled appointment) doesn\u2019t fit existing Medicare billing categories. This is standard across the telehealth industry, not specific to us.",
      },
      {
        question: "Do I need a Medicare card to use InstantMed?",
        answer:
          "Not for medical certificates. For prescriptions and consultations, a Medicare card is required so we can verify your identity and ensure continuity of care. If you hold an international student visa or don\u2019t have Medicare, you can still access medical certificates.",
      },
      {
        question: "How much do prescriptions cost at the pharmacy?",
        answer:
          "Our fee covers the doctor\u2019s review and eScript generation only. Medication costs are separate and paid at your pharmacy. From 1 January 2026, PBS medications cost up to $25.00 for general patients ($7.70 for concession card holders, frozen until 2030). Without Medicare, you\u2019ll pay the full retail price. Your pharmacist can confirm the exact cost before you purchase. Source: pbs.gov.au/info/healthpro/explanatory-notes/front/fee",
      },
      {
        question: "Is there a fee for follow-up questions?",
        answer:
          "No. If the reviewing doctor needs more information to make a clinical decision about your request, that follow-up is included in your original consultation fee. You won\u2019t be charged extra for the doctor doing their job properly.",
      },
      {
        question: "Do you offer discounts for students or concession card holders?",
        answer:
          "Our pricing is already designed to be accessible, significantly less than the average out-of-pocket cost of a private GP visit. We don\u2019t currently offer tiered pricing by concession status, but we\u2019re exploring this for the future. If cost is a barrier, reach out to us at support@instantmed.com.au.",
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
          "Each request must be submitted by, or on behalf of, the individual patient. You can submit a request for a dependent (such as a child with parental consent), but each person needs their own profile. You can\u2019t use a single account to get certificates for multiple adults.",
      },
]

const pricingTestimonials = getFeaturedTestimonials().slice(0, 3)

const PRICING_CONFIG = {
  analyticsId: "pricing" as const,
  sticky: false as const,
}

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

  return (
    <InformationalPageShell config={PRICING_CONFIG}>
      {() => (
        <>
        <FAQSchema faqs={pricingFaqs} />

        {/* Hero */}
        <StatsHero
          pill="Simple pricing"
          title="Pay per consult. No hidden fees."
          highlightWords={["hidden fees"]}
          subtitle="Transparent pricing with no hidden fees. Only pay when you need care - and only if we can help."
          stats={[
            { value: SOCIAL_PROOF.refundPercent, suffix: "%", label: "Refund if declined" },
            { value: 0, prefix: "$", label: "Hidden fees" },
            { value: SOCIAL_PROOF.operatingDays, label: "Days a week" },
          ]}
        />

        {/* Pricing Cards */}
        <section ref={pricingCardsRef} className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
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
                    <ServiceIconTile iconKey={service.iconKey} color={service.colorToken} size="lg" variant="sticker" stickerLoading="eager" />
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
                    variant={service.popular ? "default" : "outline"}
                    className={cn(
                      "w-full rounded-xl h-12 font-medium",
                      service.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        : service.color === "#059669"
                          ? "border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950"
                          : "border-border hover:bg-muted"
                    )}
                  >
                    <Link href={service.href}>
                      {service.cta}
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

            {/* Express Review callout */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                <Zap className="inline w-3.5 h-3.5 text-amber-500 mr-1 -mt-0.5" />
                Need it faster? Add <span className="font-medium text-foreground">Express Review</span> at checkout for{" "}
                <span className="font-medium text-foreground">${PRICING.PRIORITY_FEE.toFixed(2)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                <Gift className="inline w-3.5 h-3.5 text-primary mr-1 -mt-0.5" />
                Refer a friend and you both get <span className="font-medium text-foreground">$5 credit</span>
              </p>
            </div>
          </div>
        </section>

        {/* Doctor Credibility */}
        <DoctorCredibility
          variant="inline"
          stats={["experience", "approval", "reviews"]}
          className="max-w-3xl mx-auto px-4 sm:px-6 pb-8"
        />

        {/* Cost Comparison Viz */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <section className="py-12 lg:py-16 px-4 sm:px-6">
            <div className="mx-auto max-w-xl">
              <div className="text-center mb-6">
                <SectionPill>Why go online?</SectionPill>
              </div>
              <div className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
                <ComparisonBar
                  us={{
                    label: "InstantMed",
                    value: PRICING_DISPLAY.FROM_MED_CERT,
                    subtext: "All-inclusive, no extra charges",
                  }}
                  them={{
                    label: "GP clinic visit",
                    value: SOCIAL_PROOF.gpPriceStandard,
                    subtext: "Plus travel, wait time, and time off work",
                  }}
                  ratio={0.3}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Testimonial Strip */}
        <section className="py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <SectionPill>Patient feedback</SectionPill>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-3">
                What patients say about our pricing
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {pricingTestimonials.map((t) => (
                <TestimonialCard
                  key={t.id}
                  variant="compact"
                  testimonial={{
                    name: t.name,
                    quote: t.text,
                    rating: t.rating,
                    location: t.location,
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
        <ComparisonTable
          pill="Why InstantMed?"
          title="How we compare to a GP visit"
          highlightWords={["compare"]}
          subtitle="Same quality care, without the waiting room."
          usLabel="InstantMed"
          themLabel="GP clinic"
          items={comparisonItems}
        />
        </div>

        {/* Pricing Guide */}
        <PricingGuideSection />

        {/* FAQ */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
        <FAQSection
          title="Common questions"
          subtitle="Everything you need to know about our pricing."
          highlightWords={["questions"]}
          items={pricingFaqs}
        />
        </div>

        {/* Competitor comparisons */}
        <CompetitorLinksSection />

        {/* Regulatory Partners */}
        <RegulatoryPartners className="py-12" />

        {/* CTA */}
        <CTABanner
          title="Ready to get started?"
          subtitle={`Trusted by ${getPatientCount().toLocaleString()}+ Australians. Get started in under 2 minutes. Only pay if we can help.`}
          ctaText="Start a consult"
          ctaHref="/medical-certificate"
        />

        {/* Sticky mobile CTA - appears when pricing cards scroll out of view */}
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
        </>
      )}
    </InformationalPageShell>
  )
}
