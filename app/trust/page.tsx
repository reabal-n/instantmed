'use client'

import Link from "next/link"
import Image from "next/image"
import Script from "next/script"
import { useState, useEffect, useRef } from "react"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { MediaMentions } from "@/components/marketing/media-mentions"
import { Mail } from "lucide-react"
import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion"
import { RotatingText } from "@/components/marketing/rotating-text"
import { MagneticCard, Spotlight } from "@/components/ui/glowing-effect"
import { Accordion, AccordionItem } from "@heroui/react"
import {
  AHPRALogo,
  SSLLogo,
  MedicareLogo,
  AusGovLogo,
  TGALogo,
  LegitScriptLogo,
} from "@/components/icons/certification-logos"
import {
  TextRevealWord,
  GridStagger,
  HolographicCard,
} from "@/components/effects"
import {
  AnimatedOrbs,
  GlowLine,
  FloatingBadge,
  ShimmerButton,
} from "@/components/ui/premium-effects"
import {
  Shield,
  UserCheck,
  Lock,
  Phone,
  CheckCircle2,
  ExternalLink,
  Building2,
  Scale,
  BookOpen,
  BadgeCheck,
  Users,
  ArrowRight,
  Clock,
  MessageSquare,
  FileCheck,
  Send,
  Star,
  Quote,
  Check,
  X,
  Sparkles,
  ChevronDown,
  Verified,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Section IDs for scroll navigation
const SECTION_IDS = {
  pillars: "trust-pillars",
  process: "process-timeline", 
  compare: "comparison",
  testimonials: "testimonials",
  faq: "faq",
  verify: "verify-doctors",
}

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 2000) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      motionValue.set(target)
    }
  }, [isInView, target, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest))
    })
    return unsubscribe
  }, [springValue])

  return { ref, displayValue, isInView }
}

// Rotating headline variations
const HEADLINE_VARIATIONS = [
  "Built on trust.",
  "Clinician-led care.",
  "Your data, protected.",
  "Real doctors. Always.",
]

// Trust-focused testimonials with verified badges
const trustTestimonials = [
  {
    text: "My employer accepted the certificate no questions asked. It looked exactly like what you'd get from a clinic.",
    name: "James T.",
    location: "Melbourne",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Google",
  },
  {
    text: "The doctor asked thorough follow-up questions. Felt legitimate and properly reviewed.",
    name: "Sarah M.",
    location: "Sydney",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Google",
  },
  {
    text: "I checked the doctor's AHPRA registration myself. They're legit. Made me feel much more comfortable.",
    name: "David L.",
    location: "Perth",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Trustpilot",
  },
  {
    text: "Was skeptical at first, but the whole process was professional. Real Australian doctors.",
    name: "Emma R.",
    location: "Brisbane",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Google",
  },
  {
    text: "Used it for a uni extension. Special consideration was approved same day.",
    name: "Amy W.",
    location: "UNSW Student",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Trustpilot",
  },
  {
    text: "Much better than waiting 3 days for a GP appointment just to get a medical certificate.",
    name: "Chris B.",
    location: "Gold Coast",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
    verified: true,
    source: "Google",
  },
]

// FAQ items focused on trust
const trustFAQs = [
  {
    question: "How do I know the doctors are real?",
    answer: "Every doctor on InstantMed holds current AHPRA registration — the same regulatory body that governs all Australian medical practitioners. You can verify any doctor's credentials yourself on the AHPRA public register. We also require professional indemnity insurance and conduct regular clinical audits.",
  },
  {
    question: "Will my employer accept certificates from InstantMed?",
    answer: "Yes. Our medical certificates are issued by AHPRA-registered Australian GPs and are legally equivalent to certificates from any in-person clinic. They include the doctor's name, registration number, and all required details. Thousands of employers and universities accept our certificates.",
  },
  {
    question: "What happens to my personal health information?",
    answer: "Your data is protected with 256-bit SSL encryption (the same as banks) and stored exclusively on Australian servers. We comply with the Privacy Act 1988 and Australian Privacy Principles. We never share your information with third parties without your consent.",
  },
  {
    question: "Is this actually reviewed by a doctor, or is it automated?",
    answer: "Every single request is reviewed by a qualified Australian GP who makes an independent clinical decision. There are no automated approvals. Doctors can request additional information, schedule a call, or decline requests that don't meet clinical guidelines.",
  },
  {
    question: "What if I'm not happy with the service?",
    answer: "We respond to complaints within 48 hours and offer a full refund if we can't help you. You can also escalate concerns to the Health Complaints Commissioner in your state. We take feedback seriously and use it to improve our service.",
  },
  {
    question: "Are electronic prescriptions legitimate?",
    answer: "Yes. Our eScripts are sent via official PBS channels and work at any Australian pharmacy. Just show the QR code on your phone. eScripts are the standard across Australia and are fully compliant with the Therapeutic Goods Act.",
  },
]

