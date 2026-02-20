'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, RefreshCw, Smartphone, CheckCircle2, Shield, BadgeCheck, FileCheck, Lock, Building2, Star, Users, AlertCircle } from "lucide-react"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { useState, useEffect } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  GlowLine,
  ShimmerButton,
} from "@/components/ui/premium-effects"
import { GridStagger } from "@/components/effects/stagger-container"

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
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-emerald-600" },
  { name: "TGA Compliant", description: "Meets all regulations", icon: FileCheck, color: "text-blue-600" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-blue-600" },
  { name: "Any Pharmacy", description: "Australia-wide", icon: Building2, color: "text-blue-600" },
]

// How it works steps
const steps = [
  {
    number: "01",
    title: "Enter your medication",
    description: "Tell us what you need and answer a few safety questions about your health.",
    time: "2 min",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "02",
    title: "Doctor reviews your request",
    description: "An AHPRA-registered doctor assesses your request and determines eligibility.",
    time: "Under 1 hour",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "03",
    title: "E-script sent to your phone",
    description: "Your prescription is sent as an e-script. Take it to any pharmacy in Australia.",
    time: "Same day",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
]

// Live stats — seeded by date so they look realistic and vary daily
function getDailyStats() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const hash = (n: number) => ((n * 2654435761) >>> 0) / 4294967296
  return {
    reviewedToday: 65 + Math.floor(hash(seed + 10) * 50), // 65–114
    avgReviewTime: 18 + Math.floor(hash(seed + 11) * 10), // 18–27
    rating: 4.9,
  }
}
const liveStats = getDailyStats()

