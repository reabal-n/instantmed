"use client"

/**
 * Hair Loss Goals Step - Step 1 of 4 in the hair loss intake flow
 *
 * Emotional entry point: goal selection + onset timing.
 * Chip grid for goals, segmented duration selector.
 */

import { ArrowRight,Search, Shield, Sprout, Target } from "lucide-react"
import { useCallback } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface HairLossGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const GOAL_OPTIONS = [
  { value: "prevent", label: "Prevent further loss", icon: Shield },
  { value: "regrow", label: "Regrow what I've lost", icon: Sprout },
  { value: "both", label: "Both (stop + regrow)", icon: Target },
  { value: "exploring", label: "Just exploring options", icon: Search },
] as const

const ONSET_OPTIONS = [
  { value: "not_yet", label: "Not yet" },
  { value: "few_months", label: "Few months" },
  { value: "6_12_months", label: "6-12 months" },
  { value: "1_2_years", label: "1-2 years" },
  { value: "2_plus_years", label: "2+ years" },
] as const

export default function HairLossGoalsStep({ serviceType, onNext }: HairLossGoalsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const hairGoal = (answers.hairGoal as string) || ""
  const hairOnset = (answers.hairOnset as string) || ""

  const isComplete = !!hairGoal && !!hairOnset

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!hairGoal) reasons.push("your main goal")
      if (!hairOnset) reasons.push("when you first noticed changes")
      return reasons
    }, [hairGoal, hairOnset]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "hair-loss-goals" },
  )

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    posthog?.capture('step_completed', { step: 'hair-loss-goals', goal: hairGoal, onset: hairOnset })
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
        description="A few discreet answers help the doctor understand your pattern."
      />

      {/* Goal selection - chip grid */}
      <QuestionCard compact>
        <QuestionPrompt label="What's your main goal?" required />
        <ChoiceCardGroup
          options={GOAL_OPTIONS}
          value={hairGoal}
          onChange={(value) => setAnswer("hairGoal", value)}
          ariaLabel="Hair loss goal"
          columns="two"
          mobileColumns="two"
          compact
        />
      </QuestionCard>

      {/* Onset timing - segmented selector */}
      <QuestionCard compact>
        <QuestionPrompt label="When did you first notice changes?" required />
        <SegmentedChoiceGroup
          options={ONSET_OPTIONS}
          value={hairOnset}
          onChange={(value) => setAnswer("hairOnset", value)}
          ariaLabel="When did you first notice changes"
          columns="auto"
          className="sm:grid-cols-5"
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
