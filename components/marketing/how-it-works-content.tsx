"use client"

import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { CenteredHero } from "@/components/heroes"
import { Timeline, FeatureGrid, CTABanner } from "@/components/sections"
import {
  Clock,
  Shield,
  CreditCard,
  Send,
} from "lucide-react"

/* ────────────────────────────── Data ────────────────────────────── */

const processSteps = [
  {
    title: "Tell us what you need",
    description:
      "Pick your service and answer a few quick questions. We collect the information a doctor needs to properly assess your request. Takes about 2 minutes.",
  },
  {
    title: "A real doctor reviews it",
    description:
      "An Australian doctor reviews your request and medical history. If they need more information, they\u2019ll reach out to you directly. Usually within 2\u20134 hours.",
  },
  {
    title: "Get your document",
    description:
      "If approved: med cert emailed as PDF, script sent as e-prescription to any pharmacy. If not approved, you get a full refund.",
  },
]

const features = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "24hr guarantee",
    description:
      "Response within 24 hours or your money back. No exceptions.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "AHPRA registered",
    description:
      "All our doctors are registered with AHPRA. We checked.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "No subscriptions",
    description:
      "Pay per consult. No monthly fees, no hidden charges.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Digital delivery",
    description:
      "Everything sent via email or SMS. No app needed.",
  },
]

/* ────────────────────────────── Component ────────────────────────────── */

export function HowItWorksContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <CenteredHero
          pill="How It Works"
          title="Healthcare that fits your life"
          highlightWords={["your life"]}
          subtitle="Submit your request online. A real Australian doctor reviews it and determines the best way to help you. Convenient, but still thorough."
        />

        {/* Process Steps */}
        <Timeline
          pill="3 simple steps"
          title="Three steps. That's it."
          highlightWords={["steps"]}
          subtitle="No hidden steps, no surprises, no catch."
          steps={processSteps}
        />

        {/* Features */}
        <FeatureGrid
          pill="Why InstantMed?"
          title="Why Aussies trust us"
          highlightWords={["trust"]}
          subtitle="Real reasons, not marketing fluff."
          features={features}
          columns={4}
        />

        {/* CTA */}
        <CTABanner
          title="Skip the waiting room"
          subtitle="Choose what you need and we'll handle the rest. Most requests are done within an hour."
          ctaText="Get Med Cert"
          ctaHref="/medical-certificate"
          secondaryText="Get Script"
          secondaryHref="/prescriptions"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
