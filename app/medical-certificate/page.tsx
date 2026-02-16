'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button, Accordion, AccordionItem } from "@heroui/react"
import { ArrowRight, Clock, Briefcase, Heart, GraduationCap, Check, CheckCircle2, Shield, BadgeCheck, FileCheck, Lock, Building2, Star, Users, Zap, Smartphone, School, Landmark } from "lucide-react"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { LiveWaitTime, StatsStrip } from "@/components/marketing"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { RotatingText } from "@/components/marketing/rotating-text"
import { getTestimonialsByService } from "@/lib/data/testimonials"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { motion, useReducedMotion } from "framer-motion"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  GlowLine,
  ShimmerButton,
} from "@/components/ui/premium-effects"
import { GridStagger } from "@/components/effects/stagger-container"

// Certificate types - 3 tiers
// Pricing: 1-day $19.95, 2-day $29.95 (tiered based on duration selected in flow)
const CERT_TYPES = [
  {
    id: "personal",
    title: "Personal Sick Leave",
    subtitle: "1-2 days off work",
    price: 19.95,
    priceLabel: "from $19.95",
    comparePrice: 39.95,
    time: "Under 1 hour",
    icon: Briefcase,
    description: "Feeling rough? Get it sorted without leaving the couch.",
    benefits: ["No appointments needed", "Valid for all employers", "PDF straight to your inbox"],
    popular: true,
    href: "/request?service=med-cert",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "study",
    title: "Study Leave",
    subtitle: "Uni, TAFE or exams",
    price: 19.95,
    priceLabel: "from $19.95",
    comparePrice: 39.95,
    time: "Under 1 hour",
    icon: GraduationCap,
    description: "Missed that deadline? We've got you covered.",
    benefits: ["No appointments needed", "Accepted by all unis", "PDF straight to your inbox"],
    popular: false,
    href: "/request?service=med-cert",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "carer",
    title: "Carer's Leave",
    subtitle: "Looking after someone",
    price: 19.95,
    priceLabel: "from $19.95",
    comparePrice: 39.95,
    time: "Under 1 hour",
    icon: Heart,
    description: "Looking after someone who needs you? That counts.",
    benefits: ["No appointments needed", "Valid for all employers", "PDF straight to your inbox"],
    popular: false,
    href: "/request?service=med-cert",
    color: "from-blue-400 to-blue-500",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
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
]

// Get testimonials from centralized data file
const medCertTestimonials = getTestimonialsByService("medical-certificate")
const testimonials = medCertTestimonials.slice(0, 12).map((t) => ({
  text: `"${t.text}"`,
  image: '', // Use avatar fallback
  name: `${t.name}${t.age ? `, ${t.age}` : ''}`,
  role: `${t.location} • Verified ✓`,
}))

// Trust badges
const trustBadges = [
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-emerald-600" },
  { name: "TGA Compliant", description: "Meets all regulations", icon: FileCheck, color: "text-blue-600" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-blue-600" },
  { name: "Australian-based", description: "Sydney HQ", icon: Building2, color: "text-blue-600" },
]

// How it works steps
const steps = [
  {
    number: "01",
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 2 minutes.",
    time: "2 min",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "02",
    title: "Doctor reviews your request",
    description: "A real GP looks over everything and makes the call.",
    time: "Under 1 hour",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "03",
    title: "Certificate in your inbox",
    description: "Done. Forward it to your employer or uni.",
    time: "Instant",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
]

// Live stats
const liveStats = {
  reviewedToday: 47,
  avgReviewTime: 18,
  rating: 4.9,
}

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

// Doctor images
const doctorImages = [
  '/female-doctor-professional-headshot-warm-smile-aus.jpg',
  '/middle-aged-australian-man-with-glasses-friendly-p.jpg',
  '/indian-australian-woman-professional-headshot-smil.jpg',
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
        <ParallaxSection speed={0.2}>
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
                    <span className="text-premium-gradient">
                      <RotatingText 
                        texts={HEADLINE_VARIATIONS} 
                        interval={3500}
                        gradient={false}
                        className="text-premium-gradient"
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
                      as={Link}
                      href="/request?service=med-cert"
                      color="primary"
                      size="lg"
                      className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                      endContent={<ArrowRight className="h-4 w-4" />}
                    >
                      Request your certificate
                    </Button>
                    
                    {/* 100% online badge */}
                    <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-400/10 blur-md animate-pulse" />
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
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
                  <div className="relative">
                    {/* Main doctor image */}
                    <div className="relative w-72 h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-slate-800/80">
                      <Image
                        src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=500&fit=crop&crop=face"
                        alt="Australian GP ready to help"
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent" />
                    </div>
                    
                    {/* Floating AHPRA badge */}
                    <motion.div
                      className="absolute -bottom-4 -left-6 bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-border/50"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">AHPRA Verified</p>
                          <p className="text-xs text-muted-foreground">Australian Doctor</p>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Secondary floating image */}
                    <motion.div
                      className="absolute -top-4 -left-8 w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-slate-800 rotate-6"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face"
                        alt="Healthcare team member"
                        fill
                        className="object-cover"
                      />
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
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Smartphone className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">100% online</p>
                          <p className="text-xs text-muted-foreground">From your phone</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                        <div className="h-1.5 flex-1 rounded-full bg-emerald-500" />
                        <div className="h-1.5 flex-1 rounded-full bg-emerald-500/30" />
                      </div>
                    </div>
                  </div>
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
                  <div className="text-2xl font-bold text-foreground mb-1">From $19.95</div>
                  <p className="text-xs text-muted-foreground">1-2 days</p>
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
                  <div className="text-2xl font-bold text-foreground mb-1">100%</div>
                  <p className="text-xs text-muted-foreground">Digital process</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">AHPRA</div>
                  <p className="text-xs text-muted-foreground">Registered doctors</p>
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
              
              {/* Partner Logos */}
              <div className="mt-8">
                <TrustLogos />
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Pricing Cards */}
        <ParallaxSection speed={0.25}>
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
                  <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> reviewed today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Avg <strong className="text-foreground">{liveStats.avgReviewTime} min</strong></span>
                </div>
              </motion.div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
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
                          cert.popular && "ring-2 ring-emerald-500/30 dark:ring-emerald-400/30"
                        )}>
                          {/* Popular badge */}
                          {cert.popular && (
                            <div className="absolute top-0 right-4 z-20">
                              <div className="px-3 py-1.5 rounded-b-lg bg-linear-to-r from-emerald-500 to-teal-500 text-background text-xs font-bold tracking-wide uppercase shadow-lg shadow-emerald-500/40">
                                Popular
                              </div>
                            </div>
                          )}

                          {/* Gradient header */}
                          <div className={`h-1.5 w-full bg-linear-to-r ${cert.color}`} />

                          <div className="p-7 flex-1 flex flex-col">
                            {/* Icon */}
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${cert.bgColor}`}
                            >
                              <cert.icon className="w-6 h-6 text-blue-600" />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                              {cert.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">{cert.subtitle}</p>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                              {cert.description}
                            </p>

                            {/* Benefits */}
                            <ul className="space-y-2.5 mb-8 flex-1">
                              {cert.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Price and CTA */}
                            <div className="flex items-center justify-between pt-5 mt-auto border-t border-border/50">
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-bold text-foreground">${cert.price.toFixed(2)}</span>
                                  <span className="text-sm text-muted-foreground line-through">${cert.comparePrice.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{cert.time}</p>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                                Request certificate <ArrowRight className="w-4 h-4" />
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
                className="mt-8 flex justify-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Full refund if we can&apos;t help</span>
                </div>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>

        {/* Who Accepts This */}
        <ParallaxSection speed={0.15}>
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
                  Recognised by all Australian employers and institutions
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Certificates meet Fair Work Act requirements and are legally equivalent to those issued by in-person GPs.
                </p>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { label: "All employers", sub: "Large & small businesses", icon: Briefcase, color: "text-blue-500" },
                    { label: "All universities", sub: "Go8, ATN, IRU & more", icon: School, color: "text-violet-500" },
                    { label: "TAFE & RTOs", sub: "Vocational education", icon: GraduationCap, color: "text-amber-500" },
                    { label: "Government", sub: "Public sector", icon: Landmark, color: "text-emerald-500" },
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
                  Three steps. That&apos;s it.
                </h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  No appointments, no phone tag. A registered GP reviews every request.
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
                  as={Link}
                  href="/request?service=med-cert"
                  color="primary"
                  size="lg"
                  className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Get started now
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Most people are done in under an hour ✅
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
              subtitle="Real feedback from people who've been where you are."
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
                  Everything you need to know about getting your certificate.
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

        {/* Live wait time + Stats strip */}
        <LiveWaitTime variant="strip" services={['med-cert']} />
        <StatsStrip className="bg-muted/20 border-y border-border/30" />
        
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
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Doctors online now</span>
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                        Ready when you are
                      </h2>
                      <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                        Two minutes to complete the form. Real doctor review. Certificate to your inbox.
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {[
                          { icon: Shield, text: "AHPRA registered doctors" },
                          { icon: CheckCircle2, text: "Refund if declined" },
                          { icon: Smartphone, text: "100% online" },
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
                      
                      <Link href="/request?service=med-cert">
                        <ShimmerButton className="px-8 h-12 font-semibold">
                          Get started
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </ShimmerButton>
                      </Link>
                      
                      {/* Price anchoring */}
                      <p className="mt-6 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">From $19.95</span>
                        <span className="mx-2">•</span>
                        <span className="line-through opacity-60">$60+ GP visit</span>
                      </p>
                    </div>

              </motion.div>
            </div>
          </section>
        </ParallaxSection>
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
              as={Link}
              href="/request?service=med-cert"
              color="primary"
              size="sm"
              className="px-5 font-semibold shadow-lg shadow-primary/25 shrink-0"
              endContent={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Get started
            </Button>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}
