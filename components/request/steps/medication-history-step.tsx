"use client"

/**
 * Medication History Step - Previous prescriptions and side effects
 * 
 * Features:
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { ArrowLeft, ArrowRight, Stethoscope } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { IntakeStepIntro, QuestionCard, SegmentedChoiceGroup } from "@/components/request/shared/intake-step-primitives"
import { StepBlockedSummary } from "@/components/request/shared/step-blocked-summary"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

import { FormField } from "../form-field"
import { useRequestStore } from "../store"

interface MedicationHistoryStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PRESCRIPTION_HISTORY_OPTIONS = [
  { value: "less_than_3_months", label: "Less than 3 months ago" },
  { value: "3_to_6_months", label: "3-6 months ago" },
  { value: "6_to_12_months", label: "6-12 months ago" },
  { value: "over_12_months", label: "Over 12 months ago" },
  { value: "never", label: "Never prescribed this medication" },
] as const

export default function MedicationHistoryStep({ serviceType, onNext, onBack }: MedicationHistoryStepProps) {
  const posthog = usePostHog()
  const { answers, setAnswer } = useRequestStore()
  
  const prescriptionHistory = answers.prescriptionHistory as string | undefined
  const lastPrescribedBy = (answers.lastPrescribedBy as string) || ""
  const currentDose = (answers.currentDose as string) || ""
  const sideEffects = (answers.sideEffects as string) || ""
  const hasSideEffects = answers.hasSideEffects as boolean | undefined
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [blockedReasons, setBlockedReasons] = useState<string[]>([])

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!prescriptionHistory) {
      newErrors.prescriptionHistory = "Please select when you were last prescribed this medication"
    }

    // Note: prescriptionHistory === "never" is intentionally NOT a validation error.
    // The inline upsell card below offers a one-click handoff to the new-prescription
    // consult flow ($49.95) so we don't dead-end the patient at their decision point.

    // A3 softening (boundary 4): current dose is no longer required to continue —
    // a blank one becomes a dose_not_stated flag for the doctor.

    if (hasSideEffects && !sideEffects.trim()) {
      newErrors.sideEffects = "Please describe the side effects you experienced"
    }

    setErrors(newErrors)
    setBlockedReasons(Object.values(newErrors))
    setTouched({ prescriptionHistory: true, currentDose: true, sideEffects: true })
    return Object.keys(newErrors).length === 0
  }, [prescriptionHistory, hasSideEffects, sideEffects])

  const handleNext = useCallback(() => {
    if (validate()) {
      posthog?.capture('step_completed', { step: 'medication-history', service_type: serviceType, prescription_history: prescriptionHistory, has_current_dose: Boolean(currentDose.trim()), has_side_effects: hasSideEffects })
      onNext()
    }
  }, [validate, posthog, serviceType, prescriptionHistory, currentDose, hasSideEffects, onNext])

  const isNeverPrescribed = prescriptionHistory === "never"
  // A3 softening (boundary 4): current dose no longer gates readiness.
  const isComplete = prescriptionHistory && !isNeverPrescribed && (hasSideEffects === false || (hasSideEffects && sideEffects.trim()))
  // Live-computed (not gated on the stale `errors` object).
  const canContinue = Boolean(isComplete)

  useEffect(() => {
    if (canContinue && blockedReasons.length > 0) setBlockedReasons([])
  }, [canContinue, blockedReasons.length])
  const hasPrescriptionHistory = Boolean(prescriptionHistory)
  const needsDose = hasPrescriptionHistory && !isNeverPrescribed
  const needsSideEffects = needsDose && Boolean(currentDose.trim())

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-4">
      <IntakeStepIntro
        eyebrow={!hasPrescriptionHistory ? "History 1 of 3" : !currentDose.trim() ? "History 2 of 3" : "History 3 of 3"}
        title={!hasPrescriptionHistory ? "Confirm your prescription history" : !currentDose.trim() ? "Current dose" : "Side effects"}
        description={!hasPrescriptionHistory ? "This helps the doctor check this is a safe repeat request." : "Keep it short and copy your label if you can."}
      />

      <StepBlockedSummary reasons={blockedReasons} />

      {/* Prescription history */}
      {(!hasPrescriptionHistory || isNeverPrescribed) && (
        <QuestionCard compact>
          <FormField
            label="When were you last prescribed this medication?"
            required
            error={touched.prescriptionHistory ? errors.prescriptionHistory : undefined}
          >
            <SegmentedChoiceGroup
              options={PRESCRIPTION_HISTORY_OPTIONS}
              value={prescriptionHistory}
              onChange={(value) => setAnswer("prescriptionHistory", value)}
              ariaLabel="When were you last prescribed this medication?"
              columns="one"
              className="mt-2"
            />
          </FormField>
        </QuestionCard>
      )}

      {/* New medication detected - friendly upsell to consult flow */}
      {isNeverPrescribed && (
        <div className="p-4 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] space-y-4">
          <div className="flex gap-3">
            <Stethoscope className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <AlertTitle className="text-sm font-medium text-foreground">
                This service is for repeat prescriptions only
              </AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground">
                We can only prescribe medications you&apos;ve been prescribed before by another doctor.
                For a new prescription, please visit your GP. We do offer specialty consultations
                for ED and hair loss treatment.
              </AlertDescription>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setAnswer("prescriptionHistory", undefined)
                onBack()
              }}
              className="flex-1 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Change medication
            </Button>
            <Button
              variant="ghost"
              asChild
              className="flex-1 gap-2"
            >
              <a href="/request">
                Browse other services
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Who prescribed */}
      {!isNeverPrescribed && prescriptionHistory && (
        <div className="hidden sm:block">
        <QuestionCard compact>
          <FormField
            label="Who prescribed it last?"
            hint="Optional, but useful if you remember"
          >
            <Input
              value={lastPrescribedBy}
              onChange={(e) => setAnswer("lastPrescribedBy", e.target.value)}
              placeholder="e.g., Dr Smith at ABC Medical Centre"
              className="h-11 mt-2"
            />
          </FormField>
        </QuestionCard>
        </div>
      )}

      {/* Current dose */}
      {needsDose && (
        <QuestionCard compact>
          <FormField
            label="What dose do you currently take?"
            required
            error={touched.currentDose ? errors.currentDose : undefined}
            hint="Copy the wording from your label if you can"
          >
            <Textarea
              value={currentDose}
              onChange={(e) => {
                setAnswer("currentDose", e.target.value)
                setAnswer("dosageInstructions", e.target.value)
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, currentDose: true }))}
              placeholder="e.g., 2 puffs twice daily"
              className="min-h-[72px] mt-2"
            />
          </FormField>
        </QuestionCard>
      )}

      {/* Side effects */}
      {needsSideEffects && (
        <QuestionCard compact>
          <FormField
            label="Any side effects with this medication?"
            required
            error={errors.sideEffects}
          >
            <div className="flex gap-2 mt-2">
              <EnhancedSelectionButton
                variant="chip"
                selected={hasSideEffects === false}
                onClick={() => {
                  setAnswer("hasSideEffects", false)
                  setAnswer("sideEffects", "")
                }}
                className="flex-1 touch-manipulation"
              >
                No side effects
              </EnhancedSelectionButton>
              <EnhancedSelectionButton
                variant="chip"
                selected={hasSideEffects === true}
                onClick={() => setAnswer("hasSideEffects", true)}
                className="flex-1 touch-manipulation"
              >
                Yes
              </EnhancedSelectionButton>
            </div>

            {hasSideEffects && (
              <Textarea
                value={sideEffects}
                onChange={(e) => setAnswer("sideEffects", e.target.value)}
                placeholder="Briefly describe what happened"
                className="min-h-[72px] mt-3"
              />
            )}
          </FormField>
        </QuestionCard>
      )}

      {/* Always clickable so a tap surfaces the blocking reason instead of a
          silently greyed mobile dead-end. */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        className={`w-full h-12 max-sm:hidden ${canContinue ? "" : "opacity-60"}`}
      >
        {canContinue ? (
          <>
            Continue to medical history
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {canContinue && (
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
