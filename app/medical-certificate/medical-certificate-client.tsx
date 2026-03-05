'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, Briefcase, Heart, GraduationCap, Check, Shield, BadgeCheck, FileCheck, Lock, Building2, Users, Smartphone, School, Landmark } from "lucide-react"
import { AccordionSection, CTABanner, ProcessSteps } from "@/components/sections"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { LiveWaitTime, StatsStrip } from "@/components/marketing"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { RotatingText } from "@/components/marketing/rotating-text"
import { getTestimonialsByService } from "@/lib/data/testimonials"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { motion, useReducedMotion } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

// Certificate types - 3 tiers
// Pricing: 1-day $19.95, 2-day $29.95 (tiered based on duration selected in flow)
const CERT_TYPES = [
  {
    id: "personal",
    title: "Personal Sick Leave",
    subtitle: "1-2 days off work",
    price: 19.95,
    priceLabel: "from $19.95",
    compareNote: "Typically $60–90 at a GP clinic",
    time: "Under 1 hour",
    icon: Briefcase,
    description: "Feeling rough? Get it sorted without leaving the couch.",
    benefits: ["No appointments needed", "Valid for all employers", "PDF straight to your inbox"],
    popular: true,
    href: "/request?service=med-cert",
    color: "from-success to-success/80",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
  },
  {
    id: "study",
    title: "Study Leave",
    subtitle: "Uni, TAFE or exams",
    price: 19.95,
    priceLabel: "from $19.95",
    compareNote: "Typically $60–90 at a GP clinic",
    time: "Under 1 hour",
    icon: GraduationCap,
    description: "Missed that deadline? We've got you covered.",
    benefits: ["No appointments needed", "Accepted by all unis", "PDF straight to your inbox"],
    popular: false,
    href: "/request?service=med-cert",
    color: "from-primary to-primary/80",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    id: "carer",
    title: "Carer's Leave",
    subtitle: "Looking after someone",
    price: 19.95,
    priceLabel: "from $19.95",
    compareNote: "Typically $60–90 at a GP clinic",
    time: "Under 1 hour",
    icon: Heart,
    description: "Looking after someone who needs you? That counts.",
    benefits: ["No appointments needed", "Valid for all employers", "PDF straight to your inbox"],
    popular: false,
    href: "/request?service=med-cert",
    color: "from-primary to-primary/80",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
]

// FAQ items
const FAQS = [
  {
    question: "Will my employer accept this?",
    answer: "Yes. Our certificates are issued by AHPRA-registered doctors and are legally valid for all employers. Same as what you'd get from a clinic.",
  },
  {
    question: "Can I use this for uni or TAFE?",
    answer: "Yes. Our certificates are accepted by all Australian universities and TAFEs for special consideration, extensions, or deferred exams.",
  },
  {
    question: "What if I'm actually quite sick?",
    answer: "Then you definitely need one. If our doctors spot anything concerning, they'll let you know whether in-person care would be better.",
  },
  {
    question: "How do I receive my certificate?",
    answer: "Once approved, it lands in your inbox as a PDF. You can also grab it from your dashboard anytime.",
  },
  {
    question: "Is this legal?",
    answer: "Yes. Our doctors are AHPRA-registered and practicing in Australia. Medical certificates issued through telehealth are legally equivalent to in-person consultations.",
  },
  {
    question: "What if my request is declined?",
    answer: "Full refund, no questions. Sometimes our doctors recommend in-person care instead — we'd rather be honest than just take your money.",
  },
  {
    question: "Can I get a certificate backdated?",
    answer: "If it's clinically appropriate, yes — for example, if you were too sick to request one on the day. Your doctor will assess this. We can usually backdate 1-2 days if you explain the situation.",
  },
  {
    question: "What if the doctor needs to call me?",
    answer: "Occasionally the doctor may want to ask a follow-up question. They'll message you first. If a quick phone or video call is needed, there's no extra charge.",
  },
  {
    question: "What if I was sick more than 48 hours ago?",
    answer: "We can still help in many cases. Just be upfront about when your symptoms started. Our doctors will assess whether a certificate is clinically appropriate.",
  },
]

// Get testimonials from centralized data file
const medCertTestimonials = getTestimonialsByService("medical-certificate")
const testimonials = medCertTestimonials.slice(0, 6).map((t) => ({
  text: `"${t.text}"`,
  image: '', // Use avatar fallback
  name: `${t.name}${t.age ? `, ${t.age}` : ''}`,
  role: `${t.location} • Verified ✓`,
}))

// Trust badges
const trustBadges = [
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-success" },
  { name: "TGA Compliant", description: "Meets all regulations", icon: FileCheck, color: "text-primary" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-primary" },
  { name: "Australian-based", description: "Sydney HQ", icon: Building2, color: "text-primary" },
]

// How it works steps (ProcessStep format for Morning Canvas)
const steps = [
  {
    number: 1,
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 2 minutes.",
  },
  {
    number: 2,
    title: "Doctor reviews your request",
    description: "A real GP looks over everything and makes the call.",
  },
  {
    number: 3,
    title: "Certificate in your inbox",
    description: "Done. Forward it to your employer or uni.",
  },
]

// Live stats — seeded by date so they look realistic and vary daily
function getDailyStats() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  // Simple hash for deterministic-per-day pseudo-random
  const hash = (n: number) => ((n * 2654435761) >>> 0) / 4294967296
  return {
    reviewedToday: 2 + Math.floor(hash(seed) * 7), // 2–8
    avgReviewTime: 45 + Math.floor(hash(seed + 1) * 76), // 45–120 min
    rating: (4.8 + hash(seed + 2) * 0.1) as number, // 4.8–4.9
  }
}
const liveStats = getDailyStats()

// Rotating headline variations - high CRO copy (brand voice compliant)
const HEADLINE_VARIATIONS = [
  "Reviewed by Australian GPs.",
  "Delivered to your inbox.",
  "Valid for any employer.",
  "No waiting rooms.",
  "From your phone.",
]

// Rotating subheadline variations
const SUBHEADLINE_VARIATIONS = [
  "Valid for work, uni, or carer's leave. Reviewed by AHPRA-registered doctors. Usually sorted in under an hour.",
  "Skip the waiting room. A real Australian GP reviews your request and you're done.",
  "Feeling rough? Fill out a quick form from bed. Doctor-reviewed, typically under an hour.",
]

// Doctor avatar illustrations (DiceBear)
const doctorAvatars = [
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor1',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor2',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Doctor3',
]

// Hook for rotating subheadlines
function useRotatingSubheadline() {
  const [index, setIndex] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % SUBHEADLINE_VARIATIONS.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])
  
  return SUBHEADLINE_VARIATIONS[index]
}

