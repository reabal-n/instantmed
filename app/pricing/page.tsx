import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { AnimatedIcon } from "@/components/shared/animated-icons"
import { Check, Zap, Shield, Clock, Star, ArrowRight, BadgeCheck } from "lucide-react"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Pricing | InstantMed",
  description: "Simple, transparent pricing for online medical consultations. No hidden fees, no subscriptions.",
}

const services = [
  {
    name: "Medical Certificate",
    price: 19.95,
    description: "Work, uni, or carer's leave",
    features: ["Same-day delivery", "Accepted by all employers", "AHPRA-registered GP", "PDF via email"],
    popular: true,
    href: "/medical-certificate",
    iconType: "medCert" as const,
    color: "#00E2B5",
  },
  {
    name: "Prescription",
    price: 29.95,
    description: "Repeat scripts for ongoing meds",
    features: ["E-script to your phone", "Any pharmacy Australia-wide", "Fast turnaround", "SMS token delivery"],
    popular: false,
    href: "/prescriptions",
    iconType: "pill" as const,
    color: "#06B6D4",
  },
]

const faqs = [
  {
    q: "Are there any hidden fees?",
    a: "Nope. The price you see is the price you pay. No subscriptions, no memberships, no surprises.",
  },
  {
    q: "What if my request is declined?",
    a: "Full refund, no questions asked. We only charge if we can actually help you.",
  },
  {
    q: "How do I pay?",
    a: "All major credit/debit cards, Apple Pay, and Google Pay. Payment is secure and encrypted.",
  },
  {
    q: "Is this covered by Medicare?",
    a: "Our service fee isn&apos;t Medicare rebateable. However, any medications prescribed through our service may be eligible for PBS subsidies where applicable.",
  },
]

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-premium-warm">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <section className="relative px-4 py-12 sm:px-6 sm:py-16 overflow-hidden">
          <div className="hero-orb hero-orb-mint w-[500px] h-[500px] -top-[200px] left-1/2 -translate-x-1/2 opacity-40" />

          <div className="relative mx-auto max-w-3xl text-center">
            <Badge className="mb-4 badge-premium text-[#00E2B5] text-sm font-medium spacing-premium">Simple pricing</Badge>
            <h1
              className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
            >
              Pay per consult. <span className="text-premium-gradient">No subscriptions.</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-xl text-pretty text-lg text-muted-foreground animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
            >
              Transparent pricing with no hidden fees. Only pay when you need care — and only if we can help.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="px-4 py-12 sm:px-6 section-premium">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {services.map((service, index) => (
                <TiltCard
                  key={service.name}
                  className={`card-premium rounded-3xl p-8 animate-fade-in-up opacity-0 relative ${
                    service.popular ? "ring-2 ring-[#00E2B5] shadow-premium-xl" : "shadow-premium-lg"
                  }`}
                  style={{ animationDelay: `${0.1 + index * 0.1}s`, animationFillMode: "forwards" }}
                >
                  {service.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00E2B5] text-[#0A0F1C] shadow-lg font-medium">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex justify-center mb-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}20` }}
                    >
                      <AnimatedIcon type={service.iconType} size={40} />
                    </div>
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold">${service.price}</span>
                    <span className="text-muted-foreground ml-1">AUD</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: service.color }} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-xl h-12 font-medium magnetic-button ${
                      service.popular
                        ? "btn-premium text-[#0A0F1C] shadow-lg shadow-[#00E2B5]/20 glow-pulse"
                        : "bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white"
                    }`}
                  >
                    <Link href={service.href}>
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4 icon-spin-hover" />
                    </Link>
                  </Button>
                </TiltCard>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Shield className="w-4 h-4 text-[#00E2B5]" />
                <span>AHPRA registered doctors</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Clock className="w-4 h-4 text-[#06B6D4]" />
                <span>Same-day response</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Zap className="w-4 h-4 text-[#8B5CF6]" />
                <span>100% refund guarantee</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold text-center mb-8" style={{ fontFamily: "var(--font-display)" }}>
              Common questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <TiltCard
                  key={index}
                  className="glass-card rounded-2xl p-6 animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${0.4 + index * 0.1}s`, animationFillMode: "forwards" }}
                >
                  <h3 className="font-medium">{faq.q}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <TiltCard className="glass-card rounded-3xl p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-[#00E2B5]/10 via-transparent to-[#06B6D4]/10 pointer-events-none" />
              <div className="relative">
                <BadgeCheck className="h-12 w-12 text-[#00E2B5] mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
                  Ready to skip the waiting room?
                </h2>
                <p className="text-muted-foreground mb-8">Get started in under 2 minutes. Only pay if we can help.</p>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full btn-premium text-[#0A0F1C] font-semibold h-14 px-10 shadow-lg group"
                >
                  <Link href="/medical-certificate">
                    Start a consult
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </TiltCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
