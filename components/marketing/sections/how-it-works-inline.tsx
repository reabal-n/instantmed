import { ArrowRight, Clock } from "lucide-react"
import Link from "next/link"

import type { StickerIconName } from "@/components/icons/stickers"
import { StickerIcon } from "@/components/icons/stickers"
import { Button } from "@/components/ui/button"
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
  isDisabled?: boolean
  heading?: string
  subheading?: string
  ctaText?: string
}

export function HowItWorksInline({
  steps,
  ctaHref,
  onCTAClick,
  isDisabled,
  heading = "Three steps. Completely private.",
  subheading = "No call, no waiting room. Your assessment stays between you and the doctor.",
  ctaText,
}: HowItWorksInlineProps) {
  return (
    <section id="how-it-works" aria-label="How it works" className="py-16 lg:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal instant className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-3">
            {heading}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-balance">
            {subheading}
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, i) => (
            <Reveal
              key={step.step}
              instant={i < 2}
              delay={i * 0.1}
              className="relative bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs mb-3">
                {step.step}
              </div>
              <StickerIcon name={step.sticker} size={52} className="mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Clock className="h-3 w-3" />
                {step.time}
              </span>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex justify-center mt-10" delay={0.3}>
          <Button
            asChild
            size="lg"
            className="px-8 h-12 text-base font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow]"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : ctaHref}>
              {isDisabled ? "Contact us" : (ctaText ?? "Start your assessment")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
