"use client"

/**
 * Symptoms Step - short clinical detail capture for medical certificates.
 */

import { AlertTriangle, ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { ChipToggleGroup, IntakeStepIntro, QuestionCard, SegmentedChoiceGroup } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  buildIntakeValidationBlockedProperties,
  captureIntakeEvent,
  INTAKE_ANALYTICS_EVENTS,
} from "@/lib/analytics/intake-events"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { checkHighStakesUseCase, type HighStakesCheck } from "@/lib/clinical/intake-validation"
import { validateSymptomTextQuality } from "@/lib/clinical/symptom-text-quality"
import { checkEmergencySymptoms } from "@/lib/clinical/triage-rules-engine"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { recordStepCompletion } from "@/lib/request/preferences"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

interface SymptomsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  hideIntro?: boolean
}

const SYMPTOM_DURATION_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "1_2_days", label: "1-2 days" },
  { value: "3_5_days", label: "3-5 days" },
  { value: "week_plus", label: "A week+" },
] as const

// Tap-to-add starters so patients don't have to find the words while unwell.
// Each phrase contains a recognised symptom-vocabulary stem, so a tapped chip
// always satisfies validateSymptomTextQuality. The textarea stays the source of
// truth: chips just seed it, and the patient adds specifics.
const COMMON_SYMPTOM_STARTERS = [
  { key: "cold_flu", label: "Cold or flu" },
  { key: "fever", label: "Fever" },
  { key: "headache_migraine", label: "Headache or migraine" },
  { key: "stomach_nausea", label: "Stomach bug or nausea" },
  { key: "cough_sore_throat", label: "Cough or sore throat" },
  { key: "back_muscle_pain", label: "Back or muscle pain" },
] as const

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export default function SymptomsStep({ serviceType, onNext, hideIntro = false }: SymptomsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const symptomDetails = (answers.symptomDetails as string) || ""
  const symptomDuration = answers.symptomDuration as string | undefined
  const certType = answers.certType as string | undefined
  const emergencyWarningAcknowledged = answers.emergencyWarningAcknowledged as boolean | undefined

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  // Top-of-step blocking reasons, shown (and screen-reader announced) when a
  // Continue attempt fails. Without this the only feedback was a silent
  // scroll-to-field, which reads as "nothing happened" on mobile where the
  // sticky CTA mirrors a now-always-clickable button.
  const [validationSummary, setValidationSummary] = useState<string[]>([])
  const [emergencyWarning, setEmergencyWarning] = useState<{ isEmergency: boolean; matchedKeywords: string[] }>({
    isEmergency: false,
    matchedKeywords: [],
  })

  // Run emergency symptom check when symptom details change (debounced 300ms).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (symptomDetails.length >= 10) {
        const result = checkEmergencySymptoms(symptomDetails)
        setEmergencyWarning(result)
        if (!result.isEmergency && emergencyWarningAcknowledged) {
          setAnswer("emergencyWarningAcknowledged", undefined)
        }
      } else if (emergencyWarning.isEmergency) {
        setEmergencyWarning({ isEmergency: false, matchedKeywords: [] })
        setAnswer("emergencyWarningAcknowledged", undefined)
      }
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptomDetails])

  const isCarer = certType === "carer"
  const detailsQuality = validateSymptomTextQuality(symptomDetails)
  const detailsWordCount = symptomDetails
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 2).length

  const emergencyRequiresAck = emergencyWarning.isEmergency && !emergencyWarningAcknowledged

  // High-stakes use cases (exam deferral, court, fitness-for-duty, workers
  // comp, etc.) are refused at intake. This is derived from the current text so
  // the block survives reload and disappears only when the patient edits the
  // request into an eligible illness-certificate use case.
  const highStakes: HighStakesCheck = checkHighStakesUseCase(symptomDetails)

  // Plain-English reasons the step is blocked, for the top-of-step summary.
  // symptomDuration is deliberately NOT a blocker (P1.1, 2026-07-10): it is
  // doctor/AI context, not a safety gate — tap-a-chip must be enough to pass.
  const buildBlockingReasons = useCallback(() => {
    const reasons: string[] = []
    if (!validateSymptomTextQuality(symptomDetails).valid) {
      reasons.push(symptomDetails.trim() ? "a clearer symptom description" : "a symptom tapped or typed above")
    }
    if (emergencyRequiresAck) {
      reasons.push("the emergency notice acknowledged")
    }
    return reasons
  }, [symptomDetails, emergencyRequiresAck])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const qualityResult = validateSymptomTextQuality(symptomDetails)

    if (!qualityResult.valid) {
      newErrors.symptomDetails = qualityResult.reason ?? "Please describe your symptoms"
    }

    setErrors(newErrors)
    setTouched({ symptomDetails: true, symptomDuration: true })
    const blockers = buildBlockingReasons()
    setValidationSummary(blockers)
    if (blockers.length > 0) {
      captureIntakeEvent(
        posthog,
        INTAKE_ANALYTICS_EVENTS.validationBlocked,
        buildIntakeValidationBlockedProperties({
          serviceType,
          stepId: "symptoms",
          blockers,
        }),
      )
    }
    return Object.keys(newErrors).length === 0 && !emergencyRequiresAck && !highStakes.isHighStakes
  }, [symptomDetails, emergencyRequiresAck, highStakes.isHighStakes, buildBlockingReasons, posthog, serviceType])

  // Tap a starter to seed/clear the textarea. Source of truth stays the textarea
  // so downstream validation, AI notes, and the doctor view are unchanged.
  const toggleSymptomStarter = useCallback(
    (phrase: string) => {
      const current = symptomDetails
      const alreadyPresent = current.toLowerCase().includes(phrase.toLowerCase())
      let next: string
      if (alreadyPresent) {
        next = current
          .replace(new RegExp(`(^|,\\s*)${escapeForRegExp(phrase)}`, "i"), "")
          .replace(/^[,\s]+/, "")
          .replace(/\s*,\s*,/g, ", ")
          .trim()
      } else {
        next = current.trim() ? `${current.trim()}, ${phrase}` : phrase
      }
      setAnswer("symptomDetails", next)
      setTouched((prev) => ({ ...prev, symptomDetails: true }))
    },
    [symptomDetails, setAnswer],
  )

  const handleNext = useCallback(() => {
    if (validate()) {
      recordStepCompletion("symptoms", { has_details: true })
      posthog?.capture("step_completed", {
        step: "symptoms",
        service_type: serviceType,
        duration: symptomDuration,
        symptom_word_count: detailsWordCount,
        high_stakes: highStakes.isHighStakes,
      })
      onNext()
    }
  }, [validate, serviceType, symptomDuration, detailsWordCount, highStakes.isHighStakes, posthog, onNext])

  // Readiness is computed live from the answers, NOT from the `errors` object —
  // `errors` is set by validate() for display and would otherwise stay stale
  // after the patient fixes a field, leaving the button looking not-ready.
  // Duration is optional (P1.1): a tapped chip alone is a complete answer.
  const isComplete = detailsQuality.valid
  const canContinue = isComplete && !emergencyRequiresAck && !highStakes.isHighStakes
  const starterValues = Object.fromEntries(
    COMMON_SYMPTOM_STARTERS.map((starter) => [
      starter.key,
      symptomDetails.toLowerCase().includes(starter.label.toLowerCase()),
    ]),
  )

  // Prune stale field errors + the blocking summary as soon as each field
  // becomes valid, so a fixed form stops showing "Add this to continue".
  useEffect(() => {
    setErrors((prev) => {
      if (!prev.symptomDetails) return prev
      const next = { ...prev }
      if (detailsQuality.valid) delete next.symptomDetails
      return next
    })
  }, [detailsQuality.valid])

  useEffect(() => {
    if ((canContinue || highStakes.isHighStakes) && validationSummary.length > 0) {
      setValidationSummary([])
    }
  }, [canContinue, highStakes.isHighStakes, validationSummary.length])

  // Measure how often the gate fires (and later, how many proceed anyway).
  useEffect(() => {
    if (highStakes.isHighStakes) {
      posthog?.capture("med_cert_high_stakes_warning_shown", { matched: highStakes.matched })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highStakes.isHighStakes])

  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: canContinue,
  })

  return (
    <div className="space-y-4">
      {!hideIntro && (
        <IntakeStepIntro
          title={isCarer ? "What is happening?" : "What is stopping you today?"}
          description="A short, specific sentence is enough for the doctor to review."
        />
      )}

      {validationSummary.length > 0 ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      ) : null}

      <QuestionCard compact>
        <FormField
          label={isCarer ? "What symptoms are they having?" : "What symptoms are you having?"}
          required
          error={touched.symptomDetails ? errors.symptomDetails : undefined}
          hint="Tap all that fit — that's enough to continue."
        >
          <ChipToggleGroup
            options={COMMON_SYMPTOM_STARTERS}
            values={starterValues}
            onChange={(key) => {
              const starter = COMMON_SYMPTOM_STARTERS.find((option) => option.key === key)
              if (starter) toggleSymptomStarter(starter.label)
            }}
            ariaLabel="Common symptoms"
            className="mt-2"
          />
          <Label
            htmlFor="symptom-details"
            className="mt-3 block text-xs font-normal text-muted-foreground"
          >
            Add detail (optional) — e.g. when it started
          </Label>
          <Textarea
            id="symptom-details"
            value={symptomDetails}
            onChange={(e) => setAnswer("symptomDetails", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, symptomDetails: true }))}
            placeholder="e.g. Fever and sore throat since yesterday."
            className={`mt-1.5 min-h-[72px] resize-none ${touched.symptomDetails && errors.symptomDetails ? "border-destructive" : ""}`}
          />
        </FormField>
      </QuestionCard>

      <QuestionCard compact>
        <FormField
          label={isCarer ? "How long have they felt unwell? (optional)" : "How long have you felt unwell? (optional)"}
        >
          <SegmentedChoiceGroup
            options={SYMPTOM_DURATION_OPTIONS}
            value={symptomDuration}
            onChange={(value) => {
              setAnswer("symptomDuration", value)
              setTouched((prev) => ({ ...prev, symptomDuration: true }))
            }}
            ariaLabel="How long have symptoms been present (optional)"
            columns="auto"
            className="mt-2"
          />
          {symptomDuration === "week_plus" && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Symptoms lasting more than a week may need an in-person doctor review. You can still submit this request.
            </div>
          )}
        </FormField>
      </QuestionCard>

      {emergencyWarning.isEmergency && (
        <Alert variant="destructive" className="border-destructive-border" role="alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Emergency symptoms detected</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">
              Based on what you&apos;ve described, you may need immediate medical attention. This service is not
              suitable for medical emergencies.
            </p>
            <div className="text-sm font-medium space-y-1">
              <p>If this is an emergency:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  Call <strong>000</strong> for an ambulance
                </li>
                <li>Go to your nearest Emergency Department</li>
                <li>
                  Call <strong>Lifeline 13 11 14</strong> for crisis support
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-3 border-t border-destructive-border pt-2">
              <Switch
                id="emergency-ack"
                checked={emergencyWarningAcknowledged === true}
                onCheckedChange={(checked) => setAnswer("emergencyWarningAcknowledged", checked)}
              />
              <Label htmlFor="emergency-ack" className="cursor-pointer text-sm leading-snug">
                I understand this is not for emergencies and want to continue.
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {highStakes.isHighStakes && !emergencyWarning.isEmergency && (
        <div className="rounded-lg border border-warning-border bg-warning-light p-4" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="space-y-1.5 text-base text-warning">
              <p className="font-semibold">This request needs a different pathway</p>
              <p>{highStakes.reason}</p>
              <p>
                Please book an in-person appointment with your regular GP or the relevant assessor.
                If the certificate purpose was entered incorrectly, edit your description above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Always clickable so a tap runs validate() and surfaces the blocking
          reason, instead of a silently greyed-out button (mobile reads that as
          a dead end). Variant signals readiness; handleNext gates progression. */}
      {!highStakes.isHighStakes ? (
        <Button
          data-intake-primary-action="true"
          data-intake-primary-label="Continue"
          data-intake-primary-ready={canContinue ? "true" : "false"}
          onClick={handleNext}
          variant={canContinue ? "default" : "secondary"}
          className="h-12 w-full max-sm:hidden"
        >
          {canContinue ? (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            "Continue"
          )}
        </Button>
      ) : null}
      {canContinue && (
        <p className="hidden text-center text-[11px] text-muted-foreground sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
