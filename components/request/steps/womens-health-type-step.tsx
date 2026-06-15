"use client"

import { HeartPulse } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt } from "@/components/request/shared/intake-step-primitives"
import { Button } from "@/components/ui/button"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

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
    disabled: true,
    disabledLabel: "Coming soon",
  },
  {
    value: 'period_pain',
    label: 'Period pain or menstrual issues',
    description: 'Pain relief and cycle concerns are not available yet.',
    disabled: true,
    disabledLabel: "Coming soon",
  },
] as const

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
        <QuestionPrompt
          id="womens-health-option-label"
          label="Select one option"
          hint="The doctor reviews the details after checkout. We only continue online when the request is suitable for telehealth."
          icon={HeartPulse}
          required
        />
        <ChoiceCardGroup
          options={WOMENS_HEALTH_OPTIONS}
          value={womensHealthOption}
          onChange={handleSelect}
          ariaLabel="Women's health option"
        />
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