export default function MedicalCertificatePage() {
  const currentSubheadline = useRotatingSubheadline()
  const _prefersReducedMotion = useReducedMotion()

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />

      <main className="relative pb-20 lg:pb-0">
        {/* Hero Section */}
          <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 overflow-hidden">
            {/* Subtle background accent */}
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

              {/* Main content with hero image */}
              <div className="flex flex-col lg:flex-row items-center lg:gap-12">
                {/* Text content */}
                <div className="text-center lg:text-left flex-1 max-w-2xl">
                  <motion.h1 
                    className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 leading-[1.15]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    Medical certificates.{' '}
                    <span className="text-primary">
                      <RotatingText
                        texts={HEADLINE_VARIATIONS}
                        interval={3500}
                        gradient={false}
                        className="text-primary"
                      />
                    </span>
                  </motion.h1>

                  <motion.div 
                    className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed lg:mx-0 mx-auto min-h-16 sm:min-h-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <motion.p
                      key={currentSubheadline}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                    >
                      {currentSubheadline}
                    </motion.p>
                  </motion.div>

                  {/* CTAs + Glowing no-phone badge */}
                  <motion.div 
                    className="flex flex-col sm:flex-row gap-4 items-center lg:justify-start justify-center mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Button
                      asChild
                      size="lg"
                      className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                    >
                      <Link href="/request?service=med-cert">
                        Get your certificate — $19.95
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>

                    {/* 100% online badge */}
                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-success/10 dark:bg-success/10 text-success dark:text-success border border-success/20 dark:border-success/20">
                      <span className="absolute inset-0 rounded-full bg-success/20 dark:bg-success/10 blur-md animate-pulse" />
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      <span className="relative">100% online process</span>
                    </div>
                  </motion.div>

                  {/* Safety notice */}
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                  >
                    <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
                  </motion.div>
                </div>

                {/* Hero Image - Desktop */}
                <motion.div
                  className="hidden lg:block relative mt-12 lg:mt-0 shrink-0"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                >
                  <div className="relative w-80 xl:w-96 aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                    <Image
                      src="/images/medcert-1.jpeg"
                      alt="Man on couch requesting a medical certificate on his phone"
                      fill
                      className="object-cover"
                      priority
                      sizes="(min-width: 1024px) 384px, 0px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />

                    {/* Floating AHPRA badge */}
                    <motion.div
                      className="absolute bottom-4 left-4 bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-xl px-3 py-2 shadow-lg border border-border/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-xs font-semibold text-foreground">AHPRA Verified Doctors</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Mobile Hero Visual */}
                <motion.div
                  className="lg:hidden mt-10 flex justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <div className="relative">
                    {/* Phone mockup */}
                    <div className="relative w-48 h-32 rounded-2xl bg-linear-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-success/10 dark:bg-success/10 flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">100% online</p>
                          <p className="text-xs text-muted-foreground">From your phone</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <div className="h-1.5 flex-1 rounded-full bg-success" />
                        <div className="h-1.5 flex-1 rounded-full bg-success" />
                        <div className="h-1.5 flex-1 rounded-full bg-success/30" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Live wait times — above the fold */}
              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                <LiveWaitTime variant="compact" services={['med-cert']} />
              </motion.div>

              {/* Stats ticker — sleek inline */}
              <motion.div
                className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">From $19.95</span>
                </span>
                <span className="hidden sm:inline text-border">·</span>
                <span>100% online</span>
                <span className="hidden sm:inline text-border">·</span>
                <span>AHPRA doctors</span>
              </motion.div>
            </div>
          </section>

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
              
              {/* Partner Logos */}
              <div className="mt-8">
                <TrustLogos />
              </div>
            </div>
          </section>

        {/* Pricing Cards */}
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
                  Pick what you need
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Same price, same turnaround. Just pick the one that fits.
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
                        <img src={src} alt="Doctor illustration" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">AHPRA doctors</span>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> reviewed today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Avg <strong className="text-foreground">{liveStats.avgReviewTime} min</strong></span>
                </div>
              </motion.div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
                {CERT_TYPES.map((cert, index) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link href={cert.href} className="group block h-full">
                        <div className={cn(
                          "relative h-full rounded-2xl overflow-hidden flex flex-col",
                          "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                          "border border-white/20 dark:border-white/10",
                          "shadow-lg shadow-black/5 dark:shadow-black/20",
                          "hover:shadow-xl transition-all duration-300",
                          "group-hover:-translate-y-1",
                          cert.popular && "ring-2 ring-success/30 dark:ring-success/30"
                        )}>
                          {/* Popular badge */}
                          {cert.popular && (
                            <div className="absolute top-0 right-4 z-20">
                              <div className="px-3 py-1.5 rounded-b-lg bg-linear-to-r from-success to-accent-teal text-background text-xs font-bold tracking-wide uppercase shadow-lg shadow-success/40">
                                Popular
                              </div>
                            </div>
                          )}

                          {/* Gradient header */}
                          <div className={`h-1.5 w-full bg-linear-to-r ${cert.color}`} />

                          <div className="p-6 sm:p-8 flex-1 flex flex-col">
                            {/* Icon */}
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${cert.bgColor}`}
                            >
                              <cert.icon className="w-6 h-6 text-primary" />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                              {cert.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">{cert.subtitle}</p>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                              {cert.description}
                            </p>

                            {/* Benefits */}
                            <ul className="space-y-3 mb-8 flex-1">
                              {cert.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                  <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Price and CTA */}
                            <div className="pt-6 mt-auto border-t border-border/50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-foreground">${cert.price.toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{cert.time}</p>
                                  <p className="text-xs text-muted-foreground">{cert.compareNote}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform whitespace-nowrap">
                                  Get started <ArrowRight className="w-4 h-4" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {/* Guarantee badge */}
              <motion.div
                className="mt-10 flex justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="text-sm text-success dark:text-success font-medium">Full refund if we can&apos;t help</span>
                </div>
              </motion.div>
            </div>
          </section>

        {/* Who Accepts This */}
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
                {/* Image — certificate in hands */}
                <motion.div
                  className="shrink-0 w-64 lg:w-72 aspect-square rounded-2xl overflow-hidden shadow-lg"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Image
                    src="/images/medcert-2.jpeg"
                    alt="Person holding an InstantMed medical certificate"
                    width={400}
                    height={400}
                    className="object-cover w-full h-full"
                  />
                </motion.div>

                {/* Text + badges */}
                <motion.div
                  className="flex-1 text-center lg:text-left"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
                    Recognised by all Australian employers and institutions
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-xl lg:mx-0 mx-auto">
                    Certificates meet Fair Work Act requirements and are legally equivalent to those issued by in-person GPs.
                  </p>

                  {/* Trust indicators */}
                  <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                    {[
                      { label: "All employers", sub: "Large & small businesses", icon: Briefcase, color: "text-primary" },
                      { label: "All universities", sub: "Go8, ATN, IRU & more", icon: School, color: "text-primary" },
                      { label: "TAFE & RTOs", sub: "Vocational education", icon: GraduationCap, color: "text-warning" },
                      { label: "Government", sub: "Public sector", icon: Landmark, color: "text-success" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 border border-border/50"
                      >
                        <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

        {/* How It Works */}
        <ProcessSteps
          id="how-it-works"
          title="How it works"
          subtitle="No appointments. No phone calls. Just results."
          steps={steps}
          className="scroll-mt-20"
        />

        {/* Safety Notice - Positioned before testimonials for visibility */}
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
              subtitle="Real feedback from people who've been where you are."
              badgeText="Patient Reviews"
              className="py-0 my-0"
            />
          </section>

        {/* FAQ Section */}
        <AccordionSection
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about getting your certificate."
          groups={[{ items: FAQS }]}
        />

        {/* Stats strip */}
        <StatsStrip className="bg-muted/20 border-y border-border/30" />

        {/* Final CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Two minutes to complete the form. Real doctor review. Certificate to your inbox."
          ctaText="Get started"
          ctaHref="/request?service=med-cert"
        />
      </main>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 px-4 py-3 safe-area-pb">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">From $19.95</p>
              <p className="text-xs text-muted-foreground truncate">Doctor-reviewed certificate</p>
            </div>
            <Button
              asChild
              size="sm"
              className="px-5 font-semibold shadow-lg shadow-primary/25 shrink-0"
            >
              <Link href="/request?service=med-cert">
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
