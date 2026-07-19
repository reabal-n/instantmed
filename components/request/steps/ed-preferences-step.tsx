"use client"

/**
 * ED Treatment Step - final clinical step in the ED intake flow.
 *
 * Owns the treatment preference plus the prior-treatment history that used to
 * sit at the bottom of the safety screen. Keeping "what you have taken before"
 * next to "how you want to take it" is what lets a patient who is already
 * established on a medicine say so once, in their own words, instead of
 * answering it as disconnected history a screen earlier.
 *
 * "Let the doctor decide" was removed 2026-07-19 (operator decision): it read
 * as a non-answer, and every intake is doctor-reviewed anyway, so it bought the
 * patient nothing while adding a third card to the highest-intent screen.
 * Legacy intakes that stored it still render and still map to a preset.
 *
 * TGA-compliant: NO drug names anywhere in patient-facing copy. A patient may
 * type a medicine name themselves; we never print one.
 */

import { ArrowRight, CalendarDays, Clock, ShieldCheck } from "lucide-react"
import { useCallback } from "react"

import {
  BinaryChoice,
  ChoiceCardGroup,
  CompactChoiceRow,
  IntakeStepIntro,
  QuestionCard,
  QuestionPrompt,
} from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
    value: "prn",
    label: "Only when I need it",
    icon: Clock,
    description: "Taken ahead of sex rather than every day.",
    chips: ["Flexible", "Occasional use"],
  },
  {
    value: "daily",
    label: "Every day",
    icon: CalendarDays,
    description: "A low daily dose, so there is no timing to plan around.",
    chips: ["Routine", "Less planning"],
  },
] as const

export default function EdPreferencesStep({ serviceType, onNext, onBack }: EdPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const edPreference = (answers.edPreference as string) || ""
  const previousEdMeds = answers.previousEdMeds as boolean | undefined
  const edPreviousTreatment = (answers.edPreviousTreatment as string) || ""
  const edAdditionalInfo = (answers.edAdditionalInfo as string) || ""

  const previousTreatmentComplete =
    previousEdMeds === false || (previousEdMeds === true && edPreviousTreatment.trim().length > 0)

  const isComplete = !!edPreference && previousTreatmentComplete

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!edPreference) reasons.push("how you would prefer to take it")
      if (previousEdMeds === undefined) {
        reasons.push("whether you have tried treatment before")
      } else if (previousEdMeds === true && !edPreviousTreatment.trim()) {
        reasons.push("what you have taken before")
      }
      return reasons
    }, [edPreference, previousEdMeds, edPreviousTreatment]),
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
    onBack,
    enabled: true,
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        title="How would you prefer to take it?"
        description="The doctor prescribes only what is clinically appropriate for you."
      />

      <ChoiceCardGroup
        options={PREFERENCE_OPTIONS}
        value={edPreference}
        onChange={(value) => setAnswer("edPreference", value)}
        ariaLabel="Treatment preference"
        compact
        hideChipsOnMobile
      />

      <QuestionCard compact className="space-y-0">
        <CompactChoiceRow
          label="Have you tried ED treatment before?"
          required
          detail={previousEdMeds === true ? (
            <Textarea
              id="ed-previous-treatment"
              value={edPreviousTreatment}
              onChange={(event) => setAnswer("edPreviousTreatment", event.target.value)}
              placeholder="Name it if you know it, plus the dose and whether it worked"
              className="min-h-[72px] text-sm"
            />
          ) : undefined}
        >
          <BinaryChoice
            value={previousEdMeds}
            onChange={(checked) => setAnswer("previousEdMeds", checked)}
            ariaLabel="Have you tried ED treatment before?"
            className="gap-1.5"
          />
        </CompactChoiceRow>
      </QuestionCard>

      <QuestionCard compact>
        <QuestionPrompt
          label="Anything else for the doctor?"
          hint="Optional"
          id="ed-additional-info-label"
        />
        <Textarea
          id="ed-additional-info"
          aria-labelledby="ed-additional-info-label"
          value={edAdditionalInfo}
          onChange={(event) => setAnswer("edAdditionalInfo", event.target.value)}
          placeholder="If there is a particular medicine or dose you would prefer, say so here."
          className="min-h-[72px] text-sm"
        />
      </QuestionCard>

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