// Process steps
const processSteps = [
  {
    step: 1,
    title: "You submit your request",
    description: "Answer a few questions about your situation. Takes about 2 minutes.",
    icon: MessageSquare,
    time: "2 min",
  },
  {
    step: 2,
    title: "Request enters review queue",
    description: "Your details are securely transmitted and queued for doctor review.",
    icon: FileCheck,
    time: "Instant",
  },
  {
    step: 3,
    title: "Doctor reviews your case",
    description: "An AHPRA-registered GP reviews your full submission and medical history.",
    icon: UserCheck,
    time: "Under 1 hour",
  },
  {
    step: 4,
    title: "Decision & follow-up if needed",
    description: "The doctor may approve, request more info, or contact you directly.",
    icon: Phone,
    time: "If required",
  },
  {
    step: 5,
    title: "Certificate or prescription sent",
    description: "Documents are sent directly to your email. eScripts via SMS.",
    icon: Send,
    time: "Instant",
  },
]

// Comparison data
const comparisonData = [
  { feature: "AHPRA-registered doctors", instantmed: true, traditional: true },
  { feature: "Medicare-compliant documents", instantmed: true, traditional: true },
  { feature: "Available 7 days a week", instantmed: true, traditional: false },
  { feature: "No appointment wait time", instantmed: true, traditional: false },
  { feature: "Average time to certificate", instantmed: "<1 hour", traditional: "2-5 days" },
  { feature: "Complete from your phone", instantmed: true, traditional: false },
  { feature: "Upfront, transparent pricing", instantmed: true, traditional: "Varies" },
  { feature: "AHPRA verification available", instantmed: true, traditional: true },
]

// Trust pillars with enhanced data
const trustPillars = [
  {
    icon: UserCheck,
    title: "AHPRA-Registered Doctors",
    description:
      "Every doctor on InstantMed holds current AHPRA registration. We verify credentials before they join and monitor registration status continuously.",
    details: [
      "All doctors hold current AHPRA registration",
      "We verify credentials directly with AHPRA",
      "Professional indemnity insurance required",
      "Regular clinical decision audits",
    ],
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=400&fit=crop&crop=face",
    color: "from-emerald-500/20 to-teal-500/20",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Shield,
    title: "Human-Reviewed Requests",
    description:
      "Your request is reviewed by a qualified GP who makes an independent clinical decision. No automated approvals — every request gets proper attention.",
    details: [
      "Doctors review your full medical history",
      "Clinical guidelines inform every decision",
      "Doctors can contact you for more info",
      "Every request is human-reviewed",
    ],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop",
    color: "from-blue-500/20 to-indigo-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description:
      "Your health information is protected with enterprise-grade security. We comply with Australian Privacy Principles and store all data on Australian servers.",
    details: [
      "256-bit SSL encryption for all data",
      "Data stored on Australian servers only",
      "Compliant with Privacy Act 1988",
      "Regular security audits and pen testing",
    ],
    image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=400&fit=crop",
    color: "from-violet-500/20 to-purple-500/20",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    icon: Building2,
    title: "Medicare Compliance",
    description:
      "Our prescriptions and referrals are Medicare-compliant. Electronic prescriptions work at any Australian pharmacy.",
    details: [
      "eScripts sent to your phone via SMS",
      "Referrals valid for 12 months",
      "Full Medicare rebate eligibility",
      "Compliant with Therapeutic Goods Act",
    ],
    image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=400&fit=crop",
    color: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: Scale,
    title: "Clear Complaints Process",
    description:
      "We take complaints seriously. If you&apos;re unhappy with our service, you can lodge a complaint directly with us or escalate to the health ombudsman.",
    details: [
      "Respond to complaints within 48 hours",
      "Independent review by senior doctors",
      "Escalation to Health Complaints Commissioner",
      "Full refund if we can&apos;t help you",
    ],
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&h=400&fit=crop",
    color: "from-rose-500/20 to-pink-500/20",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: BookOpen,
    title: "Clinical Governance",
    description:
      "Our processes are designed by practising GPs and align with RACGP Standards for General Practices.",
    details: [
      "Medical Director oversight on all protocols",
      "Regular peer review of clinical decisions",
      "Incident reporting and learning framework",
      "Quarterly protocol reviews and updates",
    ],
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop",
    color: "from-cyan-500/20 to-sky-500/20",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-600 dark:text-cyan-400",
  },
]

