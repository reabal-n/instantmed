"use client"

/**
 * ED opening step — the only screen before the safety check.
 *
 * 2026-07-19: absorbed the severity assessment and dropped the goal chips.
 *
 * The separate IIEF-5 step asked five scale questions to produce a score the
 * doctor used as context, not as a gate — ED is never auto-approved. It cost a
 * whole step on the flow's advertised length while losing only 2 of 41 patients
 * itself. One frequency item (the erection-firmness question, the item that
 * tracks the total score most closely) carries the same severity signal in one
 * tap. `iiefTotal` is no longer produced; every doctor surface renders it
 * conditionally so historical intakes still show their score.
 *
 * The goal chips ("Improve erections" / "More spontaneity" / ...) were removed:
 * no doctor surface acted on the answer.
 *
 * Question order is deliberate. Duration is clinical but not intimate, so it
 * opens; the frequency question follows. This screen loses 57% of patients on
 * arrival, so it must not lead with the most confronting question in the form.
 *
 * Eligibility is enforced from date of birth before payment; this screen does
 * not duplicate the age gate.
 */

import { ArrowRight, Info } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"

import {
  IntakeStepIntro,
  QuestionCard,
  QuestionPrompt,
  ScaleChoiceGroup,
  SegmentedChoiceGroup,
} from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import { ED_HOOK_QUIZ_KEY, type EdHookQuizResult } from "@/lib/marketing/ed-hook-quiz"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { useRequestStore } from "../store"

interface EdGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const DURATION_OPTIONS = [
  { value: "less_than_3_months", label: "< 3 months" },
  { value: "3_to_12_months", label: "3–12 months" },
  { value: "1_to_3_years", label: "1–3 years" },
  { value: "3_plus_years", label: "3+ years" },
] as const

const FREQUENCY_VALUES = [1, 2, 3, 4, 5] as const

export default function EdGoalsStep({ serviceType, onNext }: EdGoalsStepProps) {
  const { answers, flowInstanceId, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const preSeeded = useRef(false)

  const edDuration = (answers.edDuration as string) || ""
  const edErectionFrequency = (answers.edErectionFrequency as number | undefined) ?? null

  /**
   * Pre-seed from the landing-page hook quiz. Its first question is the same
   * erection-frequency item on the same 1-5 scale, so a patient who answered it
   * on the way in is not asked it twice.
   */
  useEffect(() => {
    if (preSeeded.current) return
    preSeeded.current = true
    try {
      const raw = typeof window !== "undefined"
        ? sessionStorage.getItem(ED_HOOK_QUIZ_KEY)
        : null
      if (!raw) return
      const quiz: EdHookQuizResult = JSON.parse(raw)
      if (answers.edErectionFrequency === undefined && quiz.answers?.[0] != null) {
        setAnswer("edErectionFrequency", quiz.answers[0])
      }
    } catch {
      // sessionStorage unavailable or corrupt - silently skip
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- one-time mount seed

  const isComplete = !!edDuration && edErectionFrequency !== null

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!edDuration) reasons.push("how long this has been a concern")
      if (edErectionFrequency === null) reasons.push("how often this happens")
      return reasons
    }, [edDuration, edErectionFrequency]),
    { flowInstanceId, posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "ed-goals" },
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
      <IntakeStepIntro
        title="Tell us what's going on"
        description="Two quick questions. Only the doctor reviewing your request sees your answers."
      />

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

      <QuestionCard compact className="space-y-3">
        <QuestionPrompt
          label="How often can you get and keep an erection firm enough for sex?"
          required
        />
        <ScaleChoiceGroup
          values={FREQUENCY_VALUES}
          value={edErectionFrequency}
          onChange={(value) => setAnswer("edErectionFrequency", value)}
          lowLabel="Almost never"
          highLabel="Almost always"
          ariaLabel="How often you can get and keep an erection firm enough for sex"
        />
      </QuestionCard>

      <div className="flex items-start gap-2 px-1">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          There are no wrong answers. Your doctor reviews your full health
          profile before deciding what is appropriate.
        </p>
      </div>

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
            Continue to health screening
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
