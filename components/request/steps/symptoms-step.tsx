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

export default function SymptomsStep({ serviceType, onNext }: SymptomsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()

  const symptomDetails = (answers.symptomDetails as string) || ""
  const symptomDuration = answers.symptomDuration as string | undefined
  const certType = answers.certType as string | undefined
  const emergencyWarningAcknowledged = answers.emergencyWarningAcknowledged as boolean | undefined

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
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
  const WORD_TARGET = 5

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
    return Object.keys(newErrors).length === 0
  }, [symptomDetails, symptomDuration])

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

  const isComplete = Boolean(symptomDuration) && detailsQuality.valid
  const hasNoErrors = Object.keys(errors).length === 0
  const emergencyRequiresAck = emergencyWarning.isEmergency && !emergencyWarningAcknowledged
  const canContinue = isComplete && hasNoErrors && !emergencyRequiresAck

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

      <QuestionCard compact>
        <FormField
          label={isCarer ? "Describe the symptoms" : "Describe your symptoms"}
          required
          error={touched.symptomDetails ? errors.symptomDetails : undefined}
          hint="Include what started, when it started, and how it affects work or study."
        >
          <Textarea
            value={symptomDetails}
            onChange={(e) => setAnswer("symptomDetails", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, symptomDetails: true }))}
            placeholder={
              isCarer
                ? "e.g., Fever, sore throat, and fatigue since yesterday."
                : "e.g., Fever, sore throat, and fatigue since yesterday."
            }
            className={`mt-2 min-h-[88px] resize-none ${touched.symptomDetails && errors.symptomDetails ? "border-destructive" : ""}`}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  detailsQuality.valid ? "bg-primary" : "bg-primary/50"
                }`}
                style={{ width: `${Math.min((detailsWordCount / WORD_TARGET) * 100, 100)}%` }}
              />
            </div>
            <p
              className={`shrink-0 text-xs tabular-nums ${
                detailsQuality.valid ? "text-primary" : "text-muted-foreground"
              }`}
              aria-live="polite"
            >
              {detailsQuality.valid ? `${detailsWordCount} words` : `${detailsWordCount}/${WORD_TARGET} words`}
            </p>
          </div>
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

      <Button data-intake-primary-action="true" data-intake-primary-label="Continue" onClick={handleNext} className="h-12 w-full max-sm:hidden" disabled={!canContinue}>
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
