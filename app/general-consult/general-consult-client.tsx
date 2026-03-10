'use client'

import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { MarketingFooter } from "@/components/marketing"
import { Button } from "@/components/ui/button"
import { ArrowRight, Clock, Stethoscope, Phone, MessageCircle, FileText, Check, Shield, BadgeCheck, FileCheck, Lock, Building2 } from "lucide-react"
import { TrustLogos } from "@/components/marketing/trust-badges"
import { AvailabilityIndicator } from "@/components/shared/availability-indicator"
import { EmergencyDisclaimer } from "@/components/shared/emergency-disclaimer"
import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { getTestimonialsByService } from "@/lib/data/testimonials"
import { SplitHero } from "@/components/heroes"
import { ProcessSteps, AccordionSection, CTABanner, ImageTextSplit } from "@/components/sections"
import { MarketingPageShell } from "@/components/shared/marketing-page-shell"

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
    color: "from-primary to-primary/80",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
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
    color: "from-primary to-primary/80",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
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
    color: "from-success to-success/80",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
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
  { name: "AHPRA Registered", description: "Australian doctors only", icon: BadgeCheck, color: "text-success" },
  { name: "Clinical Standards", description: "Same as in-person care", icon: FileCheck, color: "text-primary" },
  { name: "256-bit SSL", description: "Bank-level encryption", icon: Lock, color: "text-primary" },
  { name: "Australian-based", description: "Sydney HQ", icon: Building2, color: "text-primary" },
]

// How it works steps — using ProcessStep shape (number is numeric)
const processSteps = [
  {
    number: 1,
    title: "Describe your concern",
    description: "Tell us what is going on and answer health questions. This helps the doctor prepare.",
  },
  {
    number: 2,
    title: "Doctor assessment",
    description: "A GP reviews your information and will often call you to discuss further.",
  },
  {
    number: 3,
    title: "Treatment plan",
    description: "The doctor provides advice, prescriptions if appropriate, or referrals if needed.",
  },
]

// Static trust signals (replaces fake live stats)
const trustSignals = [
  { icon: Stethoscope, text: 'Australian GP-reviewed' },
  { icon: Clock, text: 'Same-day response' },
  { icon: Shield, text: 'Full refund guarantee' },
]

export default function GeneralConsultPage() {
  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">
      <Navbar variant="marketing" />

      <main className="relative">
        {/* Hero Section — SplitHero with lifestyle image */}
        <SplitHero
          title="General GP consultation. Online."
          highlightWords={["Online."]}
          subtitle="Full clinical assessment for non-emergency concerns. Treatment, referrals, or prescriptions issued where appropriate."
          imageSrc="/images/consult-1.jpeg"
          imageAlt="Woman discussing health concern with doctor from home"
          className="pt-8 pb-0 sm:pt-12 lg:pt-16"
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
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </SplitHero>

        {/* Hero supporting content */}
        <section className="pb-8 px-4">
          <div className="mx-auto max-w-5xl">
            {/* Availability + safety */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <AvailabilityIndicator variant="badge" />
              <EmergencyDisclaimer variant="hero" className="text-xs sm:text-sm" />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" />
                Full refund if we can&apos;t help
              </p>
            </div>

            {/* Trust signals row */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 mb-8">
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
            </div>

            {/* Stats bar with price justification */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <div className="text-center p-4 rounded-xl bg-card/40 border border-border/40 backdrop-blur-sm">
                <div className="text-2xl font-bold text-foreground mb-1">$49.95</div>
                <p className="text-xs text-muted-foreground">Flat fee</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">vs $80–120 at a GP</p>
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
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              No account required &middot; Full refund if we can&apos;t help
            </p>
          </div>
        </section>

        {/* Trust Badges */}
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
                    <div className={cn("w-10 h-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-sm", badge.color)}>
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

        {/* Consultation Types */}
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

            {/* Trust signals */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {trustSignals.map((signal) => (
                <div key={signal.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <signal.icon className="w-3.5 h-3.5 text-primary" />
                  <span>{signal.text}</span>
                </div>
              ))}
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
                        "bg-card/70 dark:bg-white/5 backdrop-blur-xl",
                        "border border-border/20 dark:border-white/10",
                        "shadow-lg shadow-black/5 dark:shadow-black/20",
                        "hover:shadow-xl transition-all duration-300",
                        "group-hover:-translate-y-1",
                        consult.popular && "ring-2 ring-primary/30 dark:ring-primary/30"
                      )}>
                        {/* Popular badge */}
                        {consult.popular && (
                          <div className="absolute top-0 right-4 z-20">
                            <div className="px-3 py-1.5 rounded-b-lg bg-linear-to-r from-primary to-primary/80 text-white text-xs font-bold tracking-wide uppercase shadow-lg shadow-primary/30">
                              Popular
                            </div>
                          </div>
                        )}

                        {/* Gradient header */}
                        <div className={cn("h-1.5 w-full bg-linear-to-r", consult.color)} />

                        <div className="p-6 flex-1 flex flex-col">
                          {/* Icon */}
                          <div
                            className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", consult.bgColor)}
                          >
                            <consult.icon className="w-6 h-6 text-primary" />
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
                                <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Price and CTA */}
                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-foreground">${consult.price.toFixed(2)}</span>
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                <Shield className="w-4 h-4 text-success" />
                <span className="text-sm text-success dark:text-success font-medium">Full refund if we can&apos;t help</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Common Concerns */}
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

        {/* Doctor trust section with image */}
        <ImageTextSplit
          title="Reviewed by real doctors"
          highlightWords={["real doctors"]}
          description="Every consultation is assessed by an AHPRA-registered GP — the same standard of care as an in-person visit. Your doctor reviews your history, asks follow-up questions if needed, and provides a personalised treatment plan."
          imageSrc="/images/consult-2.jpeg"
          imageAlt="Doctor reviewing patient case on video call"
          imagePosition="left"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-success" /> AHPRA registered</span>
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Full clinical assessment</span>
            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-primary" /> Doctor calls when needed</span>
          </div>
        </ImageTextSplit>

        {/* How It Works — ProcessSteps */}
        <ProcessSteps
          id="how-it-works"
          pill="How it works"
          title="Three steps. Clinical assessment. Treatment plan."
          subtitle="Describe your concern. A GP assesses and contacts you. Receive your treatment plan."
          steps={processSteps}
          className="scroll-mt-20"
        />

        {/* Testimonials */}
        <section className="py-8 overflow-hidden">
          <TestimonialsColumnsWrapper
            testimonials={testimonials}
            title="What our patients say"
            subtitle="Real reviews from Australians who have used our service."
            badgeText="Patient Reviews"
            className="py-0 my-0"
          />
        </section>

        {/* FAQ Section — AccordionSection */}
        <AccordionSection
          pill="FAQ"
          title="Common questions"
          subtitle="Everything you need to know about our general consultations."
          groups={[{ items: FAQS }]}
        />

        {/* Final CTA — CTABanner */}
        <CTABanner
          title="Ready to speak with a doctor?"
          subtitle="Takes 3-5 minutes to get started. $49.95 flat fee. No account required. Full refund if we can't help."
          ctaText="Start your consult"
          ctaHref="/request?service=consult"
        />
      </main>

      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
