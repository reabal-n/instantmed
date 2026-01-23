"use client"

/**
 * Medication History Step - Previous prescriptions and side effects
 * For repeat prescription flow - validates ongoing treatment
 */

import { useState } from "react"
import { Info, History, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
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

function FormField({
  label,
  required,
  error,
  children,
  hint,
  helpText,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  hint?: string
  helpText?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

export default function MedicationHistoryStep({ onNext }: MedicationHistoryStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const prescriptionHistory = answers.prescriptionHistory as string | undefined
  const lastPrescribedBy = (answers.lastPrescribedBy as string) || ""
  const sideEffects = (answers.sideEffects as string) || ""
  const hasSideEffects = answers.hasSideEffects as boolean | undefined
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
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
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isNeverPrescribed = prescriptionHistory === "never"
  const isComplete = prescriptionHistory && !isNeverPrescribed && (hasSideEffects === false || (hasSideEffects && sideEffects.trim()))

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
        error={errors.prescriptionHistory}
        helpText="Repeat prescriptions are only available for medications you've been prescribed before"
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESCRIPTION_HISTORY_OPTIONS.map((option) => (
            <EnhancedSelectionButton
              key={option.value}
              variant="chip"
              selected={prescriptionHistory === option.value}
              onClick={() => setAnswer("prescriptionHistory", option.value)}
              gradient="primary-subtle"
              className="touch-manipulation"
            >
              {option.label}
            </EnhancedSelectionButton>
          ))}
        </div>
      </FormField>

      {/* Warning for never prescribed */}
      {isNeverPrescribed && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            This service is for repeat prescriptions only. If you need a new medication, please{" "}
            <a href="/request?service=consult" className="underline font-medium">book a consultation</a>.
          </AlertDescription>
        </Alert>
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
              gradient="teal-emerald"
              className="flex-1 touch-manipulation"
            >
              No side effects
            </EnhancedSelectionButton>
            <EnhancedSelectionButton
              variant="chip"
              selected={hasSideEffects === true}
              onClick={() => setAnswer("hasSideEffects", true)}
              gradient="orange-red"
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
        className="w-full h-12 mt-4"
        disabled={!isComplete}
      >
        Continue
      </Button>
    </div>
  )
}
