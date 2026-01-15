'use client'

import Link from "next/link"
import Image from "next/image"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button, Accordion, AccordionItem } from "@heroui/react"
import { ArrowRight, Clock, Briefcase, Heart, GraduationCap, Check, CheckCircle2, Shield, BadgeCheck, FileCheck, Lock, Building2, Star, Users, Zap } from "lucide-react"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { ParallaxSection } from "@/components/ui/parallax-section"
import { MagneticCard, GradientBorderChase, SpotlightReveal } from "@/components/ui/glowing-effect"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { LiveServiceCounter, ViewingNowIndicator } from "@/components/marketing/social-proof-notifications"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// Certificate types - 3 tiers
const CERT_TYPES = [
  {
    id: "personal",
    title: "Personal Sick Leave",
    subtitle: "1-2 days off work",
    price: 19.95,
    time: "Under 1 hour",
    icon: Briefcase,
    description: "For when you're unwell and need a day or two to recover.",
    benefits: ["Valid for all employers", "PDF emailed to you", "AHPRA-registered GP"],
    popular: true,
    href: "/start?service=med-cert",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "study",
    title: "Study Leave",
    subtitle: "Uni, TAFE or exams",
    price: 19.95,
    time: "Under 1 hour",
    icon: GraduationCap,
    description: "For special consideration, extensions, or missed assessments.",
    benefits: ["Valid for all universities", "PDF emailed to you", "AHPRA-registered GP"],
    popular: false,
    href: "/start?service=med-cert",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    id: "carer",
    title: "Carer's Leave",
    subtitle: "Looking after someone",
    price: 19.95,
    time: "Under 1 hour",
    icon: Heart,
    description: "For when you need to care for a sick family member.",
    benefits: ["Valid for all employers", "PDF emailed to you", "AHPRA-registered GP"],
    popular: false,
    href: "/start?service=med-cert",
    color: "from-rose-500 to-pink-600",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
  },
]

// FAQ items
const FAQS = [
  {
    question: "Will my employer accept this?",
    answer: "Yes. Our certificates are issued by AHPRA-registered Australian doctors and are legally valid for all employers and universities.",
  },
  {
    question: "Can I use this for uni or TAFE?",
    answer: "Yes. Our certificates are accepted by all Australian universities and TAFEs for special consideration, extensions, or deferred exams.",
  },
  {
    question: "What if I'm actually quite sick?",
    answer: "Then you should definitely get a certificate. If we identify any red flags, we'll let you know if you should seek in-person care.",
  },
  {
    question: "How do I receive my certificate?",
    answer: "Once approved, your certificate is emailed to you as a PDF. You can also download it from your patient dashboard.",
  },
  {
    question: "Is this legal?",
    answer: "Yes. Our doctors are AHPRA-registered and practicing in Australia. Medical certificates issued through telehealth are legally equivalent to in-person consultations.",
  },
  {
    question: "What if my request is declined?",
    answer: "You'll receive a full refund. Our doctors may decline requests if they believe an in-person consultation is more appropriate for your situation.",
  },
]

