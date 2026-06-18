"use client"

import { ArrowRight, HeartPulse } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import { EarlyRecoveryEmailCard } from "@/components/request/shared/early-recovery-email-card"
import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
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
    description: 'Burning, frequency, urgency, cloudy urine.',
  },
  {
    value: 'ocp_new',
    label: 'Start or switch pill',
    description: 'First pill, or changing to a different one.',
  },
  {
    // Continuing the same pill is a repeat prescription ($29.95), so we hand this
    // off to the repeat-script flow rather than a pricier consult.
    value: 'ocp_repeat',
    label: 'Continue my current pill',
    description: 'Already prescribed? Use repeat prescriptions.',
  },
] as const

export default function WomensHealthTypeStep({ serviceType, onNext }: WomensHealthTypeStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const womensHealthOption = answers.womensHealthOption as string | undefined
  const hasSelection = Boolean(womensHealthOption)
  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    hasSelection,
    useCallback(() => ["what you need today"], []),
  )

  const handleSelect = (value: string) => {
    setAnswer("womensHealthOption", value)
  }

  const handleNext = () => {
    if (!womensHealthOption) {
      showBlockingReasons()
      return
    }
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
        description="Choose one. Current-pill repeats go through repeat prescriptions."
      />

      <QuestionCard compact>
        <QuestionPrompt
          id="womens-health-option-label"
          label="Select one"
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

      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            Choose {validationSummary.join(", ")} to continue.
          </AlertDescription>
        </Alert>
      )}

      <EarlyRecoveryEmailCard serviceType={serviceType} stepId="womens-health-type" />

      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={hasSelection ? "true" : "false"}
        onClick={handleNext}
        variant={hasSelection ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {hasSelection ? (
          <>
            Continue
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  )
}
