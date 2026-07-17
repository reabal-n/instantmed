"use client"

/**
 * Hair Loss Preferences Step - Step 4 of 4 in the hair loss intake flow
 *
 * Treatment preference selection + results timeline education.
 * TGA-compliant: NO Schedule 4 drug names anywhere in this component.
 *
 * Options: oral tablet, combination plan, or doctor decides.
 */

import {
  ArrowRight,
  CalendarDays,
  Layers,
  Stethoscope,
} from "lucide-react"
import { useCallback } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface HairLossPreferencesStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PREFERENCE_OPTIONS = [
  {
    value: "oral",
    label: "Daily oral tablet",
    icon: CalendarDays,
    description:
      "A doctor-assessed prescription option taken as a daily routine.",
    chips: ["Once daily", "Routine"],
  },
  {
    value: "combination",
    label: "Combination approach",
    icon: Layers,
    description:
      "A prescription option plus an over-the-counter scalp treatment if the doctor recommends it.",
    chips: ["Broader plan", "Doctor-guided"],
  },
  {
    value: "doctor_decides",
    label: "Let the doctor decide",
    icon: Stethoscope,
    description:
      "Your doctor will recommend the best approach based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
] as const

export default function HairLossPreferencesStep({
  serviceType,
  onNext,
}: HairLossPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const hairMedicationPreference =
    (answers.hairMedicationPreference as string) || ""
  const hairAdditionalInfo =
    (answers.hairAdditionalInfo as string) || ""

  const isComplete = !!hairMedicationPreference

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => ["a treatment preference"], []),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "hair-loss-preferences" },
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
        title="How should treatment fit your routine?"
        description="Choose a preference. The doctor will decide what is clinically appropriate."
      />

      <ChoiceCardGroup
        options={PREFERENCE_OPTIONS}
        value={hairMedicationPreference}
        onChange={(value) => setAnswer("hairMedicationPreference", value)}
        ariaLabel="Treatment preference"
        compact
        hideChipsOnMobile
      />

      <QuestionCard compact>
        <Label className="text-sm font-medium">Doctor-reviewed plan</Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          If treatment is prescribed, your doctor will explain timing and safety details.
        </p>
      </QuestionCard>

      {/* Additional info */}
      <QuestionCard compact className="hidden sm:block">
        <Label className="text-sm font-medium">
          Anything else relevant?
        </Label>
        <Textarea
          value={hairAdditionalInfo}
          onChange={(e) => setAnswer("hairAdditionalInfo", e.target.value)}
          placeholder="Optional: recent changes, stress, medications, etc."
          className="min-h-[72px] resize-none"
        />
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
