"use client"

/**
 * Medication History Step - Previous prescriptions and side effects
 * 
 * Features:
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { History, AlertTriangle, Stethoscope, ArrowLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

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

export default function MedicationHistoryStep({ onNext, onBack }: MedicationHistoryStepProps) {
  const router = useRouter()
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
    
    if (prescriptionHistory === "never") {
      newErrors.prescriptionHistory = "This service is for repeat prescriptions only. For new medications, please book a consultation."
    }
    
    if (hasSideEffects && !sideEffects.trim()) {
      newErrors.sideEffects = "Please describe the side effects you experienced"
    }
    
    setErrors(newErrors)
    setTouched({ prescriptionHistory: true, sideEffects: true })
    return Object.keys(newErrors).length === 0
  }, [prescriptionHistory, hasSideEffects, sideEffects])

  const handleNext = useCallback(() => {
    if (validate()) {
      onNext()
    }
  }, [validate, onNext])

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
    <div className="space-y-5 animate-in fade-in">
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

      {/* Warning for never prescribed - improved with clear actions */}
      {isNeverPrescribed && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 space-y-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <AlertTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This service is for repeat prescriptions only
              </AlertTitle>
              <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                If you&apos;ve never been prescribed this medication before, you&apos;ll need a doctor consultation first.
              </AlertDescription>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => {
                // Encode medication context in URL for consult handoff (survives refresh)
                const medicationName = answers.medicationName as string | undefined
                const medicationStrength = answers.medicationStrength as string | undefined
                
                // Build URL with context params
                const params = new URLSearchParams({
                  service: 'consult',
                  subtype: 'new-medication',
                })
                
                // Add medication context if available
                if (medicationName) {
                  const medicationContext = medicationStrength 
                    ? `${medicationName} ${medicationStrength}`
                    : medicationName
                  params.set('medication', medicationContext)
                }
                
                router.push(`/request?${params.toString()}`)
              }}
              className="flex-1 gap-2"
            >
              <Stethoscope className="w-4 h-4" />
              Book a consultation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAnswer("prescriptionHistory", undefined)
                onBack()
              }}
              className="flex-1 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back and change
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
        Continue
      </Button>
    </div>
  )
}
