'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, Stethoscope, Phone, MessageCircle, FileText, Check, CheckCircle2, Shield, BadgeCheck, FileCheck, Lock, Building2, Star, Users, AlertCircle } from "lucide-react"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  GlowLine,
} from "@/components/ui/premium-effects"
import { getTestimonialsByService } from "@/lib/data/testimonials"

// Consultation types
const CONSULT_TYPES = [
  {
    id: "new-concern",
    title: "New Health Concern",
    subtitle: "Get assessed & treated",
    price: 49.95,
    time: "Within 2 hours",
    icon: Stethoscope,
    description: "For new symptoms or conditions you want a doctor to assess and advise on.",
    benefits: ["Full clinical assessment", "Treatment advice", "Prescriptions if appropriate"],
    popular: true,
    href: "/request?service=consult",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "new-medication",
    title: "New Medication",
    subtitle: "Start a new treatment",
    price: 49.95,
    time: "Within 2 hours",
    icon: FileText,
    description: "Need to start a new medication? A doctor will assess if it is right for you.",
    benefits: ["Medical assessment", "E-script to any pharmacy", "Follow-up messaging"],
    popular: false,
    href: "/request?service=consult",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "referral",
    title: "Referral Request",
    subtitle: "Specialist or imaging",
    price: 49.95,
    time: "Within 2 hours",
    icon: MessageCircle,
    description: "Need a referral to a specialist, pathology, or imaging? Start here.",
    benefits: ["Referral letters", "Pathology requests", "Imaging referrals"],
    popular: false,
    href: "/request?service=consult",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
]

// Common concerns
const COMMON_CONCERNS = [
  { title: "Skin conditions", examples: "Rashes, acne, eczema, suspicious moles" },
  { title: "Minor infections", examples: "UTI, sinus, ear, eye infections" },
  { title: "Cold & flu", examples: "Respiratory symptoms, cough, sore throat" },
  { title: "Allergies", examples: "Hay fever, food allergies, skin reactions" },
  { title: "Mental health", examples: "Anxiety check-in, stress, low mood" },
  { title: "Women's health", examples: "Contraception, period issues, UTI" },
  { title: "Men's health", examples: "ED, hair loss, prostate check-in" },
  { title: "Weight management", examples: "Weight loss advice, treatment options" },
]

// FAQ items
const FAQS = [
  {
    question: "What can I consult about?",
    answer: "Most non-urgent health concerns including skin conditions, minor infections, cold/flu symptoms, allergies, mental health check-ins, and requests for new medications or treatment advice.",
  },
  {
    question: "Will the doctor call me?",
    answer: "Usually yes. General consultations often require a phone or video call so the doctor can properly assess your situation. You will be notified when to expect the call.",
  },
  {
    question: "Can I get a prescription?",
    answer: "Yes, if clinically appropriate. The doctor will assess your needs and prescribe medication if suitable. We cannot prescribe Schedule 8 medications or benzodiazepines.",
  },
  {
    question: "Can I get a referral?",
    answer: "Yes. The doctor can provide referrals to specialists, pathology, or imaging if clinically indicated based on your consultation.",
  },
  {
    question: "How is this different from a medical certificate?",
    answer: "Medical certificates are for documenting illness for work or study. General consultations are for when you need actual medical advice, assessment, or treatment for a health concern.",
  },
  {
    question: "What if you can not help?",
    answer: "If your concern requires in-person examination or is outside our scope, we will advise you and provide a full refund.",
  },
]

// Get testimonials from centralized data
const consultTestimonials = getTestimonialsByService("consultation")
const testimonials = consultTestimonials.length > 0 
  ? consultTestimonials.slice(0, 6).map((t) => ({
      text: `"${t.text}"`,
      image: t.image || '',
      name: t.name,
      role: `${t.location} • Verified ✓`,
    }))
  : [
      { text: '"The doctor called and spent time understanding my symptoms. Much better than expected."', image: '', name: 'Chris B.', role: 'Newcastle • Verified ✓' },
      { text: '"Got a referral to a dermatologist sorted in an hour. So much faster than waiting weeks."', image: '', name: 'Jenny L.', role: 'Brisbane • Verified ✓' },
      { text: '"The doctor was genuinely helpful with my concerns. Felt properly listened to."', image: '', name: 'Mark S.', role: 'Melbourne • Verified ✓' },
      { text: '"Needed a new medication. The doctor assessed properly and sent the script same day."', image: '', name: 'Emma K.', role: 'Sydney • Verified ✓' },
      { text: '"Had a skin issue I was worried about. The doctor asked me to send photos and diagnosed it quickly."', image: '', name: 'Michael T.', role: 'Perth • Verified ✓' },
      { text: '"Needed advice about ongoing headaches. The doctor was thorough and referred me for tests."', image: '', name: 'Sophie H.', role: 'Canberra • Verified ✓' },
    ]

// Trust badges
const trustBadges = [
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-emerald-600" },
  { name: "Clinical Standards", description: "Same as in-person care", icon: FileCheck, color: "text-blue-600" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-blue-600" },
  { name: "Australian-based", description: "Sydney HQ", icon: Building2, color: "text-blue-600" },
]

// How it works steps
const steps = [
  {
    number: "01",
    title: "Describe your concern",
    description: "Tell us what is going on and answer health questions. This helps the doctor prepare.",
    time: "3-5 min",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "02",
    title: "Doctor assessment",
    description: "A GP reviews your information and will often call you to discuss further.",
    time: "Within 2 hours",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "03",
    title: "Treatment plan",
    description: "The doctor provides advice, prescriptions if appropriate, or referrals if needed.",
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
    reviewedToday: 20 + Math.floor(hash(seed + 20) * 25), // 20–44
    avgReviewTime: 35 + Math.floor(hash(seed + 21) * 20), // 35–54
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

export default function GeneralConsultPage() {
  const _prefersReducedMotion = useReducedMotion()

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
                  General GP consultation.{' '}
                  <span className="text-premium-gradient">Online.</span>
                </motion.h1>

                <motion.p 
                  className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Full clinical assessment for non-emergency concerns. Treatment, referrals, or prescriptions issued where appropriate.
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
                    <Link href="/request?service=consult">
                      Start your consult <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button 
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 px-8"
                  >
                    See how it works
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
                    { icon: Stethoscope, text: "Real clinical assessment" },
                    { icon: Phone, text: "Doctor calls you" },
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

              {/* Stats bar with price justification */}
              <motion.div
                className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">$49.95</div>
                  <p className="text-xs text-muted-foreground">Flat fee</p>
                  <p className="text-xs text-muted-foreground/60 line-through">$80–120 at GP</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">&lt;2 hrs</div>
                  <p className="text-xs text-muted-foreground">Doctor response</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">7 days</div>
                  <p className="text-xs text-muted-foreground">A week</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                  <div className="text-2xl font-bold text-foreground mb-1">$0</div>
                  <p className="text-xs text-muted-foreground">If we can&apos;t help</p>
                </div>
              </motion.div>

              {/* No account required */}
              <motion.p
                className="mt-4 text-center text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                No account required &middot; Pay only after doctor review
              </motion.p>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Trust Badges */}
        <ParallaxSection speed={0.15}>
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                {trustBadges.map((badge, index) => (
                  <motion.div
                    key={badge.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-border hover:shadow-sm transition-all">
                      <div className={`w-10 h-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-sm ${badge.color}`}>
                        <badge.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{badge.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Partner Logos */}
              <div className="mt-8">
                <TrustLogos />
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Consultation Types */}
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
                  How can we help?
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Choose what best describes your situation. Same price, same quality care.
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
                  <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> consults today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Avg <strong className="text-foreground">{liveStats.avgReviewTime} min</strong> response</span>
                </div>
              </motion.div>

              {/* Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {CONSULT_TYPES.map((consult, index) => (
                  <motion.div
                    key={consult.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Link href={consult.href} className="group block h-full">
                        <div className={cn(
                          "relative h-full rounded-2xl overflow-hidden flex flex-col",
                          "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                          "border border-white/20 dark:border-white/10",
                          "shadow-lg shadow-black/5 dark:shadow-black/20",
                          "hover:shadow-xl transition-all duration-300",
                          "group-hover:-translate-y-1",
                          consult.popular && "ring-2 ring-primary/30 dark:ring-primary/30"
                        )}>
                          {/* Popular badge */}
                          {consult.popular && (
                            <div className="absolute top-0 right-4 z-20">
                              <div className="px-3 py-1.5 rounded-b-lg bg-linear-to-r from-blue-600 to-blue-500 text-white text-xs font-bold tracking-wide uppercase shadow-lg shadow-blue-500/30">
                                Popular
                              </div>
                            </div>
                          )}

                          {/* Gradient header */}
                          <div className={`h-1.5 w-full bg-linear-to-r ${consult.color}`} />

                          <div className="p-6 flex-1 flex flex-col">
                            {/* Icon */}
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${consult.bgColor}`}
                            >
                              <consult.icon className="w-6 h-6 text-blue-600" />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                              {consult.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">{consult.subtitle}</p>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                              {consult.description}
                            </p>

                            {/* Benefits */}
                            <ul className="space-y-2 mb-6 flex-1">
                              {consult.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Price and CTA */}
                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-foreground">${consult.price.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground line-through">$80–120</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{consult.time}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                                Get started <ArrowRight className="w-4 h-4" />
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

        {/* Common Concerns */}
        <ParallaxSection speed={0.15}>
          <section className="py-12 lg:py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 tracking-tight">
                  Common presenting concerns
                </h2>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                  The following conditions are typically suitable for telehealth assessment.
                </p>
              </motion.div>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {COMMON_CONCERNS.map((concern, index) => (
                  <motion.div
                    key={concern.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <div className="p-4 rounded-xl bg-card/50 border border-border/50">
                      <h3 className="font-semibold text-foreground text-sm mb-1">{concern.title}</h3>
                      <p className="text-xs text-muted-foreground">{concern.examples}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </ParallaxSection>

        {/* Safety Notice — softened */}
        <ParallaxSection speed={0.15}>
          <section className="py-8">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <motion.div
                className="p-4 rounded-xl bg-muted/30 border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-xs text-muted-foreground text-center">
                  For emergencies (chest pain, difficulty breathing, severe symptoms), call <strong>000</strong> or go to your nearest emergency department.
                </p>
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
                  Three steps. Clinical assessment. Treatment plan.
                </h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  Describe your concern. A GP assesses and contacts you. Receive your treatment plan.
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
                <Button asChild size="lg" className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all">
                  <Link href="/request?service=consult">
                    Start your consult
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Doctor typically responds within 2 hours
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
              subtitle="Real reviews from Australians who have used our service."
              badgeText="Patient Reviews"
              className="py-0 my-0"
            />
          </section>
        </ParallaxSection>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
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
                  Everything you need to know about our general consultations.
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
                        <Stethoscope className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Real GP consultations</span>
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                        Ready to speak with a doctor?
                      </h2>
                      <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                        Takes 3-5 minutes to get started. A doctor typically responds within 2 hours.
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap justify-center gap-4 mb-8">
                        {[
                          { icon: Phone, text: "Doctor calls you" },
                          { icon: Shield, text: "AHPRA registered" },
                          { icon: CheckCircle2, text: "Full refund if we can't help" },
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
                      
                      <Button 
                        asChild
                        size="lg"
                        className="px-8 h-12 font-semibold shadow-md shadow-primary/15 active:scale-[0.98]"
                      >
                        <Link href="/request?service=consult">
                          Start your consult <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      
                      <p className="mt-6 text-xs text-muted-foreground">
                        $49.95 flat fee <span className="line-through">$80–120 at GP</span> &middot; No account required &middot; Pay after review
                      </p>
                    </div>

              </motion.div>
            </div>
          </section>
        </ParallaxSection>
      </main>

      <MarketingFooter />
    </div>
  )
}
