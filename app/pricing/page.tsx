import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { AnimatedIcon } from "@/components/shared/animated-icons"
import { GlowCard } from "@/components/ui/spotlight-card"
import { ParallaxSection } from "@/components/ui/parallax-section"
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
    color: "#2563EB",
  },
  {
    name: "Prescription",
    price: 29.95,
    description: "Repeat scripts for ongoing meds",
    features: ["E-script to your phone", "Any pharmacy Australia-wide", "Fast turnaround", "SMS token delivery"],
    popular: false,
    href: "/prescriptions",
    iconType: "pill" as const,
    color: "#4f46e5",
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
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero */}
        <ParallaxSection speed={0.2}>
          <section className="relative px-4 py-12 sm:px-6 sm:py-16 overflow-hidden">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4 interactive-pill cursor-default">
                <BadgeCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground/80">Simple pricing</span>
              </div>
              <h1
                className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pay per consult. <span className="text-premium-gradient">No subscriptions.</span>
              </h1>
              <p className="mx-auto max-w-xl text-pretty text-sm text-muted-foreground">
                Transparent pricing with no hidden fees. Only pay when you need care — and only if we can help.
              </p>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* Pricing Cards */}
        <ParallaxSection speed={0.25}>
          <section className="px-4 py-12 sm:px-6">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {services.map((service, idx) => (
                <GlowCard
                  key={service.name}
                  glowColor={service.color === '#2563EB' ? 'blue' : 'purple'}
                  customSize={true}
                  className={`card-premium rounded-2xl p-5 lg:p-6 animate-fade-in-up opacity-0 relative ${
                    service.popular ? "ring-2 ring-[#2563EB] shadow-premium-xl" : "shadow-premium-lg"
                  }`}
                  style={{ animationDelay: `${0.1 + idx * 0.1}s`, animationFillMode: "forwards" }}
                >
                  {service.popular && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#2563EB] text-[#0A0F1C] shadow-lg font-medium text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex justify-center mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${service.color}20` }}
                    >
                      <AnimatedIcon type={service.iconType} size={32} />
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {service.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                  </div>

                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold">${service.price}</span>
                    <span className="text-muted-foreground ml-1 text-sm">AUD</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: service.color }} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-xl h-12 font-medium magnetic-button ${
                      service.popular
                        ? "btn-premium text-[#0A0F1C] shadow-lg shadow-[#2563EB]/20 glow-pulse"
                        : "bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white"
                    }`}
                  >
                    <Link href={service.href}>
                      Get started
                      <ArrowRight className="ml-2 h-4 w-4 icon-spin-hover" />
                    </Link>
                  </Button>
                </GlowCard>
              ))}
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-divider/50">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>AHPRA registered doctors</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-divider/50">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Same-day response</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-divider/50">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>100% refund guarantee</span>
                </div>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* FAQ */}
        <ParallaxSection speed={0.2}>
          <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-3xl p-4 lg:p-6 relative overflow-hidden">
              <h2 className="text-2xl font-semibold text-center mb-6" style={{ fontFamily: "var(--font-display)" }}>
                Common questions
              </h2>
              <div className="space-y-3 max-w-2xl mx-auto">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-content1/50 backdrop-blur-sm border border-divider/50 rounded-xl p-4 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.4 + index * 0.1}s`, animationFillMode: "forwards" }}
                  >
                    <h3 className="text-sm font-medium mb-1">{faq.q}</h3>
                    <p className="text-xs text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>

        {/* CTA */}
        <ParallaxSection speed={0.15}>
          <section className="px-4 py-12 sm:px-6 lg:py-16">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="glass-card rounded-3xl p-6 lg:p-8 relative overflow-hidden">
                <BadgeCheck className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                  Ready to skip the waiting room?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Get started in under 2 minutes. Only pay if we can help.</p>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full btn-premium text-[#0A0F1C] font-semibold h-12 px-8 shadow-lg group"
                >
                  <Link href="/medical-certificate">
                    Start a consult
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          </section>
        </ParallaxSection>
      </main>

      <Footer />
    </div>
  )
}