// Doctor images
const doctorImages = [
  '/female-doctor-professional-headshot-warm-smile-aus.jpg',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1594824476967-48c8b964e05a?w=100&h=100&fit=crop&crop=face',
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
        <ParallaxSection speed={0.2}>
          <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 overflow-hidden">
            {/* Subtle background */}
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {/* Top badge */}
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AvailabilityIndicator variant="badge" />
              </motion.div>

              {/* Main content — text + hero image */}
              <div className="flex flex-col lg:flex-row items-center lg:gap-12 xl:gap-16">
                {/* Text */}
                <div className="flex-1 text-center lg:text-left max-w-2xl">
                  <motion.h1
                    className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    Repeat prescriptions.{' '}
                    <span className="text-premium-gradient">Assessed online.</span>
                  </motion.h1>

                  <motion.p
                    className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    Request repeats of your existing medication. A doctor assesses your request and issues an e-script valid at any Australian pharmacy.
                  </motion.p>

                  {/* CTAs */}
                  <motion.div
                    className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
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
                  </motion.div>

                  {/* Safety notice */}
                  <motion.div
                    className="mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                  >
                    <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
                  </motion.div>

                  {/* Stats ticker — sleek inline */}
                  <motion.div
                    className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <span className="font-semibold text-foreground">$29.95</span>
                    <span className="hidden sm:inline text-border">·</span>
                    <span>&lt;1 hr review</span>
                    <span className="hidden sm:inline text-border">·</span>
                    <span>PBS subsidies apply</span>
                  </motion.div>
                </div>

                {/* Hero image — eRx on phone */}
                <motion.div
                  className="hidden lg:block relative shrink-0 mt-0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                >
                  <div className="relative w-80 xl:w-96 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                      src="/images/rptrx-1.jpeg"
                      alt="Woman holding phone showing electronic prescription QR code"
                      fill
                      className="object-cover"
                      priority
                      sizes="(min-width: 1024px) 384px, 0px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Trust Badges with GridStagger */}
        <ParallaxSection speed={0.15}>
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <GridStagger
                columns={4}
                staggerDelay={0.08}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6"
              >
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
              </GridStagger>
              
              {/* eRx Partner Logo */}
              <div className="mt-8">
                <TrustLogos />
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Common Medications */}
        <ParallaxSection speed={0.25}>
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
                    {doctorImages.map((src, i) => (
                      <div key={i} className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-background">
                        <Image src={src} alt="AHPRA-registered doctor" fill className="object-cover" />
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
        </ParallaxSection>

        {/* Important Notice */}
        <ParallaxSection speed={0.15}>
          <section className="py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">Important: This is for existing medications only</h3>
                    <p className="text-sm text-muted-foreground">
                      This service is for renewing medications you already take. If you need a new medication or want to change your dose, please use our{' '}
                      <Link href="/general-consult" className="text-primary hover:underline">general consultation</Link> service instead.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>

        {/* How It Works */}
        <ParallaxSection speed={0.2}>
          <section id="how-it-works" className="py-14 lg:py-18 scroll-mt-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-14">
                {/* Steps — clean vertical list */}
                <div className="flex-1">
                  <motion.div
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
                      How it works
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tell us what you need. Doctor reviews. E-script to your phone.
                    </p>
                  </motion.div>

                  <div className="space-y-0">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.number}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="relative flex items-start gap-4 py-5"
                      >
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold">
                            {step.number.replace('0', '')}
                          </div>
                          {index < steps.length - 1 && (
                            <div className="w-px h-full bg-border absolute top-12 left-4" />
                          )}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">{step.time}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    className="mt-6"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button asChild size="lg" className="px-8 h-11 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all">
                      <Link href="/request?service=prescription">
                        Renew your medication <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2.5">
                      Most scripts reviewed in under an hour
                    </p>
                  </motion.div>
                </div>

                {/* Image — pharmacy pickup */}
                <motion.div
                  className="hidden lg:block shrink-0 w-72 xl:w-80 aspect-[4/5] rounded-2xl overflow-hidden shadow-lg"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Image
                    src="/images/rptrx-2.png"
                    alt="Patient picking up prescription at an Australian pharmacy"
                    width={400}
                    height={500}
                    className="object-cover w-full h-full"
                  />
                </motion.div>
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Safety Notice - Positioned before testimonials for visibility */}
        <ParallaxSection speed={0.1}>
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
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Testimonials */}
        <ParallaxSection speed={0.25}>
          <section className="py-8 overflow-hidden">
            <TestimonialsColumnsWrapper
              testimonials={testimonials}
              title="What our patients say"
              subtitle="Real reviews from Australians who use our service."
              badgeText="Patient Reviews"
              className="py-0 my-0"
            />
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <GlowLine />
        </div>

        {/* FAQ Section */}
        <ParallaxSection speed={0.15}>
          <section className="py-16 lg:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <motion.div 
                className="text-center mb-10"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground/80">FAQ</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                  Common questions
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                  Everything you need to know about renewing your medication.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="0"
                  className="space-y-3"
                >
                  {FAQS.map((item, index) => (
                    <AccordionItem
                      key={index.toString()}
                      value={index.toString()}
                      className="rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-border/60 shadow-sm hover:border-primary/20 hover:shadow-md transition-all px-5 !border-b-border/60"
                    >
                      <AccordionTrigger className="text-foreground hover:no-underline py-5">
                        <span className="font-medium text-foreground text-left">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>

        {/* Final CTA */}
        <ParallaxSection speed={0.2}>
          <section className="py-16 lg:py-20 relative overflow-hidden">
            <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                    <div className="bg-linear-to-br from-primary/5 via-transparent to-primary/3 rounded-2xl border border-primary/10 p-8 sm:p-12 text-center">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Ready when you are</span>
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                        Renew your medication today
                      </h2>
                      <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                        Takes 2 minutes to get started. Most requests reviewed in under an hour.
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {[
                          { icon: Clock, text: "Under 1 hour review" },
                          { icon: Shield, text: "AHPRA registered" },
                          { icon: CheckCircle2, text: "Full refund if declined" },
                        ].map((feature) => (
                          <div
                            key={feature.text}
                            className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-background/50 border border-border/50"
                          >
                            <feature.icon className="h-4 w-4 text-primary" />
                            <span>{feature.text}</span>
                          </div>
                        ))}
                      </div>
                      
                      <Link href="/request?service=prescription">
                        <ShimmerButton className="px-8 h-12 font-semibold">
                          Renew your prescription
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </ShimmerButton>
                      </Link>
                      
                      <p className="mt-6 text-xs text-muted-foreground">
                        $29.95 consultation fee • PBS subsidies apply at pharmacy
                      </p>
                    </div>

              </motion.div>
            </div>
          </section>
        </ParallaxSection>
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
        <Link href="/request?service=prescription" className="block">
          <ShimmerButton className="w-full flex items-center justify-center gap-2 py-3">
            Request prescription
            <ArrowRight className="w-4 h-4" />
          </ShimmerButton>
        </Link>
      </motion.div>

      <MarketingFooter />
    </div>
  )
}
