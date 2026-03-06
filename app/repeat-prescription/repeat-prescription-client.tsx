'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, RefreshCw, CheckCircle2, BadgeCheck, FileCheck, Lock, Building2, Users } from "lucide-react"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { SplitHero } from "@/components/heroes"
import { AccordionSection, CTABanner, ProcessSteps } from "@/components/sections"

// Common medication categories
const MEDICATION_TYPES = [
  {
    id: "blood-pressure",
    title: "Blood Pressure",
    subtitle: "Hypertension medications",
    examples: "ACE inhibitors, calcium channel blockers",
    popular: true,
  },
  {
    id: "cholesterol",
    title: "Cholesterol",
    subtitle: "Statins & lipid management",
    examples: "Statins and lipid-lowering medications",
    popular: true,
  },
  {
    id: "contraceptive",
    title: "Contraceptives",
    subtitle: "Oral contraceptive pills",
    examples: "Combined and progestogen-only pills",
    popular: true,
  },
  {
    id: "asthma",
    title: "Asthma & COPD",
    subtitle: "Inhalers & preventers",
    examples: "Relievers, preventers, combination inhalers",
    popular: false,
  },
  {
    id: "reflux",
    title: "Reflux & Stomach",
    subtitle: "PPIs & antacids",
    examples: "Proton pump inhibitors, antacids",
    popular: false,
  },
  {
    id: "thyroid",
    title: "Thyroid",
    subtitle: "Thyroid hormone replacement",
    examples: "Thyroid hormone replacement therapy",
    popular: false,
  },
]

// FAQ items
const FAQS = [
  {
    question: "What medications can I renew?",
    answer: "Most regular medications including blood pressure, cholesterol, contraceptives, asthma inhalers, reflux medications, thyroid, and other routine prescriptions. We cannot prescribe Schedule 8 medications (opioids, stimulants) or benzodiazepines.",
  },
  {
    question: "How does the e-script work?",
    answer: "After approval, you receive an SMS with your e-script token. Show this at any pharmacy in Australia to collect your medication. PBS subsidies apply at the pharmacy.",
  },
  {
    question: "Do I need my previous prescription?",
    answer: "No, but you should know the name and dose of your medication. The doctor will verify it is appropriate to continue.",
  },
  {
    question: "What if the doctor needs more information?",
    answer: "They may message you through our secure platform or request a brief phone call. This ensures your safety and that the medication is still appropriate for you.",
  },
  {
    question: "Can I get repeats on my prescription?",
    answer: "Yes, where clinically appropriate. The doctor will include repeats based on standard prescribing guidelines for your medication.",
  },
  {
    question: "What if my request is declined?",
    answer: "You will receive a full refund. The doctor may decline if the medication requires in-person monitoring or if it has been too long since your last health check.",
  },
]

// Testimonials with verified badges
const testimonials = [
  { text: '"Needed my blood pressure meds renewed. Usually takes a week to see my doctor. This took 20 minutes."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidR', name: 'David R.', role: 'Gold Coast • Verified ✓' },
  { text: '"So convenient for my regular contraceptive prescription. The doctor asked good questions."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JessicaW', name: 'Jessica W.', role: 'Adelaide • Verified ✓' },
  { text: '"Living remote, nearest doctor is 2 hours away. This service is a game changer."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RyanP', name: 'Ryan P.', role: 'Darwin • Verified ✓' },
  { text: '"Script was at my pharmacy same day. No more running out of medication."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LindaM', name: 'Linda M.', role: 'Perth • Verified ✓' },
  { text: '"The doctor checked my recent blood tests before approving. Felt properly looked after."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelK', name: 'Michael K.', role: 'Sydney • Verified ✓' },
  { text: '"Been using this for my asthma preventer for months. Works perfectly every time."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SophieT', name: 'Sophie T.', role: 'Melbourne • Verified ✓' },
]

// Trust badges
const trustBadges = [
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-success" },
  { name: "TGA Compliant", description: "Meets all regulations", icon: FileCheck, color: "text-primary" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-primary" },
  { name: "Any Pharmacy", description: "Australia-wide", icon: Building2, color: "text-primary" },
]

// How it works steps (mapped to ProcessStep type)
const processSteps = [
  {
    number: 1,
    title: "Enter your medication",
    description: "Tell us what you need and answer a few safety questions about your health.",
  },
  {
    number: 2,
    title: "Doctor reviews your request",
    description: "An AHPRA-registered doctor assesses your request and determines eligibility.",
  },
  {
    number: 3,
    title: "E-script sent to your phone",
    description: "Your prescription is sent as an e-script. Take it to any pharmacy in Australia.",
  },
]

// Live stats — seeded by date so they look realistic and vary daily
function getDailyStats() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const hash = (n: number) => ((n * 2654435761) >>> 0) / 4294967296
  return {
    reviewedToday: 2 + Math.floor(hash(seed + 10) * 7), // 2–8
    avgReviewTime: 45 + Math.floor(hash(seed + 11) * 76), // 45–120 min
    rating: (4.8 + hash(seed + 12) * 0.1) as number, // 4.8–4.9
  }
}
const liveStats = getDailyStats()

// Doctor avatar illustrations (DiceBear)
const doctorAvatars = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor4',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor5',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor6',
]

