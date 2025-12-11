import Link from "next/link"
import Image from "next/image"
import { ArrowRight, CheckCircle2, Star, Clock, Sparkles, MessageCircle, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import { AnimatedIcon } from "@/components/shared/animated-icons"
import { HeroTypewriter } from "@/components/homepage/hero-typewriter"
import { ServiceCards } from "@/components/homepage/service-cards"
import { StatsBar, TestimonialCarousel } from "@/components/homepage/social-proof"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-hero">
      <Navbar variant="marketing" />

      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative px-4 py-16 sm:px-6 lg:py-28 overflow-hidden">
          {/* Floating orbs */}
          <div className="hero-orb hero-orb-mint w-[600px] h-[600px] -top-[200px] left-1/4 opacity-60" />
          <div
            className="hero-orb hero-orb-cyan w-[400px] h-[400px] bottom-0 right-1/4 opacity-40"
            style={{ animationDelay: "-2s" }}
          />

          <HeroTypewriter />

          <StatsBar />

          <div className="relative mx-auto max-w-4xl text-center">
            <div
              className="inline-flex items-center gap-2 rounded-full bg-[#0A0F1C] px-4 py-2 text-sm font-medium text-white mb-6 animate-fade-in-up opacity-0"
              style={{ animationDelay: "0s", animationFillMode: "forwards" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E2B5] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E2B5]"></span>
              </span>
              Doctors available 8am – 10pm AEST
            </div>

            <h1
              className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.1s", animationFillMode: "forwards", fontFamily: "var(--font-display)" }}
            >
              Feeling crook? <span className="text-gradient-mint">Get sorted fast.</span>
            </h1>

            <p
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
            >
              Med certificates, scripts, and referrals — reviewed by real AHPRA-registered doctors. Submit your request
              online and a doctor will assess your situation. They may contact you if needed. Most requests completed
              within 1 hour (8am–10pm). Medicare card required.
            </p>

            <div
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}
            >
              <Button
                size="lg"
                asChild
                className="w-full sm:w-auto px-8 rounded-full btn-premium text-[#0A0F1C] font-semibold text-base h-14 shadow-lg group"
              >
                <Link href="#services">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="w-full sm:w-auto px-8 rounded-full bg-white/60 backdrop-blur-sm border-[#0A0F1C]/10 hover:bg-white/80 hover:border-[#0A0F1C]/20 transition-all h-14 text-base font-medium"
              >
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm animate-fade-in-up opacity-0"
              style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <CheckCircle2 className="h-4 w-4 text-[#00E2B5]" />
                <span className="font-medium">AHPRA-registered doctors</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Clock className="h-4 w-4 text-[#06B6D4]" />
                <span className="font-medium">Usually within 1 hour</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-[#0A0F1C]/5">
                <Star className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="font-medium">4.9/5 (200+ reviews)</span>
              </div>
            </div>
          </div>

          {/* Floating mockup card with real content */}
          <div
            className="relative mx-auto mt-12 max-w-sm animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.5s", animationFillMode: "forwards" }}
          >
            <TiltCard className="glass-card rounded-2xl p-5 animate-float">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Medical Certificate
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/10 px-2.5 py-1 text-xs font-medium text-[#10B981]">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 bg-[#0A0F1C]/10 rounded-full flex-1" />
                  <span className="text-xs text-muted-foreground">2 days</span>
                </div>
                <div className="h-2.5 bg-[#0A0F1C]/5 rounded-full w-3/4" />
                <div className="h-2.5 bg-[#0A0F1C]/5 rounded-full w-1/2" />
              </div>
              <div className="mt-4 pt-4 border-t border-[#0A0F1C]/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 rounded-full overflow-hidden ring-2 ring-[#00E2B5]/30">
                    <Image
                      src="/female-doctor-professional-headshot-warm-smile-aus.jpg"
                      alt="Dr. Sarah Chen"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Dr. Sarah Chen</p>
                    <p className="text-[10px] text-muted-foreground">Reviewed just now</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-7 text-xs rounded-full bg-[#00E2B5] hover:bg-[#00C9A0] text-[#0A0F1C] font-light"
                >
                  {"Online"}
                </Button>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="px-4 py-16 sm:px-6 lg:py-24 bg-mesh">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <span className="inline-block text-sm font-medium text-[#00E2B5] mb-3 uppercase tracking-wide">
                Our Services
              </span>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                What can we help with?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Fill out a short form. A real AHPRA-registered doctor reviews your request and sends your document —
                usually within 1 hour (8am–10pm). Medicare card required.
              </p>
            </div>

            <ServiceCards />
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <span className="inline-block text-xs font-medium text-[#06B6D4] mb-2 uppercase tracking-wide">
                How it works
              </span>
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Simple, secure, doctor-reviewed
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Step 1 */}
              <TiltCard className="glass-card rounded-xl p-6 text-center relative overflow-visible">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#00E2B5] text-[#0A0F1C] flex items-center justify-center font-bold text-sm shadow-lg">
                  1
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00E2B5]/20 to-[#00E2B5]/5 flex items-center justify-center">
                    <MessageCircle className="h-7 w-7 text-[#00E2B5]" />
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Fill out a form
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Takes 2 minutes. We collect what a doctor needs to assess your request.
                </p>
              </TiltCard>

              {/* Step 2 */}
              <TiltCard className="glass-card rounded-xl p-6 text-center relative overflow-visible">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#06B6D4] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  2
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-[#06B6D4]/5 flex items-center justify-center overflow-hidden">
                    <AnimatedIcon type="doctor" size={36} />
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  A real doctor reviews
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  An AHPRA-registered GP reviews everything. Not automated.
                </p>
              </TiltCard>

              {/* Step 3 */}
              <TiltCard className="glass-card rounded-xl p-6 text-center relative overflow-visible">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-bold text-sm shadow-lg">
                  3
                </div>
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/5 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-[#8B5CF6]" />
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  Get your document
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Most done within 1 hour (8am–10pm). Delivered to your inbox.
                </p>
              </TiltCard>
            </div>

            <div className="mt-8 text-center">
              <Button
                size="lg"
                asChild
                className="rounded-full btn-premium text-[#0A0F1C] font-semibold text-sm h-12 px-8 shadow-lg group"
              >
                <Link href="/auth/register">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">Medicare card required. Only pay if approved.</p>
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="px-4 py-12 sm:py-16 bg-[#0A0F1C] text-white">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Why Aussies trust InstantMed
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4">
                <div className="flex justify-center mb-3">
                  <div className="w-11 h-11 rounded-lg bg-[#00E2B5]/20 flex items-center justify-center">
                    <AnimatedIcon type="clock" size={28} />
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">Fast turnaround</h3>
                <p className="text-white/70 text-xs">Usually within 1 hour</p>
              </div>

              <div className="text-center p-4">
                <div className="flex justify-center mb-3">
                  <div className="w-11 h-11 rounded-lg bg-[#06B6D4]/20 flex items-center justify-center overflow-hidden">
                    <AnimatedIcon type="doctor" size={28} />
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">Real doctors</h3>
                <p className="text-white/70 text-xs">AHPRA-registered GPs</p>
              </div>

              <div className="text-center p-4">
                <div className="flex justify-center mb-3">
                  <div className="w-11 h-11 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center overflow-hidden">
                    <AnimatedIcon type="lock" size={28} />
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">Secure & private</h3>
                <p className="text-white/70 text-xs">Encrypted & protected</p>
              </div>

              <div className="text-center p-4">
                <div className="flex justify-center mb-3">
                  <div className="w-11 h-11 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-[#F59E0B]" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">No surprises</h3>
                <p className="text-white/70 text-xs">Only pay if approved</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="px-4 py-16 sm:px-6 lg:py-24 bg-mesh overflow-hidden">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <span className="inline-block text-sm font-medium text-[#00E2B5] mb-3 uppercase tracking-wide">
                Patient experiences
              </span>
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Hear from real patients
              </h2>
            </div>
          </div>

          <TestimonialCarousel />

          <div className="text-center mt-8">
            <Link href="/reviews" className="text-sm font-medium text-[#00E2B5] hover:underline">
              Read all reviews →
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <TiltCard className="glass-card rounded-2xl p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00E2B5]/10 via-transparent to-[#06B6D4]/10 pointer-events-none" />

              <div className="relative">
                <h2
                  className="text-2xl font-bold tracking-tight sm:text-3xl mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Ready to get sorted?
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  No phone calls. No video consults. Fill out a form and a real doctor reviews it — usually within an
                  hour.
                </p>
                <Button
                  size="lg"
                  asChild
                  className="rounded-full btn-premium text-[#0A0F1C] font-semibold text-sm h-12 px-8 shadow-lg group"
                >
                  <Link href="#services">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">Medicare card required. Only pay if approved.</p>
              </div>
            </TiltCard>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
