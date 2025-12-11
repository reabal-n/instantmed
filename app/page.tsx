import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star, Sparkles, Grid3x3, Heart, HelpCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { HeroSection } from "@/components/homepage/hero-section"
import { ConditionGrid } from "@/components/homepage/condition-grid"
import { TrustSection } from "@/components/homepage/trust-section"
import { TestimonialCarousel } from "@/components/homepage/social-proof"
import { DynamicSocialProof, DynamicStatsBar } from "@/components/homepage/dynamic-social-proof"
import { HolographicCard } from "@/components/effects/holographic-card"
import { SectionPill } from "@/components/ui/section-pill"
import { FeaturesSection } from "@/components/homepage/features-section"
import { FAQAccordion } from "@/components/homepage/faq-accordion"
import { PricingSection } from "@/components/homepage/pricing-section"
import { StatsSection } from "@/components/homepage/stats-section"
import { BenefitsSection } from "@/components/homepage/benefits-section"
import { RainbowButton } from "@/components/ui/rainbow-button"
import { SparklesText } from "@/components/ui/sparkles-text"
import { BlurFade } from "@/components/ui/blur-fade"
import { FileText, Pill, Stethoscope, Clock, Shield } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />
      <DynamicSocialProof />

      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Stats bar */}
        <DynamicStatsBar />

        {/* Stats Section */}
        <StatsSection />

        {/* Condition Grid - Netflix style browse */}
        <section id="conditions" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-5xl">
            <BlurFade delay={0.1}>
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
            </BlurFade>
            <ConditionGrid />
          </div>
        </section>

        {/* Features Section */}
        <FeaturesSection />

        {/* Benefits Section */}
        <BenefitsSection />

        {/* Trust section - rewritten with personality */}
        <TrustSection />

        {/* How it works - with images */}
        <section id="how-it-works" className="px-4 py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#00E2B5]/5 via-transparent to-[#8B5CF6]/5" />
          
          <div className="mx-auto max-w-7xl relative z-10">
            <BlurFade delay={0.1}>
              <div className="text-center mb-16">
                <div className="flex justify-center mb-4">
                  <SectionPill icon={<Sparkles className="h-3.5 w-3.5" />} text="Simple process" />
                </div>
                <h2
                  className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Three steps.{" "}
                  <span className="bg-gradient-to-r from-[#00E2B5] to-[#8B5CF6] bg-clip-text text-transparent">
                    That&apos;s it.
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  No phone calls. No video chats. No leaving your couch.
                </p>
              </div>
            </BlurFade>

            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Tell us what you need",
                  description: "Choose your service and answer a few quick questions. Takes about 2 minutes.",
                  image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop",
                  color: "#00E2B5",
                },
                {
                  step: "02",
                  title: "A real doctor reviews",
                  description: "An AHPRA-registered GP reviews your request and may ask follow-up questions.",
                  image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=300&fit=crop",
                  color: "#06B6D4",
                },
                {
                  step: "03",
                  title: "Get your document",
                  description: "If approved, your prescription, certificate, or referral is emailed to you.",
                  image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop",
                  color: "#8B5CF6",
                },
              ].map((item, i) => (
                <BlurFade key={item.step} delay={0.1 + i * 0.1}>
                  <div className="group relative">
                    {/* Connecting line */}
                    {i < 2 && (
                      <div className="hidden lg:block absolute top-1/4 -right-4 w-8 border-t-2 border-dashed border-gray-200 dark:border-gray-700 z-0" />
                    )}
                    
                    <div className="relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                      {/* Image */}
                      <div className="relative h-48 overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* Step number */}
                        <div
                          className="absolute top-4 left-4 w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}cc)` }}
                        >
                          {item.step}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                        <p className="text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  </div>
                </BlurFade>
              ))}
            </div>

            <BlurFade delay={0.4}>
              <div className="mt-12 text-center">
                <Button size="lg" asChild className="rounded-full btn-premium px-8 h-14 text-base shadow-lg shadow-[#00E2B5]/25">
                  <Link href="/start">
                    Get started now — it&apos;s free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </BlurFade>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 sm:py-28 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#00E2B5]/5 via-transparent to-[#8B5CF6]/5" />
          
          <div className="relative z-10">
            <BlurFade delay={0.1}>
              <div className="text-center mb-12 px-4">
                <div className="flex justify-center mb-4">
                  <SectionPill icon={<Heart className="h-3.5 w-3.5" />} text="Patient stories" />
                </div>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 fill-[#F59E0B] text-[#F59E0B]" />
                  ))}
                </div>
                <h2
                  className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Loved by{" "}
                  <span className="bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] bg-clip-text text-transparent">
                    Australians
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Join 10,000+ patients who&apos;ve made the switch to online healthcare
                </p>
              </div>
            </BlurFade>
            
            <TestimonialCarousel />
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* FAQ Section */}
        <section id="faq" className="px-4 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl">
            <BlurFade delay={0.1}>
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
            </BlurFade>
            <BlurFade delay={0.1}>
              <HolographicCard hover intensity="low" className="p-8">
                <FAQAccordion limit={6} />
              </HolographicCard>
            </BlurFade>
            <div className="mt-8 text-center">
              <Button variant="outline" asChild className="rounded-full">
                <Link href="/faq">View all FAQs</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA - with image */}
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <BlurFade delay={0.1}>
              <div className="relative rounded-3xl overflow-hidden">
                {/* Background image */}
                <div className="absolute inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&h=600&fit=crop"
                    alt="Healthcare professional"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E2B5]/90 via-[#06B6D4]/90 to-[#8B5CF6]/90" />
                </div>
                
                {/* Content */}
                <div className="relative z-10 px-8 py-16 sm:px-16 sm:py-24 text-center">
                  <h2
                    className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4 text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Ready to skip the waiting room?
                  </h2>
                  <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
                    Join 10,000+ Australians who&apos;ve ditched the GP queue. Get started in 2 minutes.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" asChild className="rounded-full bg-white text-gray-900 hover:bg-gray-100 px-8 h-14 text-base font-semibold shadow-xl">
                      <Link href="/start">
                        Get started for free
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="rounded-full border-2 border-white text-white hover:bg-white/10 px-8 h-14 text-base">
                      <Link href="/how-it-works">
                        Learn more
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Trust badges */}
                  <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
                    <div className="flex items-center gap-2 text-white/90">
                      <Shield className="h-5 w-5" />
                      <span className="text-sm font-medium">AHPRA Registered</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                      <Clock className="h-5 w-5" />
                      <span className="text-sm font-medium">45 min average</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-white text-white" />
                        ))}
                      </div>
                      <span className="text-sm font-medium">4.9/5 rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