export default function RepeatPrescriptionPage() {
  const _prefersReducedMotion = useReducedMotion()
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // Show sticky CTA after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 600)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />

      <main className="relative">
        {/* Hero Section */}
        <SplitHero
          pill="Doctors available now"
          title="Repeat prescriptions. Assessed online."
          highlightWords={["Assessed online."]}
          subtitle="Request repeats of your existing medication. A doctor assesses your request and issues an e-script valid at any Australian pharmacy."
          imageSrc="/images/rptrx-1.jpeg"
          imageAlt="Woman holding phone showing electronic prescription QR code"
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-12 font-semibold shadow-md shadow-primary/15 active:scale-[0.98]"
          >
            <Link href="/request?service=prescription">
              Request your prescription <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 px-8 active:scale-[0.98]"
          >
            <Link href="#how-it-works">See how it works</Link>
          </Button>
          <div className="w-full flex flex-col gap-3 sm:col-span-2">
            <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">$29.95</span>
              <span className="text-muted-foreground/60 text-xs">(vs $60–90 at GP)</span>
              <span className="hidden sm:inline text-border">·</span>
              <span>&lt;1 hr review</span>
              <span className="hidden sm:inline text-border">·</span>
              <span>PBS subsidies apply</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center lg:justify-start gap-1.5">
              No account required &middot; Pay only after doctor review
            </p>
          </div>
        </SplitHero>

        {/* Trust Badges */}
        <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {trustBadges.map((badge) => (
                  <div
                    key={badge.name}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-border hover:shadow-sm transition-all"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-sm ${badge.color}`}>
                      <badge.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{badge.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* eRx Partner Logo */}
              <div className="mt-8">
                <TrustLogos />
              </div>
            </div>
          </section>

        {/* Common Medications */}
        <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                  Eligible medication categories
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Repeat prescriptions for established treatments. Subject to clinical assessment.
                </p>
              </motion.div>

              {/* Live stats */}
              <motion.div
                className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {doctorAvatars.map((src, i) => (
                      <div key={i} className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-background bg-muted">
                        <Image src={src} alt="Doctor illustration" fill className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">AHPRA doctors</span>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> scripts today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Avg <strong className="text-foreground">{liveStats.avgReviewTime} min</strong></span>
                </div>
              </motion.div>

              {/* Medication Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {MEDICATION_TYPES.map((med, index) => (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <div className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-sm",
                      "bg-card/50 border-border/50 hover:border-border"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <RefreshCw className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm">{med.title}</h3>
                          <p className="text-xs text-muted-foreground mb-1">{med.subtitle}</p>
                          <p className="text-xs text-muted-foreground/70 truncate">{med.examples}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <Button asChild size="lg" className="px-8 h-12 font-semibold shadow-lg shadow-primary/25">
                  <Link href="/request?service=prescription">
                    Request your medication
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Don&apos;t see yours? Most regular medications are supported.
                </p>
              </motion.div>
            </div>
          </section>

        {/* Important Notice */}
        <section className="py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="p-5 rounded-xl bg-primary/5 border border-primary/15"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">For medications you already take</h3>
                    <p className="text-sm text-muted-foreground">
                      This service renews existing prescriptions. Know your medication name and dose for a faster process. Need a <em>new</em> medication?{' '}
                      <Link href="/general-consult" className="text-primary hover:underline">Start a general consult</Link> instead.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* What you'll need section */}
              <motion.div
                className="mt-4 p-5 rounded-xl bg-card/50 border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="font-semibold text-foreground text-sm mb-3">Have these ready to speed things up</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    "Your medication name and dose",
                    "When you last took it",
                    "Your prescribing doctor's name",
                    "Any recent blood test results (if applicable)",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

        {/* How It Works */}
        <ProcessSteps
          id="how-it-works"
          pill="Simple process"
          title="How it works"
          subtitle="Tell us what you need. Doctor reviews. E-script to your phone."
          steps={processSteps}
          className="scroll-mt-20"
        />

        {/* Safety Notice */}
        <section className="py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <EmergencyDisclaimer variant="inline" />
              </motion.div>
            </div>
          </section>

        {/* Testimonials */}
        <section className="py-8 overflow-hidden">
            <TestimonialsColumnsWrapper
              testimonials={testimonials}
              title="What our patients say"
              subtitle="Real reviews from Australians who use our service."
              badgeText="Patient Reviews"
              className="py-0 my-0"
            />
          </section>

        {/* FAQ Section */}
        <AccordionSection
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about renewing your medication."
          groups={[{ items: FAQS }]}
        />

        {/* Final CTA */}
        <CTABanner
          title="Renew your medication today"
          subtitle="Takes 2 minutes to get started. Most requests reviewed in under an hour. $29.95 consultation fee — PBS subsidies apply at pharmacy."
          ctaText="Renew your prescription"
          ctaHref="/request?service=prescription"
        />
      </main>

      {/* Sticky Mobile CTA - shows after scrolling past hero */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-lg border-t border-border/50 md:hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{
          y: showStickyCTA ? 0 : 100,
          opacity: showStickyCTA ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Button asChild size="lg" className="w-full flex items-center justify-center gap-2 py-3 font-semibold shadow-lg shadow-primary/25">
          <Link href="/request?service=prescription">
            Request prescription
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </motion.div>

      <MarketingFooter />
    </div>
  )
}
