import Link from "next/link"
import { ArrowRight, Star, Sparkles, Grid3x3, Heart, HelpCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { HeroTypewriter } from "@/components/homepage/hero-typewriter"
import { ConditionGrid } from "@/components/homepage/condition-grid"
import { TrustSection } from "@/components/homepage/trust-section"
import { TestimonialCarousel } from "@/components/homepage/social-proof"
import { DynamicSocialProof, DynamicStatsBar } from "@/components/homepage/dynamic-social-proof"
import { HolographicCard } from "@/components/effects/holographic-card"
import LiveVisitorCounter from "@/components/ui/live-visitor"
import { AuroraBackground } from "@/components/effects/aurora-background"
import { SectionPill } from "@/components/ui/section-pill"
import { FeaturesSection } from "@/components/homepage/features-section"
import { FAQAccordion } from "@/components/homepage/faq-accordion"
import { FileText, Pill, Stethoscope, Clock, Shield } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />
      <DynamicSocialProof />

      <main className="flex-1 pt-20">
        {/* Hero - search/browse focused */}
        <section className="relative px-4 py-16 sm:py-24 overflow-hidden">
          <AuroraBackground>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="hero-orb hero-orb-mint w-[500px] h-[500px] top-10 left-10 opacity-40" />
              <div
                className="hero-orb hero-orb-cyan w-[400px] h-[400px] top-40 right-20 opacity-30"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </AuroraBackground>

          <div className="mx-auto max-w-4xl text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border-white/20 mb-6 animate-fade-in-down">
              <Sparkles className="h-3.5 w-3.5 text-[#00e2b5]" />
              <span className="text-sm font-medium">Australia&apos;s fastest online doctor</span>
            </div>

            <HeroTypewriter />

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up stagger-2">
              <Button size="lg" asChild className="rounded-full btn-premium px-8 text-base">
                <Link href="/start">
                  Browse treatments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-full px-8 text-base backdrop-blur-xl bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/30 border-white/40"
              >
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-fade-in-up stagger-3">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <span className="font-medium">4.9/5 from 200+ reviews</span>
              </div>
              <span className="text-border">•</span>
              <span>AHPRA-registered GPs</span>
              <span className="text-border">•</span>
              <span>Average 45min response</span>
            </div>

            {/* Live Visitor Counter */}
            <div className="mt-12 flex justify-center animate-fade-in-up stagger-4">
              <LiveVisitorCounter />
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <DynamicStatsBar />

        {/* Condition Grid - Netflix style browse */}
        <section id="conditions" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <SectionPill icon={<Grid3x3 className="h-3.5 w-3.5" />} text="Browse treatments" />
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Browse treatments
              </h2>
              <p className="text-sm text-muted-foreground">
                Click what you need. Fill a quick form. Doctor reviews it. Done.
              </p>
            </div>
            <ConditionGrid />
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-4">
                <SectionPill icon={<Zap className="h-3.5 w-3.5" />} text="Our services" />
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Telehealth services made simple
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                No calls needed. AHPRA registered doctors review and approve (if appropriate) within 1 hour.
              </p>
            </div>
            <FeaturesSection />
          </div>
        </section>

        {/* Trust section - rewritten with personality */}
        <TrustSection />

        {/* How it works - simplified */}
        <section id="how-it-works" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-4">
                <SectionPill icon={<Sparkles className="h-3.5 w-3.5" />} text="Simple process" />
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                How it works
              </h2>
              <p className="text-sm text-muted-foreground">Three steps. No phone calls. No video chats.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Pick & fill",
                  description: "Choose what you need, answer a few quick questions. Takes about 2 minutes.",
                  color: "#00E2B5",
                  icon: <FileText className="h-8 w-8 text-[#00E2B5]" />,
                },
                {
                  step: "2",
                  title: "Doctor reviews",
                  icon: <Stethoscope className="h-8 w-8 text-[#00E2B5]" />,
                  description: "A real AHPRA-registered GP reviews your request. They may ask follow-up questions.",
                  color: "#06B6D4",
                },
                {
                  step: "3",
                  title: "Get your document",
                  description: "If approved, your script/cert/referral is emailed to you. Usually within an hour.",
                  color: "#8B5CF6",
                  icon: <Zap className="h-8 w-8 text-[#8B5CF6]" />,
                },
              ].map((item, i) => (
                <HolographicCard key={item.step} hover intensity="medium" className="p-6">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="flex-shrink-0">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </HolographicCard>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button size="lg" asChild className="rounded-full btn-premium px-8">
                <Link href="/start">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <SectionPill icon={<Heart className="h-3.5 w-3.5" />} text="Patient stories" />
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Loved by Australians
              </h2>
              <p className="text-sm text-muted-foreground">4.9/5 from 200+ reviews</p>
            </div>
            <TestimonialCarousel />
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <div className="flex justify-center mb-4">
                <SectionPill icon={<HelpCircle className="h-3.5 w-3.5" />} text="Got questions?" />
              </div>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Frequently asked questions
              </h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to know about our telehealth services
              </p>
            </div>
            <HolographicCard hover intensity="low" className="p-8">
              <FAQAccordion limit={6} />
            </HolographicCard>
            <div className="mt-8 text-center">
              <Button variant="outline" asChild className="rounded-full">
                <Link href="/faq">View all FAQs</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <HolographicCard hover intensity="high" className="text-center p-12">
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Ready to skip the waiting room?
              </h2>
              <p className="text-muted-foreground mb-8">Join 10,000+ Aussies who&apos;ve ditched the GP queue.</p>
              <Button
                size="lg"
                asChild
                className="rounded-full bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 dark:bg-white dark:hover:bg-white/90 dark:text-[#0A0F1C] text-white font-semibold px-8"
              >
                <Link href="/start">
                  Browse treatments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </HolographicCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
