"use client"

/**
 * ED Preferences Step - Step 4 of 4 in the ED intake flow
 *
 * Lifestyle-framed treatment preference selection (daily vs as-needed vs doctor decides).
 * TGA-compliant: NO drug names anywhere in this component.
 * Uses Tier 2 elevated cards with ring selection (Tier 3).
 */

import { ArrowRight,CalendarDays, Clock, ShieldCheck, Stethoscope } from "lucide-react"
import { useCallback } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface EdPreferencesStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PREFERENCE_OPTIONS = [
  {
    value: "daily",
    label: "Daily routine",
    icon: CalendarDays,
    description:
      "A daily option with less timing around activity.",
    chips: ["Routine", "Less planning", "Regular activity"],
  },
  {
    value: "prn",
    label: "As-needed",
    icon: Clock,
    description:
      "A planned-use option. The doctor will confirm whether it suits your health profile.",
    chips: ["Flexible", "Occasional use"],
  },
  {
    value: "doctor_decides",
    label: "Let the doctor decide",
    icon: Stethoscope,
    description:
      "Your doctor will recommend the best option based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
] as const

export default function EdPreferencesStep({ serviceType, onNext }: EdPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const edPreference = (answers.edPreference as string) || ""

  const isComplete = !!edPreference

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => ["a treatment preference"], []),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "ed-preferences" },
  )

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
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
        title="How should treatment fit your life?"
        description="Tell the doctor your preference. They will prescribe only if it is clinically appropriate."
      />

      <ChoiceCardGroup
        options={PREFERENCE_OPTIONS}
        value={edPreference}
        onChange={(value) => setAnswer("edPreference", value)}
        ariaLabel="Treatment preference"
        compact
        hideChipsOnMobile
      />

      {/* Trust text */}
      <QuestionCard compact className="flex flex-row items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Your doctor will review your full health profile and prescribe the
          most clinically appropriate option for you.
        </p>
      </QuestionCard>

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            Select a treatment preference to continue.
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
            Continue to your details
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
