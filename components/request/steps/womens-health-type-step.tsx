"use client"

import { Check, HeartPulse } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Button } from "@/components/ui/button"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface WomensHealthTypeStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// Attribution params preserved when we hand "continue my pill" off to the
// cheaper repeat-script flow.
const ATTRIBUTION_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "gclid", "gbraid", "wbraid"]

const WOMENS_HEALTH_OPTIONS = [
  {
    value: 'uti',
    label: 'UTI symptoms',
    description: 'Burning, frequency, urgency, or cloudy urine.',
  },
  {
    value: 'ocp_new',
    label: 'Start or switch the contraceptive pill',
    description: 'Start the pill for the first time, or change to a different one.',
  },
  {
    // Continuing the same pill is a repeat prescription ($29.95), so we hand this
    // off to the repeat-script flow rather than a pricier consult.
    value: 'ocp_repeat',
    label: 'Continue my current pill',
    description: 'You already take it and just need a repeat. This uses the $29.95 repeat prescription flow.',
  },
  {
    value: 'morning_after',
    label: 'Emergency contraception',
    description: 'The morning-after pill is not available through InstantMed yet.',
    comingSoon: true,
  },
  {
    value: 'period_pain',
    label: 'Period pain or menstrual issues',
    description: 'Pain relief and cycle concerns are not available yet.',
    comingSoon: true,
  },
]

export default function WomensHealthTypeStep({ onNext }: WomensHealthTypeStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const womensHealthOption = answers.womensHealthOption as string | undefined

  const handleSelect = (value: string) => {
    setAnswer("womensHealthOption", value)
  }

  const handleNext = () => {
    if (!womensHealthOption) return
    if (womensHealthOption === "ocp_repeat") {
      // Branch-by-intent: a continuation is a repeat prescription, not a consult.
      const params = new URLSearchParams()
      for (const key of ATTRIBUTION_PARAMS) {
        const value = searchParams.get(key)
        if (value) params.set(key, value)
      }
      params.set("service", "repeat-script")
      router.push(`/request?${params.toString()}`)
      return
    }
    onNext()
  }

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow="Women's health"
        title="What do you need today?"
        description="Choose the option that best matches your request. If you only need to continue your current pill, we will send you to the lower-cost repeat prescription flow."
      />

      <QuestionCard compact>
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Select one option <span className="text-destructive">*</span>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The doctor reviews the details after checkout. We only continue online when the request is suitable for telehealth.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {WOMENS_HEALTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.comingSoon}
              onClick={() => !option.comingSoon && handleSelect(option.value)}
              className={cn(
                "group w-full rounded-xl border px-4 py-3.5 text-left transition-[background-color,border-color,box-shadow] duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                option.comingSoon
                  ? "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-70"
                  : womensHealthOption === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="space-y-1">
                  <span className="block text-sm font-medium leading-snug text-foreground">
                    {option.label}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {option.description}
                  </span>
                </span>
                {option.comingSoon && (
                  <span className="shrink-0 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </span>
                )}
                {!option.comingSoon && womensHealthOption === option.value && (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </QuestionCard>

      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        disabled={!womensHealthOption}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        Continue
      </Button>
    </div>
  )
}
