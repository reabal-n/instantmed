"use client"

import { HolographicCard } from "@/components/effects/holographic-card"
import { SectionPill } from "@/components/ui/section-pill"
import { BlurFade } from "@/components/ui/blur-fade"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const pricingPlans = [
  {
    name: "Medical Certificate",
    price: "$29",
    description: "Sick? Need proof for work?",
    features: [
      "Reviewed in about an hour",
      "Valid for all employers",
      "Emailed as a PDF",
      "Backdating if appropriate",
    ],
    popular: true,
    href: "/medical-certificate",
  },
  {
    name: "Prescription",
    price: "$39",
    description: "Need your regular meds?",
    features: [
      "Sent to your pharmacy",
      "Repeats when suitable",
      "Works with any chemist",
      "eScript or paper",
    ],
    popular: false,
    href: "/prescriptions",
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <BlurFade delay={0.1}>
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <SectionPill emoji="💰" text="Simple pricing" hoverText="No hidden fees" />
            </div>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Simple, upfront pricing
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. You only pay if a doctor can help. Full refund otherwise.
            </p>
          </div>
        </BlurFade>

        <div className="grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          {pricingPlans.map((plan, i) => (
            <BlurFade key={plan.name} delay={0.1 + i * 0.1}>
              <HolographicCard
                hover
                intensity={plan.popular ? "high" : "medium"}
                className={`p-6 relative ${plan.popular ? "ring-2 ring-[#00E2B5]/50" : ""}`}
              >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-linear-to-r from-[#00E2B5] to-[#06B6D4] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-[#00E2B5] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-full" variant={plan.popular ? "default" : "outline"}>
                  <Link href={plan.href}>
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </HolographicCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
