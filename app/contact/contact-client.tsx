"use client"

import { motion, useInView } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react"
import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useRef } from "react"

import { submitContactForm } from "@/app/actions/contact-form"
import { CenteredHero } from "@/components/heroes"
import { DoctorCredibility,LiveWaitTime } from "@/components/marketing"
import { ServiceClaimSection } from "@/components/marketing/sections/service-claim-section"
import { AnimatedDonutChart, InformationalPageShell } from "@/components/marketing/shared"
import { CTABanner } from "@/components/sections"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { scrollRevealConfig, useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"
import { Textarea } from "@/components/ui/textarea"
import { capture } from "@/lib/analytics/capture"
import { CONTACT_EMAIL, CONTACT_EMAIL_COMPLAINTS, CONTACT_PHONE } from "@/lib/constants"
import { getPatientCount,SOCIAL_PROOF } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

const CONTACT_CONFIG = {
  analyticsId: "contact" as const,
  sticky: false as const,
}

const contactReasons = [
  { id: "general", label: "General Inquiry", icon: MessageSquare },
  { id: "support", label: "Technical Support", icon: HelpCircle },
  { id: "request", label: "About My Request", icon: FileText },
  { id: "complaint", label: "Feedback", icon: AlertCircle },
]

export function ContactClient() {
  const [selectedReason, setSelectedReason] = useState("general")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    const formData = new FormData(e.currentTarget)
    formData.set("reason", selectedReason)

    // Track contact form submission in PostHog
    capture('contact_form_submitted', {
      contact_reason: selectedReason,
      has_name: !!formData.get('name'),
      has_email: !!formData.get('email'),
      has_subject: !!formData.get('subject'),
      has_message: !!formData.get('message'),
    })

    try {
      const result = await submitContactForm(formData)

      setIsSubmitting(false)

      if (result.success) {
        setIsSubmitted(true)
      } else {
        setSubmitError(result.error || "Failed to send message. Please try again.")
        capture('contact_form_error', { error: result.error })
      }
    } catch (err) {
      setIsSubmitting(false)
      setSubmitError("Failed to send message. Please try again.")
      capture('contact_form_error', { error: String(err) })
    }
  }

  if (isSubmitted) {
    return (
      <InformationalPageShell config={CONTACT_CONFIG}>
        {() => (
          <div className="flex-1 flex items-center justify-center px-4 py-20">
            <div className="mx-auto max-w-lg text-center">
              <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none p-10">
                <motion.div
                  initial={prefersReducedMotion ? {} : { scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div
                    className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent-teal flex items-center justify-center mb-6"
                    role="img"
                    aria-label="Success"
                  >
                    <CheckCircle2 className="h-10 w-10 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <h1 className="text-2xl font-semibold mb-3">
                    Message sent!
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    We&apos;ve got it - a real person will read your message and get back to you, usually within a few hours. Keep an eye on your inbox.
                  </p>
                  <Button asChild className="rounded-full text-primary-foreground">
                    <Link href="/">
                      Back to Home
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </InformationalPageShell>
    )
  }

  return (
    <InformationalPageShell config={CONTACT_CONFIG}>
      {() => (
        <>
        {/* Hero */}
        <CenteredHero
          pill="Contact Us"
          title="Got a question? We're here to help."
          highlightWords={["here to help."]}
          subtitle="Real people who read and reply to every message. Usually within a few hours, always within 24."
          className="pt-32 pb-16"
        />

        {/* Page superpower — anchors the response-quality promise */}
        <ServiceClaimSection
          eyebrow="No bots, no ticket queues"
          headline={
            <>
              Real <span className="text-primary">humans</span> read every message.
            </>
          }
          body="No chatbot wall, no auto-responder loop. Every contact-form message lands in a real inbox and gets a written reply, usually within a few hours and always within 24."
        />

        {/* Response Stats */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <section className="py-12 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="text-center mb-8">
                <SectionPill>Response times</SectionPill>
              </div>
              <div className="grid sm:grid-cols-2 gap-8 items-center">
                <div className="flex justify-center">
                  <AnimatedDonutChart
                    value={SOCIAL_PROOF.certApprovalPercent}
                    label="Request approval rate"
                    size={130}
                    strokeWidth={11}
                  />
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none p-4">
                    <p className="text-2xl font-semibold text-primary tabular-nums">{SOCIAL_PROOF.refundPercent}%</p>
                    <p className="text-xs text-muted-foreground">Refund if declined</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none p-4">
                    <p className="text-2xl font-semibold text-foreground tabular-nums">24h max</p>
                    <p className="text-xs text-muted-foreground">Every message gets a reply</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Contact Section */}
        <section className="py-12 pb-24" aria-labelledby="contact-section-title">
          <h2 id="contact-section-title" className="sr-only">
            Contact Information and Form
          </h2>
          <div className="max-w-6xl mx-auto px-4 grid gap-12 lg:grid-cols-5">
              {/* Contact Info Sidebar */}
              <div className="lg:col-span-2 space-y-6">
                <ContactInfoCard prefersReducedMotion={prefersReducedMotion} />
                <FAQLinkCard prefersReducedMotion={prefersReducedMotion} />
              </div>

              {/* Contact Form */}
              <ContactFormCard
                selectedReason={selectedReason}
                setSelectedReason={setSelectedReason}
                isSubmitting={isSubmitting}
                submitError={submitError}
                handleSubmit={handleSubmit}
                prefersReducedMotion={prefersReducedMotion}
              />
          </div>
        </section>

        {/* Doctor Credibility */}
        <DoctorCredibility
          variant="inline"
          stats={["experience", "approval", "reviews"]}
          className="max-w-3xl mx-auto px-4 sm:px-6 py-8"
        />

        {/* Live Wait Time */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <LiveWaitTime variant="strip" />
        </div>

        {/* CTA Banner */}
        <CTABanner
          title="Looking for a medical certificate or repeat medication?"
          subtitle={`Join ${getPatientCount().toLocaleString()}+ Australians who trust InstantMed. Fill in a quick form and a real GP reviews your request.`}
          ctaText="Get started"
          ctaHref="/request"
          secondaryText="See how it works"
          secondaryHref="/faq"
        />
        </>
      )}
    </InformationalPageShell>
  )
}

/* ------------------------------------------------------------------ */
/* Contact Info Card                                                   */
/* ------------------------------------------------------------------ */

function ContactInfoCard({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  })

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { y: 16 }}
      animate={prefersReducedMotion ? {} : isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          Contact Information
        </h3>
        <address className="space-y-5 not-italic">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Phone className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Phone</p>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {CONTACT_PHONE}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Location</p>
              <p className="text-sm text-muted-foreground">Sydney, Australia</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Request Hours</p>
              <p className="text-sm text-muted-foreground">Requests accepted 24/7 · Doctor review follows when available</p>
            </div>
          </div>
          <div className="flex items-start gap-4 pt-2 border-t border-border/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">Formal Complaints</p>
              <a
                href={`mailto:${CONTACT_EMAIL_COMPLAINTS}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors block"
              >
                {CONTACT_EMAIL_COMPLAINTS}
              </a>
              <p className="text-xs text-muted-foreground mt-1">14 business day response, AHPRA escalation path</p>
            </div>
          </div>
        </address>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* FAQ Link Card                                                       */
/* ------------------------------------------------------------------ */

function FAQLinkCard({ prefersReducedMotion }: { prefersReducedMotion: boolean | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  })

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { y: 16 }}
      animate={prefersReducedMotion ? {} : isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-md shadow-primary/[0.06] dark:shadow-none p-6">
        <HelpCircle className="h-8 w-8 text-primary mb-3" aria-hidden="true" />
        <h3 className="font-semibold mb-2">Looking for quick answers?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Check our FAQ - chances are someone&apos;s already asked.
        </p>
        <Button variant="outline" asChild className="rounded-full w-full bg-transparent transition-colors">
          <Link href="/faq">
            View FAQ
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Contact Form Card                                                   */
/* ------------------------------------------------------------------ */

function ContactFormCard({
  selectedReason,
  setSelectedReason,
  isSubmitting,
  submitError,
  handleSubmit,
  prefersReducedMotion,
}: {
  selectedReason: string
  setSelectedReason: (reason: string) => void
  isSubmitting: boolean
  submitError: string | null
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  prefersReducedMotion: boolean | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once: scrollRevealConfig.once,
    amount: scrollRevealConfig.threshold,
  })

  return (
    <motion.div
      ref={ref}
      className="lg:col-span-3"
      initial={prefersReducedMotion ? {} : { y: 16 }}
      animate={prefersReducedMotion ? {} : isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-lg shadow-primary/[0.06] dark:shadow-none p-8">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" aria-hidden="true" />
          Send us a message
        </h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reason Selection */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">What can we help you with?</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Contact reason">
              {contactReasons.map((reason) => {
                const Icon = reason.icon
                return (
                  <button
                    key={reason.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedReason === reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-[background-color,color] duration-200",
                      selectedReason === reason.id
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {reason.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Smith"
                required
                autoComplete="name"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
                autoComplete="email"
                className="h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="How can we help?"
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Tell us more about your inquiry..."
              minRows={5}
              required
              className="resize-none"
            />
          </div>

          {submitError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm" role="alert">
              {submitError}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full text-primary-foreground font-semibold transition-shadow hover:shadow-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-4 w-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"
                  aria-hidden="true"
                />
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" aria-hidden="true" />
                Send Message
              </span>
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  )
}
