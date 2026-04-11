"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FloatingCard } from "@/components/marketing/floating-card"
import { DottedGrid } from "@/components/marketing/dotted-grid"
import { StepOneMockup, StepTwoMockup, StepThreeMockup } from "@/components/marketing/mockups/how-it-works-steps"

// =============================================================================
// DATA
// =============================================================================

const MED_CERT_STEPS = [
  {
    number: "1",
    title: "Tell us what\u2019s going on",
    description:
      "Quick form, takes about 2 minutes. No account needed to start.",
    badge: "~2 min",
  },
  {
    number: "2",
    title: "A real GP reviews it",
    description:
      "AHPRA-registered doctor reviews your request. Same standards as in-person.",
    badge: "~30 min",
  },
  {
    number: "3",
    title: "Certificate in your inbox",
    description:
      "Approved certificates are sent as a secure PDF straight to your email.",
    badge: "Same day",
  },
]

/** Video walkthrough URL — set to a real URL to enable the embed link in HowItWorksSection */
const VIDEO_WALKTHROUGH_URL: string | null = null

// =============================================================================
// COMPONENT
// =============================================================================

/** Section 2: How It Works with animated FloatingCard mockups */
export function HowItWorksSection({
  onCTAClick,
  steps = MED_CERT_STEPS,
  ctaText = "Get your certificate",
  ctaHref = "/request?service=med-cert",
}: {
  onCTAClick?: () => void
  steps?: typeof MED_CERT_STEPS
  ctaText?: string
  ctaHref?: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  const stepMockups = [StepOneMockup, StepTwoMockup, StepThreeMockup]
  const directions: Array<"left" | "up" | "right"> = ["left", "up", "right"]

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="relative py-20 lg:py-24 scroll-mt-20"
    >
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 tracking-tight">
            Three steps. Stay in bed.
          </h2>
          <p className="text-sm text-muted-foreground">
            No appointments. No waiting rooms. Just your phone and a few
            minutes.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6 relative">
          {/* Desktop connector */}
          <div className="hidden lg:block absolute top-[2.5rem] left-[16%] right-[16%] border-t-2 border-dashed border-primary/20" />

          {steps.map((step, index) => {
            const Mockup = stepMockups[index]
            return (
              <div key={step.number} className="relative">
                <div className="text-center mb-4">
                  <span
                    aria-hidden="true"
                    className="text-5xl font-light text-muted-foreground/15 dark:text-muted-foreground/10 select-none"
                  >
                    {step.number}
                  </span>
                </div>

                <FloatingCard delay={index * 0.15} direction={directions[index]}>
                  <Mockup />
                </FloatingCard>

                <div className="text-center mt-4">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                    {step.description}
                  </p>
                  {index === 1 && (
                    <Link
                      href="/our-doctors"
                      className="inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary mt-1 font-medium transition-colors"
                    >
                      Meet our doctors <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  <span className="inline-block mt-2 text-[10px] text-primary font-medium bg-primary/5 px-2 py-0.5 rounded-full">
                    {step.badge}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={animate ? { y: 10 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="px-8 h-11 font-semibold shadow-lg shadow-primary/25 dark:shadow-primary/15 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
          >
            <Link href={ctaHref}>
              {ctaText} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-2.5">
            Most people are sorted in under an hour
          </p>
          {VIDEO_WALKTHROUGH_URL && (
            <a
              href={VIDEO_WALKTHROUGH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
                <ArrowRight className="h-4 w-4" />
              </span>
              Watch a 60-second walkthrough
            </a>
          )}
        </motion.div>
      </div>
    </section>
  )
}
