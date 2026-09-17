"use client"

import { ArrowRight, HeartPulse } from "lucide-react"
import { useCallback } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface WomensHealthTypeStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

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
    value: 'ocp_repeat',
    label: 'Continue my current pill',
    description: "Continue your pill with a women's health assessment.",
  },
] as const

export default function WomensHealthTypeStep({ serviceType, onNext }: WomensHealthTypeStepProps) {
  const { answers, flowInstanceId, setAnswers } = useRequestStore()
  const posthog = usePostHog()

  const womensHealthOption = answers.womensHealthOption === "ocp_new" && answers.contraceptionType === "continue"
    ? "ocp_repeat"
    : answers.womensHealthOption as string | undefined
  const hasSelection = Boolean(womensHealthOption)
  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    hasSelection,
    useCallback(() => ["what you need today"], []),
    { flowInstanceId, posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "womens-health-type" },
  )

  const handleSelect = (value: string) => {
    // Keep the canonical pill intent so every existing safety gate applies.
    setAnswers({
      womensHealthOption: value === "ocp_repeat" ? "ocp_new" : value,
      contraceptionType: value === "ocp_repeat" ? "continue" : undefined,
      ...(value === "ocp_repeat" ? { contraceptionCurrent: "pill" } : {}),
    })
  }

  const handleNext = () => {
    if (!womensHealthOption) {
      showBlockingReasons()
      return
    }
    // Restore old drafts that saved the former handoff option.
    if (womensHealthOption === "ocp_repeat") {
      setAnswers({ womensHealthOption: "ocp_new", contraceptionType: "continue", contraceptionCurrent: "pill" })
    }
    onNext()
  }

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow="Women's health"
        title="What do you need today?"
        description="Choose the care you need today."
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
