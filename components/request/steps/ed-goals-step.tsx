"use client"

/**
 * ED Goals Step - Step 1 of 4 in the ED intake flow
 *
 * Emotional entry point: low-friction goal selection + duration picker.
 * Age gate (Switch), chip grid for goals, segmented duration selector.
 */

import { ArrowRight, Heart, Shield, Sparkles, Target } from "lucide-react"
import { useCallback } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup, ToggleList } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface EdGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const GOAL_OPTIONS = [
  { value: "improve_erections", label: "Improve erections", icon: Target },
  { value: "more_spontaneity", label: "More spontaneity", icon: Sparkles },
  { value: "boost_confidence", label: "Boost confidence", icon: Shield },
  { value: "better_stamina", label: "Better stamina", icon: Heart },
] as const

const DURATION_OPTIONS = [
  { value: "less_than_3_months", label: "< 3 months" },
  { value: "3_to_12_months", label: "3\u201312 months" },
  { value: "1_to_3_years", label: "1\u20133 years" },
  { value: "3_plus_years", label: "3+ years" },
] as const

export default function EdGoalsStep({ serviceType, onNext }: EdGoalsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const edAgeConfirmed = answers.edAgeConfirmed as boolean | undefined
  const edGoal = (answers.edGoal as string) || ""
  const edDuration = (answers.edDuration as string) || ""

  const isComplete = edAgeConfirmed === true && !!edGoal && !!edDuration

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!edAgeConfirmed) reasons.push("your age confirmation")
      if (!edGoal) reasons.push("your main goal")
      if (!edDuration) reasons.push("how long this has been a concern")
      return reasons
    }, [edAgeConfirmed, edGoal, edDuration]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "ed-goals" },
  )

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    posthog?.capture('step_completed', { step: 'ed-goals', goal: edGoal, duration: edDuration })
    onNext()
  }

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: isComplete,
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <IntakeStepIntro
        title="What matters most right now?"
        description="Discreet answers help the doctor choose a safe approach."
      />

      <ToggleList
        items={[{ key: "edAgeConfirmed", label: "I confirm I am 18 years or older" }]}
        values={{ edAgeConfirmed }}
        onChange={(_, checked) => setAnswer("edAgeConfirmed", checked)}
      />

      {/* Goal selection - chip grid */}
      <QuestionCard compact>
        <QuestionPrompt label="What's your main goal?" required />
        <ChoiceCardGroup
          options={GOAL_OPTIONS}
          value={edGoal}
          onChange={(value) => setAnswer("edGoal", value)}
          ariaLabel="Treatment goal"
          columns="two"
          mobileColumns="two"
          compact
        />
      </QuestionCard>

      {/* Duration - segmented selector */}
      <QuestionCard compact>
        <QuestionPrompt label="How long has this been a concern?" required />
        <SegmentedChoiceGroup
          options={DURATION_OPTIONS}
          value={edDuration}
          onChange={(value) => setAnswer("edDuration", value)}
          ariaLabel="How long this has been a concern"
          columns="two"
        />
      </QuestionCard>

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {/* Always clickable — variant signals readiness; handleNext gates progression */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={isComplete ? "true" : "false"}
        onClick={handleNext}
        variant={isComplete ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {isComplete ? (
          <>
            Continue to assessment
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {isComplete && (
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