// Certification badges
const certificationBadges = [
  { name: "AHPRA Registered", description: "All doctors verified", Logo: AHPRALogo },
  { name: "TGA Compliant", description: "Meets all regulations", Logo: TGALogo },
  { name: "256-bit SSL", description: "Bank-level encryption", Logo: SSLLogo },
  { name: "Medicare Approved", description: "Full compliance", Logo: MedicareLogo },
  { name: "Australian Servers", description: "Data stays in AU", Logo: AusGovLogo },
  { name: "Verified Platform", description: "Legitimate service", Logo: LegitScriptLogo },
]

// Animated stat component
function AnimatedStat({ value, suffix = "", label, icon: Icon }: { value: number; suffix?: string; label: string; icon: React.ElementType }) {
  const { ref, displayValue, isInView } = useAnimatedCounter(value)
  
  return (
    <motion.div
      className="text-center p-4 rounded-xl bg-card/50 border border-border/40 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4 }}
    >
      <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
      <div className="text-xl font-bold text-foreground">
        <span ref={ref}>{displayValue.toLocaleString()}</span>{suffix}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </motion.div>
  )
}

// JSON-LD structured data for FAQ
const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": trustFAQs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer,
    },
  })),
}

export default function TrustPage() {
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

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" })
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />

      <main className="relative">
        {/* Hero Section - Enhanced with Effects */}
        <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 overflow-hidden">
          {/* Animated Orbs Background - respects reduced motion */}
          {!prefersReducedMotion && <AnimatedOrbs className="opacity-50" orbCount={3} />}
          
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-linear-to-b from-primary/2 via-background to-background" />
          
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            {/* Badge with FloatingBadge effect */}
            <div className="flex justify-center mb-6">
              <FloatingBadge color="primary" delay={0.1}>
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground/80">Trust & Safety</span>
              </FloatingBadge>
            </div>

            {/* Main headline with TextRevealWord effect */}
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                <TextRevealWord delay={0.2} className="justify-center">
                  Your health. Our responsibility.
                </TextRevealWord>
                <span className="block mt-2 text-premium-gradient">
                  <RotatingText 
                    texts={HEADLINE_VARIATIONS} 
                    interval={3000}
                    gradient={false}
                    className="text-premium-gradient"
                  />
                </span>
              </h1>
            </div>

            {/* Subheadline */}
            <motion.p 
              className="text-center text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              We built InstantMed on a foundation of clinical excellence, transparency, and genuine care. Here&apos;s how we earn your trust.
            </motion.p>

            {/* Trust pills with FloatingBadge */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <FloatingBadge color="success" delay={0.5}>
                <BadgeCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">AHPRA Verified</span>
              </FloatingBadge>
              <FloatingBadge color="primary" delay={0.6}>
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">256-bit Encryption</span>
              </FloatingBadge>
              <FloatingBadge color="success" delay={0.7}>
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">10,000+ Aussies Helped</span>
              </FloatingBadge>
            </div>

            {/* Animated Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
              <AnimatedStat value={10000} suffix="+" label="Patients helped" icon={Users} />
              <AnimatedStat value={100} suffix="%" label="AHPRA verified" icon={BadgeCheck} />
              <AnimatedStat value={256} suffix="-bit" label="SSL encryption" icon={Lock} />
              <AnimatedStat value={7} suffix=" days" label="Week availability" icon={Clock} />
            </div>

            {/* Scroll-to-section quick links */}
            <motion.div 
              className="flex flex-wrap justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <button
                onClick={() => scrollToSection(SECTION_IDS.pillars)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-primary/30 transition-colors"
              >
                How we keep you safe
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => scrollToSection(SECTION_IDS.verify)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-primary/30 transition-colors"
              >
                Verify our doctors
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => scrollToSection(SECTION_IDS.testimonials)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-full border border-border/50 hover:border-primary/30 transition-colors"
              >
                Patient reviews
                <ChevronDown className="w-3 h-3" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Certification Badges */}
        <section className="py-12 border-y border-border/30 bg-muted/20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="flex flex-wrap justify-center items-center gap-6 md:gap-10"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {certificationBadges.map((badge, index) => (
                <motion.div
                  key={badge.name}
                  className="flex items-center gap-3 px-4 py-2"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <badge.Logo className="w-8 h-8" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Trust Pillars - Premium cards with 3D tilt */}
        <section id={SECTION_IDS.pillars} className="py-16 lg:py-20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div 
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                How we keep you safe
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Six pillars of trust that guide everything we do.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {trustPillars.map((pillar, index) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <MagneticCard intensity={8} scale={1.02} borderRadius="1.5rem">
                    <Spotlight color="rgba(99, 102, 241, 0.08)" size={400}>
                      <div className={cn(
                        "relative h-full rounded-3xl overflow-hidden",
                        "bg-card/80 backdrop-blur-xl",
                        "border border-border/50",
                        "shadow-lg shadow-black/5 dark:shadow-black/20",
                        "transition-shadow duration-300 hover:shadow-xl"
                      )}>
                        {/* Subtle gradient overlay */}
                        <div className={cn(
                          "absolute inset-0 bg-linear-to-br opacity-30",
                          pillar.color
                        )} />
                        
                        {/* Image header */}
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={pillar.image}
                            alt={pillar.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-card via-card/50 to-transparent" />
                          
                          {/* Floating icon */}
                          <div className={cn(
                            "absolute bottom-4 left-6 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                            pillar.iconBg,
                            "border border-white/20 dark:border-white/10"
                          )}>
                            <pillar.icon className={cn("w-6 h-6", pillar.iconColor)} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="relative p-6">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {pillar.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                            {pillar.description}
                          </p>

                          {/* Details */}
                          <ul className="grid grid-cols-1 gap-2">
                            {pillar.details.map((detail, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Spotlight>
                  </MagneticCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Process Transparency Timeline */}
        <section className="py-16 lg:py-20 bg-muted/20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                What happens behind the scenes
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Complete transparency on how your request is handled.
              </p>
            </motion.div>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-border md:-translate-x-px" />
              
              {processSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  className={cn(
                    "relative flex items-start gap-4 md:gap-8 mb-8 last:mb-0",
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  )}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {/* Step number circle */}
                  <div className="absolute left-6 md:left-1/2 w-12 h-12 -translate-x-1/2 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold z-10">
                    {step.step}
                  </div>
                  
                  {/* Content card */}
                  <div className={cn(
                    "ml-16 md:ml-0 md:w-[calc(50%-2rem)] p-5 rounded-2xl bg-card border border-border/50 shadow-sm",
                    index % 2 === 0 ? "md:mr-auto md:text-right" : "md:ml-auto md:text-left"
                  )}>
                    <div className={cn(
                      "flex items-center gap-2 mb-2",
                      index % 2 === 0 ? "md:justify-end" : "md:justify-start"
                    )}>
                      <step.icon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-primary">{step.time}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                Same quality. More convenience.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                How InstantMed compares to booking a traditional GP appointment.
              </p>
            </motion.div>

            <motion.div
              className="rounded-2xl border border-border/50 overflow-hidden bg-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Header */}
              <div className="grid grid-cols-3 bg-muted/50 border-b border-border/50">
                <div className="p-4 font-medium text-sm text-foreground">Feature</div>
                <div className="p-4 font-medium text-sm text-foreground text-center border-x border-border/30">InstantMed</div>
                <div className="p-4 font-medium text-sm text-foreground text-center">Traditional GP</div>
              </div>
              
              {/* Rows */}
              {comparisonData.map((row, index) => (
                <div 
                  key={row.feature} 
                  className={cn(
                    "grid grid-cols-3",
                    index !== comparisonData.length - 1 && "border-b border-border/30"
                  )}
                >
                  <div className="p-4 text-sm text-foreground">{row.feature}</div>
                  <div className="p-4 text-center border-x border-border/30">
                    {typeof row.instantmed === "boolean" ? (
                      row.instantmed ? (
                        <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-rose-500 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm font-medium text-emerald-600">{row.instantmed}</span>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    {typeof row.traditional === "boolean" ? (
                      row.traditional ? (
                        <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-rose-500 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">{row.traditional}</span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id={SECTION_IDS.testimonials} className="py-16 lg:py-20 bg-muted/20 scroll-mt-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                What patients say about trust
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Real feedback from verified patients.
              </p>
            </motion.div>

            <GridStagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
              {trustTestimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="relative p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                >
                  {/* Source badge */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    {testimonial.verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Verified className="w-3 h-3" />
                        {testimonial.source}
                      </span>
                    )}
                  </div>
                  <Quote className="absolute bottom-4 right-4 w-6 h-6 text-primary/10" />
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed relative z-10 pr-16">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        loading="lazy"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </GridStagger>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                Common questions about trust
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                We understand you want to be sure. Here are the answers.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Accordion 
                variant="splitted"
                defaultExpandedKeys={["0"]}
                className="gap-3"
              >
                {trustFAQs.map((faq, index) => (
                  <AccordionItem
                    key={index.toString()}
                    aria-label={faq.question}
                    title={<span className="font-medium text-foreground">{faq.question}</span>}
                    classNames={{
                      base: "bg-card border border-border/50 shadow-sm hover:border-primary/20 transition-colors",
                      title: "text-foreground",
                      content: "text-muted-foreground leading-relaxed pb-4 text-sm",
                    }}
                  >
                    {faq.answer}
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* AHPRA Verification CTA - HolographicCard */}
        <section id={SECTION_IDS.verify} className="py-16 lg:py-20 bg-muted/20 scroll-mt-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <HolographicCard intensity="medium" className="p-8 md:p-12">
                <div className="relative flex flex-col md:flex-row items-center gap-8">
                  {/* Content */}
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Verify Independently</span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-3">
                      Check our doctors yourself
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Every doctor&apos;s registration can be independently verified on the AHPRA public register. We encourage you to check.
                    </p>
                    <Link 
                      href="https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ShimmerButton className="inline-flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        AHPRA Public Register
                      </ShimmerButton>
                    </Link>
                  </div>
                  
                  {/* Visual */}
                  <div className="relative w-48 h-48 md:w-56 md:h-56 shrink-0">
                    <div className="absolute inset-0 rounded-2xl overflow-hidden border-4 border-white/80 dark:border-slate-800/80 shadow-xl">
                      <Image
                        src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
                        alt="Verified Australian GP"
                        fill
                        priority
                        className="object-cover"
                      />
                    </div>
                    {/* Verification badge */}
                    <motion.div
                      className="absolute -bottom-3 -right-3 bg-white dark:bg-slate-800 rounded-xl p-2.5 shadow-lg border border-border/50"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                    >
                      <BadgeCheck className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                  </div>
                </div>
              </HolographicCard>
            </motion.div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Still have concerns?
              </h2>
              <p className="text-muted-foreground mb-8">
                We&apos;re happy to answer any questions about our processes, doctors, or security measures.
              </p>
              <Link 
                href="mailto:hello@instantmed.com.au"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border/50 text-foreground hover:border-primary/30 hover:bg-card/80 transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-medium">hello@instantmed.com.au</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Media mentions */}
        <MediaMentions variant="section" />

        {/* GlowLine Divider */}
        <div className="max-w-2xl mx-auto px-4">
          <GlowLine />
        </div>

        {/* Final CTA with ShimmerButton */}
        <section className="py-16 lg:py-20 bg-linear-to-t from-muted/30 to-transparent">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground/80">Trusted by 10,000+ Australians</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of Australians who trust InstantMed for their healthcare needs.
              </p>
              <Link href="/start">
                <ShimmerButton className="inline-flex items-center gap-2 px-8 py-4 text-lg">
                  Get started
                  <ArrowRight className="w-5 h-5" />
                </ShimmerButton>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* JSON-LD Structured Data */}
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

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
        <Link href="/start" className="block">
          <ShimmerButton className="w-full flex items-center justify-center gap-2 py-3">
            Get started
            <ArrowRight className="w-4 h-4" />
          </ShimmerButton>
        </Link>
      </motion.div>

      <MarketingFooter />
    </div>
  )
}
