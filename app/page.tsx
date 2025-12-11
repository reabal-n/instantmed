import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { HeroTypewriter } from "@/components/homepage/hero-typewriter"
import { ConditionGrid } from "@/components/homepage/condition-grid"
import { TrustSection } from "@/components/homepage/trust-section"
import { TestimonialCarousel } from "@/components/homepage/social-proof"
import { DynamicSocialProof, DynamicStatsBar } from "@/components/homepage/dynamic-social-proof"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar variant="marketing" />
      <DynamicSocialProof />

      <main className="flex-1 pt-20">
        {/* Hero - search/browse focused */}
        <HeroTypewriter />

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
        <section className="px-4 py-8 bg-[#FAFBFC] border-y border-border/40">
          <div className="mx-auto max-w-5xl">
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
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg mb-4"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button
                size="lg"
                asChild
                className="rounded-full bg-[#00E2B5] hover:bg-[#00C9A0] text-[#0A0F1C] font-semibold px-8"
              >
                <Link href="#conditions">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-4 py-12 sm:py-16 bg-[#FAFBFC]">
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
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-2xl font-bold tracking-tight sm:text-3xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to skip the waiting room?
            </h2>
            <p className="text-muted-foreground mb-8">Join 10,000+ Aussies who've ditched the GP queue.</p>
            <Button
              size="lg"
              asChild
              className="rounded-full bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white font-semibold px-8"
            >
              <Link href="#conditions">
                Browse treatments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
