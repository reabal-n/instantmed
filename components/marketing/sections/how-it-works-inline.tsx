"use client"

import { ArrowRight, Check, Clock, FileCheck2, MessageSquareText } from "lucide-react"
import Link from "next/link"

import type { StickerIconName } from "@/components/icons/stickers"
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
  example?: { title: string; description: string }
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
  /** Omit illustrative examples and use denser spacing, retaining every step and its text. */
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal instant className={compact ? "text-left mb-6" : "text-left mb-10"}>
          <Heading level="h2" className="mb-3">
            {heading}
          </Heading>
          <p className="text-muted-foreground max-w-xl text-balance">
            {subheading}
          </p>
        </Reveal>

        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.step} className="min-w-0 border-t border-border/60 pt-5">
              <p className="mb-4 text-sm font-semibold tabular-nums text-primary">0{step.step}</p>
              {!compact && <ProcessExample stage={i} example={step.example} />}
              <Heading level="h3" className="mb-2">{step.title}</Heading>
              <p className="mb-3 text-base leading-relaxed text-muted-foreground">{step.description}</p>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{step.time}</span>
            </li>
          ))}
        </ol>

        <Reveal instant={revealInstant} className="flex justify-center mt-10" delay={0.3}>
          <Button
            asChild
            size="lg"
            className="px-6 min-h-12 h-auto py-3 rounded-lg text-base font-semibold"
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

/** Small, labelled examples of the form, follow-up and delivered outcome. */
function ProcessExample({ stage, example }: { stage: number; example?: HowItWorksStep["example"] }) {
  if (example) {
    const Icon = stage === 0 ? Check : stage === 1 ? MessageSquareText : FileCheck2
    return (
      <div aria-label="Illustrative example" className="mb-5 flex min-h-36 flex-col justify-center rounded-xl border border-border/60 bg-white p-4 text-sm dark:bg-card">
        <Icon className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
        <p className="font-semibold">{example.title}</p>
        <p className="mt-1 text-muted-foreground">{example.description}</p>
      </div>
    )
  }
  return <div aria-label="Illustrative example" className="mb-5 flex min-h-36 flex-col justify-center rounded-xl border border-border/60 bg-white p-4 text-sm dark:bg-card">
    {stage === 0 ? <><p className="mb-3 font-semibold">Your secure request</p><div className="space-y-2 text-muted-foreground"><p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />Your symptoms and history</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" aria-hidden="true" />Details for your chosen service</p></div></> : stage === 1 ? <><MessageSquareText className="mb-2 h-5 w-5 text-primary" aria-hidden="true" /><p className="font-semibold">A clear next step</p><p className="mt-1 text-muted-foreground">An outcome, or a message asking for more information.</p></> : <><FileCheck2 className="mb-2 h-5 w-5 text-primary" aria-hidden="true" /><p className="font-semibold">Ready when issued</p><p className="mt-1 text-muted-foreground">A secure certificate link or an eScript on your phone.</p></>}
  </div>
}
