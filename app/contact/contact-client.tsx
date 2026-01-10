"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Chip } from "@heroui/react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { TiltCard } from "@/components/shared/tilt-card"
import {
  Mail,
  MapPin,
  Clock,
  Send,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  FileText,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import posthog from "posthog-js"

const contactReasons = [
  { id: "general", label: "General Inquiry", icon: MessageSquare, emoji: "💬" },
  { id: "support", label: "Technical Support", icon: HelpCircle, emoji: "🔧" },
  { id: "request", label: "About My Request", icon: FileText, emoji: "📋" },
  { id: "complaint", label: "Feedback", icon: AlertCircle, emoji: "💡" },
]

export function ContactClient() {
  const [selectedReason, setSelectedReason] = useState("general")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Track contact form submission in PostHog
    posthog.capture('contact_form_submitted', {
      contact_reason: selectedReason,
      has_name: !!formData.get('name'),
      has_email: !!formData.get('email'),
      has_subject: !!formData.get('subject'),
      has_message: !!formData.get('message'),
    })

    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar variant="marketing" />
        <main className="flex-1 flex items-center justify-center bg-gradient-hero px-4 py-20">
          <div className="mx-auto max-w-lg text-center">
            <TiltCard className="p-10 animate-scale-in">
              <div
                className="mx-auto w-20 h-20 rounded-full bg-linear-to-br from-[#2563EB] to-[#00C9A0] flex items-center justify-center mb-6 animate-success-bounce"
                role="img"
                aria-label="Success"
              >
                <CheckCircle2 className="h-10 w-10 text-[#0A0F1C]" aria-hidden="true" />
              </div>
              <div className="text-4xl mb-4" aria-hidden="true">
                🎉
              </div>
              <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
                Message Sent!
              </h1>
              <p className="text-muted-foreground mb-8">
                Thanks for reaching out. We typically respond within a few hours during business days. Keep an eye on
                your inbox!
              </p>
              <Button asChild className="rounded-full btn-premium magnetic-button text-[#0A0F1C]">
                <Link href="/">
                  Back to Home
                  <ArrowRight className="ml-2 h-4 w-4 icon-spin-hover" aria-hidden="true" />
                </Link>
              </Button>
            </TiltCard>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="marketing" />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero" aria-hidden="true" />
          <div
            className="absolute top-20 right-1/4 w-72 h-72 bg-[#2563EB]/10 rounded-full blur-3xl"
            aria-hidden="true"
          />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-3xl mx-auto text-center">
              <Chip color="success" variant="flat" startContent={<Sparkles className="w-3.5 h-3.5" />} className="mb-4 badge-premium spacing-premium">
                Contact Us
              </Chip>
              <h1
                className="text-4xl md:text-5xl font-bold text-foreground tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Got a question? <span className="text-premium-gradient">Let&apos;s chat.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                We&apos;re real humans who actually read and reply to every message. Usually within a few hours, always
                within 24.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 pb-24" aria-labelledby="contact-section-title">
          <h2 id="contact-section-title" className="sr-only">
            Contact Information and Form
          </h2>
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-5">
              {/* Contact Info */}
              <div className="lg:col-span-2 space-y-6">
                <TiltCard
                  className="p-6 animate-fade-in-up opacity-0"
                  style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}
                >
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">
                      📞
                    </span>
                    Contact Information
                  </h3>
                  <address className="space-y-5 not-italic">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
                        <Mail className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <a
                          href="mailto:hello@instantmed.com.au"
                          className="text-sm text-muted-foreground hover:text-[#2563EB] transition-colors"
                        >
                          hello@instantmed.com.au
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
                        <MapPin className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">Sydney, Australia</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2563EB]/10">
                        <Clock className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Business Hours</p>
                        <p className="text-sm text-muted-foreground">Mon - Sun: 8am - 10pm AEST</p>
                      </div>
                    </div>
                  </address>
                </TiltCard>

                {/* FAQ Link */}
                <TiltCard
                  className="p-6 animate-fade-in-up opacity-0"
                  style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}
                >
                  <div className="text-3xl mb-3" aria-hidden="true">
                    💡
                  </div>
                  <h3 className="font-semibold mb-2">Looking for quick answers?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check our FAQ — most questions are already answered there.
                  </p>
                  <Button variant="outline" asChild className="rounded-full w-full bg-transparent magnetic-button scale-spring">
                    <Link href="/faq">
                      View FAQ
                      <ArrowRight className="ml-2 h-4 w-4 icon-spin-hover" aria-hidden="true" />
                    </Link>
                  </Button>
                </TiltCard>
              </div>

              {/* Contact Form */}
              <TiltCard
                className="lg:col-span-3 p-8 animate-fade-in-up opacity-0"
                style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
              >
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">
                    ✉️
                  </span>
                  Send us a message
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Reason Selection */}
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium">What can we help you with?</legend>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Contact reason">
                      {contactReasons.map((reason) => (
                        <button
                          key={reason.id}
                          type="button"
                          role="radio"
                          aria-checked={selectedReason === reason.id}
                          onClick={() => setSelectedReason(reason.id)}
                          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                            selectedReason === reason.id
                              ? "bg-[#2563EB] text-[#0A0F1C] shadow-lg"
                              : "bg-[#0A0F1C]/5 text-muted-foreground hover:bg-[#0A0F1C]/10"
                          }`}
                        >
                          <span aria-hidden="true">{reason.emoji}</span>
                          {reason.label}
                        </button>
                      ))}
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
                        className="input-glow rounded-xl h-12 bg-white/50 border-[#0A0F1C]/10 focus:border-[#2563EB] focus:ring-[#2563EB]/20"
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
                        className="input-glow rounded-xl h-12 bg-white/50 border-[#0A0F1C]/10 focus:border-[#2563EB] focus:ring-[#2563EB]/20"
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
                      className="input-glow rounded-xl h-12 bg-white/50 border-[#0A0F1C]/10 focus:border-[#2563EB] focus:ring-[#2563EB]/20"
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
                      className="input-glow rounded-xl bg-white/50 border-[#0A0F1C]/10 focus:border-[#2563EB] focus:ring-[#2563EB]/20 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-full btn-premium magnetic-button glow-pulse text-[#0A0F1C] font-semibold"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 border-2 border-[#0A0F1C]/20 border-t-[#0A0F1C] rounded-full animate-spin"
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
              </TiltCard>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
