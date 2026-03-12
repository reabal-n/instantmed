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
      "Pick your service and answer a few quick questions — takes about 2 minutes. No account needed to get started.",
  },
  {
    title: "A real doctor reviews it",
    description:
      "An AHPRA-registered GP reviews your request and medical history. If they need more info, they\u2019ll reach out directly. Most reviews done within the hour.",
  },
  {
    title: "Get your document",
    description:
      "If approved: med cert emailed as PDF, medication sent to your phone for any pharmacy. If not approved, you get a full refund — no questions asked.",
  },
]

const features = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Fast turnaround",
    description:
      "Most requests reviewed within hours. If we can't help, you get a full refund.",
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
      "Pay per consult. No monthly fees, no hidden charges, no surprises.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Digital delivery",
    description:
      "Everything sent via email or SMS. No app to download, nothing to print.",
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
          title="Ready when you are"
          subtitle="Pick what you need, fill in a quick form, and a GP takes care of the rest. Most people are sorted within the hour."
          ctaText="Get Med Cert"
          ctaHref="/request?service=med-cert"
          secondaryText="Renew medication"
          secondaryHref="/request?service=prescription"
        />
      </main>

      <MarketingFooter />
    </div>
  )
}
