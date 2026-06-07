"use client"

/**
 * Symptoms Step - short clinical detail capture for medical certificates.
 */

import { AlertTriangle, ArrowRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { IntakeStepIntro, QuestionCard } from "@/components/request/shared/intake-step-primitives"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
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
  "Cold or flu",
  "Fever",
  "Headache or migraine",
  "Stomach bug or nausea",
  "Cough or sore throat",
  "Back or muscle pain",
] as const

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export default function SymptomsStep({ serviceType, onNext }: SymptomsStepProps) {
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

  // Plain-English reasons the step is blocked, for the top-of-step summary.
  const buildBlockingReasons = useCallback(() => {
    const reasons: string[] = []
    if (!validateSymptomTextQuality(symptomDetails).valid) {
      reasons.push(symptomDetails.trim() ? "a clearer symptom description" : "a short symptom description")
    }
    if (!symptomDuration) {
      reasons.push("how long you've felt unwell")
    }
    if (emergencyRequiresAck) {
      reasons.push("the emergency notice acknowledged")
    }
    return reasons
  }, [symptomDetails, symptomDuration, emergencyRequiresAck])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    const qualityResult = validateSymptomTextQuality(symptomDetails)

    if (!qualityResult.valid) {
      newErrors.symptomDetails = qualityResult.reason ?? "Please describe your symptoms"
    }
    if (!symptomDuration) {
      newErrors.symptomDuration = "Please indicate how long you've had these symptoms"
    }

    setErrors(newErrors)
    setTouched({ symptomDetails: true, symptomDuration: true })
    setValidationSummary(buildBlockingReasons())
    return Object.keys(newErrors).length === 0 && !emergencyRequiresAck
  }, [symptomDetails, symptomDuration, emergencyRequiresAck, buildBlockingReasons])

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
      })
      onNext()
    }
  }, [validate, serviceType, symptomDuration, detailsWordCount, posthog, onNext])

  // Readiness is computed live from the answers, NOT from the `errors` object —
  // `errors` is set by validate() for display and would otherwise stay stale
  // after the patient fixes a field, leaving the button looking not-ready.
  const isComplete = Boolean(symptomDuration) && detailsQuality.valid
  const canContinue = isComplete && !emergencyRequiresAck

  // Prune stale field errors + the blocking summary as soon as each field
  // becomes valid, so a fixed form stops showing "Add this to continue".
  useEffect(() => {
    setErrors((prev) => {
      if (!prev.symptomDetails && !prev.symptomDuration) return prev
      const next = { ...prev }
      if (detailsQuality.valid) delete next.symptomDetails
      if (symptomDuration) delete next.symptomDuration
      return next
    })
  }, [detailsQuality.valid, symptomDuration])

  useEffect(() => {
    if (canContinue && validationSummary.length > 0) {
      setValidationSummary([])
    }
  }, [canContinue, validationSummary.length])

  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: canContinue,
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        title={isCarer ? "What is happening?" : "What is stopping you today?"}
        description="A short, specific sentence is enough for the doctor to review."
      />

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
          label={isCarer ? "Describe the symptoms" : "Describe your symptoms"}
          required
          error={touched.symptomDetails ? errors.symptomDetails : undefined}
          hint="Tap any that fit, then add detail like when it started."
        >
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Common reasons">
            {COMMON_SYMPTOM_STARTERS.map((starter) => (
              <EnhancedSelectionButton
                key={starter}
                variant="chip"
                selected={symptomDetails.toLowerCase().includes(starter.toLowerCase())}
                onClick={() => toggleSymptomStarter(starter)}
                className="touch-manipulation"
              >
                {starter}
              </EnhancedSelectionButton>
            ))}
          </div>
          <Textarea
            value={symptomDetails}
            onChange={(e) => setAnswer("symptomDetails", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, symptomDetails: true }))}
            placeholder="e.g. Fever, sore throat, and fatigue since yesterday."
            className={`mt-2 min-h-[88px] resize-none ${touched.symptomDetails && errors.symptomDetails ? "border-destructive" : ""}`}
          />
        </FormField>
      </QuestionCard>

      <QuestionCard compact>
        <FormField
          label={isCarer ? "How long have they felt unwell?" : "How long have you felt unwell?"}
          required
          error={touched.symptomDuration ? errors.symptomDuration : undefined}
        >
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="How long have symptoms been present">
            {SYMPTOM_DURATION_OPTIONS.map((option) => (
              <EnhancedSelectionButton
                key={option.value}
                variant="chip"
                selected={symptomDuration === option.value}
                onClick={() => {
                  setAnswer("symptomDuration", option.value)
                  setTouched((prev) => ({ ...prev, symptomDuration: true }))
                }}
                className="touch-manipulation"
              >
                {option.label}
              </EnhancedSelectionButton>
            ))}
          </div>
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

      {/* Always clickable so a tap runs validate() and surfaces the blocking
          reason, instead of a silently greyed-out button (mobile reads that as
          a dead end). Variant signals readiness; handleNext gates progression. */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
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
      {canContinue && (
        <p className="hidden text-center text-[11px] text-muted-foreground sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