// Testimonials for med cert
const testimonials = [
  { text: '"Got my cert in 25 minutes while lying in bed with the flu. Lifesaver."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahM', name: 'Sarah M.', role: 'Sydney' },
  { text: '"My employer accepted it no questions asked. Super professional."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JamesT', name: 'James T.', role: 'Melbourne' },
  { text: '"Used it for a uni extension. Got approved for special consideration the same day."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AmyW', name: 'Amy W.', role: 'UNSW Student' },
  { text: '"Much better than waiting 3 days for a GP appointment."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichelleK', name: 'Michelle K.', role: 'Brisbane' },
  { text: '"The doctor asked thorough follow-up questions. Felt legitimate."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DavidL', name: 'David L.', role: 'Perth' },
  { text: '"Used it for carer\'s leave. Process was simple and fast."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=EmmaR', name: 'Emma R.', role: 'Adelaide' },
  { text: '"Certificate looked exactly like what you\'d get from a clinic."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChrisB', name: 'Chris B.', role: 'Gold Coast' },
  { text: '"Needed a cert for a deferred exam. Sorted in under an hour."', image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TomH', name: 'Tom H.', role: 'UniMelb Student' },
]

// Trust badges
const trustBadges = [
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-emerald-600" },
  { name: "TGA Compliant", description: "Meets all regulations", icon: FileCheck, color: "text-blue-600" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-violet-600" },
  { name: "Australian-based", description: "Sydney HQ", icon: Building2, color: "text-amber-600" },
]

// How it works steps
const steps = [
  {
    number: "01",
    title: "Answer a few questions",
    description: "Quick form about your symptoms. Takes about 2 minutes.",
    time: "2 min",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "02",
    title: "Doctor reviews your request",
    description: "An AHPRA-registered GP reviews and makes a clinical decision.",
    time: "Under 1 hour",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    number: "03",
    title: "Certificate emailed to you",
    description: "Valid PDF certificate delivered straight to your inbox.",
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

// Doctor images
const doctorImages = [
  '/female-doctor-professional-headshot-warm-smile-aus.jpg',
  '/middle-aged-australian-man-with-glasses-friendly-p.jpg',
  '/indian-australian-woman-professional-headshot-smil.jpg',
]

export default function MedicalCertificatePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />

      <main className="relative">
        {/* Hero Section */}
        <ParallaxSection speed={0.2}>
          <section className="relative pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 overflow-hidden">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {/* Top badge */}
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-medium text-foreground/80">Doctors online now</span>
                </div>
              </motion.div>

              {/* Main content */}
              <div className="text-center max-w-4xl mx-auto">
                <motion.h1 
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  Medical certificate.{' '}
                  <span className="text-premium-gradient">Sorted.</span>
                </motion.h1>

                <motion.p 
                  className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Get a valid certificate for work or uni, reviewed by an Australian-registered doctor. Most requests sorted in under an hour.
                </motion.p>

                {/* CTAs */}
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Button 
                    as={Link}
                    href="/start?service=med-cert"
                    color="primary"
                    size="lg"
                    className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                    endContent={<ArrowRight className="h-4 w-4" />}
                  >
                    Get started
                  </Button>
                  <Button 
                    as={Link}
                    href="#how-it-works"
                    variant="bordered"
                    size="lg"
                    className="h-12 px-8"
                  >
                    See how it works
                  </Button>
                </motion.div>

                {/* Guarantee badge */}
                <motion.p 
                  className="text-sm text-muted-foreground mb-4 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                >
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Full refund if we can&apos;t help
                </motion.p>

                {/* Social proof indicators */}
                <motion.div 
                  className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <ViewingNowIndicator service="med-cert" />
                  <LiveServiceCounter service="med-cert" />
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
                    { icon: CheckCircle2, text: "7 days a week" },
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
                  <div className="text-2xl font-bold text-foreground mb-1">$19.95</div>
                  <p className="text-xs text-muted-foreground">Flat fee</p>
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
                  <div className="text-2xl font-bold text-foreground mb-1">AHPRA</div>
                  <p className="text-xs text-muted-foreground">Registered doctors</p>
                </div>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>

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
                  Choose your certificate type
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                  Same price, same fast turnaround. Select the one that fits your situation.
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
                      <SpotlightReveal color={cert.id === 'personal' ? "#2563EB" : cert.id === 'study' ? "#7c3aed" : "#e11d48"} borderRadius="1rem">
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

                          <div className="p-6 flex-1 flex flex-col">
                            {/* Icon */}
                            <div 
                              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cert.bgColor}`}
                            >
                              <cert.icon className="w-6 h-6" style={{ color: cert.id === 'personal' ? '#2563EB' : cert.id === 'study' ? '#7c3aed' : '#e11d48' }} />
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                              {cert.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">{cert.subtitle}</p>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                              {cert.description}
                            </p>

                            {/* Benefits */}
                            <ul className="space-y-2 mb-6 flex-1">
                              {cert.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>

                            {/* Price and CTA */}
                            <div className="flex items-center justify-between pt-4 border-t border-border/50">
                              <div>
                                <span className="text-2xl font-bold text-foreground">${cert.price.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground ml-2">{cert.time}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                                Get started <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </SpotlightReveal>
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
                  Accepted everywhere
                </h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                  Our certificates meet Fair Work Act requirements and are accepted by all Australian employers, universities, and TAFEs.
                </p>
                
                {/* Trust indicators */}
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { label: "All employers", sub: "Large & small businesses" },
                    { label: "All universities", sub: "Go8, ATN, IRU & more" },
                    { label: "TAFE & RTOs", sub: "Vocational education" },
                    { label: "Government", sub: "Public sector" },
                  ].map((item) => (
                    <div 
                      key={item.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 border border-border/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
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
                  <span className="text-sm font-medium text-foreground/80">Simple process</span>
                </div>
                
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
                  Three steps. Done in under an hour.
                </h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  No appointments. No waiting rooms. Answer a few questions and a real doctor reviews your request.
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
                  href="/start?service=med-cert"
                  color="primary"
                  size="lg"
                  className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                  endContent={<ArrowRight className="h-4 w-4" />}
                >
                  Get started now
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Most requests sorted in under an hour
                </p>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>

        {/* Emergency Disclaimer */}
        <section className="px-4 pb-8">
          <div className="mx-auto max-w-2xl">
            <EmergencyDisclaimer />
          </div>
        </section>

        {/* Testimonials */}
        <ParallaxSection speed={0.25}>
          <section className="py-8 overflow-hidden">
            <TestimonialsColumnsWrapper
              testimonials={testimonials}
              title="What our patients say"
              subtitle="Real reviews from Australians who've used our service."
              badgeText="Patient Reviews"
              className="py-0 my-0"
            />
          </section>
        </ParallaxSection>

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
                <MagneticCard intensity={5} scale={1.01} borderRadius="1.5rem">
                  <GradientBorderChase 
                    colors={['#2563EB', '#4f46e5', '#4f46e5', '#EC4899', '#2563EB']}
                    duration={4}
                    borderWidth={2}
                    borderRadius="1.5rem"
                  >
                    <div className="bg-linear-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-3xl p-8 sm:p-12 text-center">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Ready when you are</span>
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                        Get your certificate sorted
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
                      
                      <Button 
                        as={Link}
                        href="/start?service=med-cert"
                        color="primary"
                        size="lg"
                        className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                        endContent={<ArrowRight className="h-4 w-4" />}
                      >
                        Get started
                      </Button>
                      
                      <p className="mt-6 text-xs text-muted-foreground">
                        $19.95 flat fee • No account required
                      </p>
                    </div>
                  </GradientBorderChase>
                </MagneticCard>
              </motion.div>
            </div>
          </section>
        </ParallaxSection>
      </main>

      <MarketingFooter />
    </div>
  )
}
