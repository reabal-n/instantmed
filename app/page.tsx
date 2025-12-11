import Link from "next/link"
import { ArrowRight, Star, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { HeroTypewriter } from "@/components/homepage/hero-typewriter"
import { ConditionGrid } from "@/components/homepage/condition-grid"
import { TrustSection } from "@/components/homepage/trust-section"
import { TestimonialCarousel } from "@/components/homepage/social-proof"
import { DynamicSocialProof, DynamicStatsBar } from "@/components/homepage/dynamic-social-proof"
import { GlassCard } from "@/components/effects/glass-card"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />
      <DynamicSocialProof />

      <main className="flex-1 pt-20">
        {/* Hero - search/browse focused */}
        <section className="relative px-4 py-16 sm:py-24 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="hero-orb hero-orb-mint w-[500px] h-[500px] top-10 left-10 opacity-40" />
            <div
              className="hero-orb hero-orb-cyan w-[400px] h-[400px] top-40 right-20 opacity-30"
              style={{ animationDelay: "2s" }}
            />
          </div>

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
          </div>
        </section>

        {/* Stats bar */}
        <DynamicStatsBar />

        {/* Condition Grid - Netflix style browse */}
        <section id="conditions" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
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

        {/* Quick services row */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <GlassCard className="p-6">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <span className="text-sm text-muted-foreground">Also available:</span>
                <Link
                  href="/medical-certificate"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-[#00E2B5] transition-colors"
                >
                  <span>📄</span> Med Certificates
                </Link>
                <span className="text-border">•</span>
                <Link
                  href="/referrals"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-[#00E2B5] transition-colors"
                >
                  <span>📋</span> Specialist Referrals
                </Link>
                <span className="text-border">•</span>
                <Link
                  href="/referrals/pathology-imaging"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-[#00E2B5] transition-colors"
                >
                  <span>🩸</span> Blood Tests
                </Link>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Trust section - rewritten with personality */}
        <TrustSection />

        {/* How it works - simplified */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
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
                },
                {
                  step: "2",
                  title: "Doctor reviews",
                  description: "A real AHPRA-registered GP reviews your request. They may ask follow-up questions.",
                  color: "#06B6D4",
                },
                {
                  step: "3",
                  title: "Get your document",
                  description: "If approved, your script/cert/referral is emailed to you. Usually within an hour.",
                  color: "#8B5CF6",
                },
              ].map((item, i) => (
                <GlassCard key={item.step} className={`text-center p-6 hover-lift animate-fade-in-up stagger-${i + 1}`}>
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg mb-4 glow-soft"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </GlassCard>
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
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-[#F59E0B] text-[#F59E0B]" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">4.9/5 from 200+ reviews</p>
            </div>
            <TestimonialCarousel />
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <GlassCard className="text-center p-12 glow-mint-subtle">
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
            </GlassCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
