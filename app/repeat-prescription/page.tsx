'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Accordion, AccordionItem } from "@heroui/react"
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

// Live stats
const liveStats = {
  reviewedToday: 89,
  avgReviewTime: 22,
  rating: 4.9,
}

// Doctor images
const doctorImages = [
  '/female-doctor-professional-headshot-warm-smile-aus.jpg',
  '/middle-aged-australian-man-with-glasses-friendly-p.jpg',
  '/indian-australian-woman-professional-headshot-smil.jpg',
]

export default function RepeatPrescriptionPage() {
  const prefersReducedMotion = useReducedMotion()
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

              {/* Main content */}
              <div className="text-center max-w-4xl mx-auto">
                <motion.h1 
                  className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-[1.12]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Repeat prescriptions.{' '}
                  <span className="text-premium-gradient">Assessed online.</span>
                </motion.h1>

                <motion.p 
                  className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Request repeats of your existing medication. A doctor assesses your request and issues an e-script valid at any Australian pharmacy.
                </motion.p>

                {/* CTAs */}
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
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

                {/* Safety notice + Guarantee badge */}
                <motion.div
                  className="flex flex-col items-center gap-2 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                >
                  <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Full refund if we can&apos;t help
                  </p>
                </motion.div>



                {/* Trust signals row */}
                <motion.div 
                  className="flex flex-wrap justify-center gap-6 sm:gap-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {[
                    { icon: Clock, text: "Under 1 hour review" },
                    { icon: Smartphone, text: "E-script to your phone" },
                    { icon: Shield, text: "AHPRA registered doctors" },
                  ].map((signal) => (
                    <div 
                      key={signal.text} 
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <signal.icon className="h-4 w-4 text-primary/70" />
                      <span>{signal.text}</span>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Stats bar */}
              <motion.div
                className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">$29.95</div>
                  <p className="text-xs text-muted-foreground">Consultation fee</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">&lt;1 hr</div>
                  <p className="text-xs text-muted-foreground">Typical review</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{liveStats.rating} rating</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">PBS</div>
                  <p className="text-xs text-muted-foreground">Subsidies apply</p>
                </div>
              </motion.div>
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
                <Button 
                  asChild
                  size="lg"
                  className="px-8 h-12 font-semibold shadow-lg shadow-primary/25"
                >
                  <Link href="/request?service=prescription">
                    Request your medication <ArrowRight className="ml-2 h-4 w-4" />
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
          <section id="how-it-works" className="py-16 lg:py-20 scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {/* Section Header */}
              <motion.div 
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground/80">How it works</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
                  Three steps. Doctor assessment. E-script issued.
                </h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  Tell us what you need, a doctor reviews, and your eScript is sent to your phone via SMS.
                </p>
              </motion.div>

              {/* Steps */}
              <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <div className={`relative h-full rounded-2xl border ${step.borderColor} ${step.bgColor} p-6 lg:p-8 transition-all duration-300 hover:shadow-lg hover:shadow-black/5`}>
                      {/* Step number */}
                      <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full bg-linear-to-br ${step.color} flex items-center justify-center text-background text-sm font-bold shadow-lg`}>
                        {step.number}
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                        {step.description}
                      </p>
                      
                      {/* Time badge */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">{step.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div 
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  asChild
                  size="lg"
                  className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                >
                  <Link href="/request?service=prescription">
                    Renew your medication <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Most scripts reviewed in under an hour
                </p>
              </motion.div>
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
                  variant="splitted"
                  defaultExpandedKeys={["0"]}
                  className="gap-3"
                >
                  {FAQS.map((item, index) => (
                    <AccordionItem
                      key={index.toString()}
                      aria-label={item.question}
                      title={<span className="font-medium text-foreground">{item.question}</span>}
                      classNames={{
                        base: "bg-content1 border border-divider shadow-sm hover:border-primary/20 transition-colors",
                        title: "text-foreground",
                        content: "text-muted-foreground leading-relaxed pb-4",
                      }}
                    >
                      {item.answer}
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
                            className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-background/50 border border-divider"
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
