"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { StatsHero } from "@/components/heroes"
import { ComparisonTable, AccordionSection, CTABanner } from "@/components/sections"
import { Check, Star, ArrowRight, Shield, Clock, Zap, FileText, Pill } from "lucide-react"
import { PRICING } from "@/lib/constants"
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
      "Fast turnaround",
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
        question: "How do I pay?",
        answer:
          "All major credit/debit cards, Apple Pay, and Google Pay. Payment is secure and encrypted.",
      },
      {
        question: "Is this covered by Medicare?",
        answer:
          "Our service fee isn\u2019t Medicare rebateable. However, any medications prescribed through our service may be eligible for PBS subsidies where applicable.",
      },
    ],
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export function PricingClient() {
  return (
    <div className="flex min-h-screen flex-col">
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
        <section className="px-4 py-16 sm:px-6">
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
                    <span className="text-3xl font-bold">
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

        {/* FAQ */}
        <AccordionSection
          title="Common questions"
          subtitle="Everything you need to know about our pricing."
          highlightWords={["questions"]}
          groups={pricingFaqs}
        />

        {/* CTA */}
        <CTABanner
          title="Ready to get started?"
          subtitle="Get started in under 2 minutes. Only pay if we can help."
          ctaText="Start a consult"
          ctaHref="/medical-certificate"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
