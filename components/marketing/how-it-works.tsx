'use client'

import { ArrowRight, Clock, CheckCircle2, Mail, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import Link from 'next/link'
import { FloatingCard } from '@/components/marketing/floating-card'

function StepOneMockup() {
  return (
    <div className="p-4 space-y-3">
      {/* Form field being filled */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1">What&apos;s going on?</p>
        <div className="h-8 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 px-2.5 flex items-center">
          <span className="text-xs text-foreground/70">Cold and flu symptoms</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1">How long?</p>
        <div className="h-8 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 px-2.5 flex items-center">
          <span className="text-xs text-foreground/70">Since yesterday</span>
        </div>
      </div>
      {/* Badge */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-3 h-3 text-primary" />
        ~2 min
      </div>
    </div>
  )
}

function StepTwoMockup() {
  return (
    <div className="p-4 space-y-3">
      {/* Doctor header */}
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://api.dicebear.com/7.x/notionists/svg?seed=DrReview"
          alt=""
          className="w-7 h-7 rounded-full bg-muted/30"
        />
        <div>
          <p className="text-[10px] font-semibold text-foreground leading-tight">Your GP</p>
          <p className="text-[8px] text-emerald-500">Reviewing</p>
        </div>
      </div>
      {/* Checklist */}
      <div className="space-y-1.5">
        {["Identity verified", "Clinical assessment", "Certificate approved"].map((item) => (
          <div key={item} className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-foreground">{item}</span>
          </div>
        ))}
      </div>
      {/* Status badge */}
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" />
        Approved
      </div>
    </div>
  )
}

function StepThreeMockup() {
  return (
    <div className="p-4 space-y-3">
      {/* Email notification */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-foreground leading-tight">Your medical certificate is ready</p>
          <p className="text-[8px] text-muted-foreground">InstantMed · Just now</p>
        </div>
      </div>
      {/* Attachment */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 dark:bg-muted/10 border border-border/30">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-foreground truncate">MedCert_2026.pdf</p>
          <p className="text-[8px] text-muted-foreground">42 KB</p>
        </div>
      </div>
      {/* Download button */}
      <div className="h-7 rounded-lg bg-primary flex items-center justify-center gap-1 shadow-sm shadow-primary/25">
        <Download className="w-3 h-3 text-white" />
        <span className="text-[10px] font-semibold text-white">Download</span>
      </div>
    </div>
  )
}

const directions: Array<"left" | "up" | "right"> = ["left", "up", "right"]

export function HowItWorks() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const stepMockups = [StepOneMockup, StepTwoMockup, StepThreeMockup]
  const stepBadges = ["~2 min", "~30 min", "Same day"]

  return (
    <section id="how-it-works" className="py-20 lg:py-24 scroll-mt-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">
            How it works
          </h2>
          <p className="text-sm text-muted-foreground">
            No appointments. No phone calls. Just good medicine, from your couch.
          </p>
        </motion.div>

        {/* Timeline — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Desktop timeline connector */}
          <div className="hidden lg:block absolute top-[2.5rem] left-[16%] right-[16%] border-t-2 border-dashed border-primary/20" />

          {steps.map((step, index) => {
            const Mockup = stepMockups[index]
            return (
              <div key={step.number} className="relative flex flex-col">
                {/* Step number */}
                <div className="text-center mb-4 order-1">
                  <span className="text-5xl font-light text-muted-foreground/15 dark:text-muted-foreground/10 select-none">
                    {step.number}
                  </span>
                </div>

                {/* Step text — above mockup on mobile, below on desktop */}
                <div className="text-center mb-4 lg:mb-0 lg:mt-4 order-2 lg:order-3">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {step.description}
                  </p>
                  <span className="inline-block mt-2 text-[10px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
                    {stepBadges[index]}
                  </span>
                </div>

                {/* Floating card with mockup */}
                <div className="order-3 lg:order-2">
                  <FloatingCard
                    delay={index * 0.15}
                    direction={directions[index]}
                  >
                    <Mockup />
                  </FloatingCard>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={animate ? { opacity: 0, y: 10 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button
            asChild
            variant="default"
            size="lg"
            className="px-8 h-11 font-semibold shadow-lg shadow-primary/25 dark:shadow-primary/15 hover:shadow-xl hover:shadow-primary/35 dark:hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
          >
            <Link href="/request">
              Start a request <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-2.5">
            Most people are sorted in under an hour
          </p>
        </motion.div>
      </div>
    </section>
  )
}

const steps = [
  {
    number: "1",
    title: "Tell us what\u2019s going on",
    description: "Quick form, takes about 2 minutes. No account needed to start.",
  },
  {
    number: "2",
    title: "A real GP reviews it",
    description: "AHPRA-registered doctor reviews your request. Same standards as in-person.",
  },
  {
    number: "3",
    title: "Done.",
    description: "Certificate to your inbox. Prescription to your phone. All taken care of.",
  },
]
