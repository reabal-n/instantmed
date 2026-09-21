"use client"

import { ArrowRight, Clock } from "lucide-react"
import Link from "next/link"

import type { StickerIconName } from "@/components/icons/stickers"
import { StickerIcon } from "@/components/icons/stickers"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"

export interface HowItWorksStep {
  sticker: StickerIconName
  step: number
  title: string
  description: string
  time: string
}

interface HowItWorksInlineProps {
  steps: HowItWorksStep[]
  ctaHref: string
  onCTAClick?: () => void
  /** Per-service state from a shell. When omitted, the section follows the platform kill switch itself. */
  isDisabled?: boolean
  heading?: string
  subheading?: string
  ctaText?: string
  ctaDataAttributes?: Record<`data-${string}`, string>
  /** Omit decorative stickers and use denser spacing, retaining every step and its text. */
  compact?: boolean
  /** Render section content immediately instead of waiting for scroll reveal. */
  revealInstant?: boolean
}

export function HowItWorksInline({
  steps,
  ctaHref,
  onCTAClick,
  isDisabled: isDisabledProp,
  heading = "Three steps. Completely private.",
  subheading = "No booked appointment or waiting room. A doctor reviews your form and may call briefly before deciding.",
  ctaText,
  ctaDataAttributes,
  revealInstant = false,
  compact = false,
}: HowItWorksInlineProps) {
  const { maintenanceMode } = useServiceAvailability()
  const isDisabled = isDisabledProp ?? maintenanceMode
  return (
    <section id="how-it-works" aria-label="How it works" className={compact ? "py-10 lg:py-16" : "py-12 sm:py-16 lg:py-20"}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className={compact ? "text-center mb-6" : "text-center mb-12"}>
          <Heading level="h2" className="mb-3">
            {heading}
          </Heading>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            {subheading}
          </p>
        </Reveal>

        <div className={compact ? "grid gap-4 md:grid-cols-3 lg:gap-8" : "grid md:grid-cols-3 gap-6 lg:gap-8"}>
          {steps.map((step, i) => (
            <Reveal
              key={step.step}
              instant={revealInstant || i < 2}
              delay={i * 0.1}
              className={`${compact ? "text-left p-4" : "text-center p-6"} relative bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl transition-[transform,box-shadow] duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08]`}
            >
              {/* Step number - transition added so the badge eases in when
                  Reveal triggers instead of snapping to its final state.
                  Tier 1 review 2026-05-25 (/hair-loss #4): "step-card
                  checkmarks pop in as a state-flip". */}
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-3 transition-[opacity,transform] duration-200 ease-in-out">
                {step.step}
              </div>
              {!compact && <StickerIcon name={step.sticker} size={52} className="mx-auto mb-3" />}
              <Heading level="h3" className="mb-2">{step.title}</Heading>
              <p className="text-base text-muted-foreground leading-relaxed mb-3">{step.description}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                <Clock className="h-3 w-3" />
                {step.time}
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal instant={revealInstant} className="flex justify-center mt-10" delay={0.3}>
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow]"
            onClick={onCTAClick}
          >
            <Link href={isDisabled ? "/contact" : ctaHref} {...ctaDataAttributes}>
              {isDisabled ? "Contact us" : (ctaText ?? "Start your assessment")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
