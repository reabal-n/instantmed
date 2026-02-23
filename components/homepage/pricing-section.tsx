"use client"


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
      "eScript to your phone",
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
              <div
                className={`p-6 relative bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow ${plan.popular ? "ring-2 ring-primary/50 border-primary/20" : "border-border"}`}
              >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-linear-to-r from-primary to-[#4f46e5] text-white text-xs font-semibold px-3 py-1 rounded-full">
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
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-full" variant={plan.popular ? "default" : "outline"}>
                  <Link href={plan.href}>
                    Start a request
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  )
}
