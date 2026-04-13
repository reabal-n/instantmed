"use client"

/**
 * Medication History Step - Previous prescriptions and side effects
 * 
 * Features:
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { ArrowLeft, ArrowRight,History, Stethoscope } from "lucide-react"
import { useCallback,useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { EnhancedSelectionButton } from "@/components/shared"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  const sideEffects = (answers.sideEffects as string) || ""
  const hasSideEffects = answers.hasSideEffects as boolean | undefined
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!prescriptionHistory) {
      newErrors.prescriptionHistory = "Please select when you were last prescribed this medication"
    }

    // Note: prescriptionHistory === "never" is intentionally NOT a validation error.
    // The inline upsell card below offers a one-click handoff to the new-prescription
    // consult flow ($49.95) so we don't dead-end the patient at their decision point.

    if (hasSideEffects && !sideEffects.trim()) {
      newErrors.sideEffects = "Please describe the side effects you experienced"
    }

    setErrors(newErrors)
    setTouched({ prescriptionHistory: true, sideEffects: true })
    return Object.keys(newErrors).length === 0
  }, [prescriptionHistory, hasSideEffects, sideEffects])

  const handleNext = useCallback(() => {
    if (validate()) {
      posthog?.capture('step_completed', { step: 'medication-history', service_type: serviceType, prescription_history: prescriptionHistory, has_side_effects: hasSideEffects })
      onNext()
    }
  }, [validate, posthog, serviceType, prescriptionHistory, hasSideEffects, onNext])

  const isNeverPrescribed = prescriptionHistory === "never"
  const isComplete = prescriptionHistory && !isNeverPrescribed && (hasSideEffects === false || (hasSideEffects && sideEffects.trim()))
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-5">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <History className="w-4 h-4" />
        <AlertDescription className="text-xs">
          This helps our doctors verify this is a safe repeat prescription for you.
        </AlertDescription>
      </Alert>

      {/* Prescription history */}
      <FormField
        label="When were you last prescribed this medication?"
        required
        error={touched.prescriptionHistory ? errors.prescriptionHistory : undefined}
        helpContent={{ 
          title: "Why do we ask this?", 
          content: "Repeat prescriptions are only available for medications you've been prescribed before by another doctor. This ensures continuity of care." 
        }}
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESCRIPTION_HISTORY_OPTIONS.map((option) => (
            <EnhancedSelectionButton
              key={option.value}
              variant="chip"
              selected={prescriptionHistory === option.value}
              onClick={() => setAnswer("prescriptionHistory", option.value)}
              className="touch-manipulation"
            >
              {option.label}
            </EnhancedSelectionButton>
          ))}
        </div>
      </FormField>

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
        <FormField
          label="Who prescribed it last?"
          hint="Optional - helps verify your prescription history"
        >
          <Input
            value={lastPrescribedBy}
            onChange={(e) => setAnswer("lastPrescribedBy", e.target.value)}
            placeholder="e.g., Dr Smith at ABC Medical Centre"
            className="h-11 mt-2"
          />
        </FormField>
      )}

      {/* Side effects */}
      {!isNeverPrescribed && prescriptionHistory && (
        <FormField
          label="Have you experienced any side effects with this medication?"
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
              Yes, I have
            </EnhancedSelectionButton>
          </div>
          
          {hasSideEffects && (
            <Textarea
              value={sideEffects}
              onChange={(e) => setAnswer("sideEffects", e.target.value)}
              placeholder="Please describe the side effects you experienced..."
              className="min-h-[80px] mt-3"
            />
          )}
        </FormField>
      )}

      {/* Continue button */}
      <Button
        onClick={handleNext}
        className="w-full h-12"
        disabled={!canContinue}
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
        <p className="text-[11px] text-muted-foreground/60 text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
