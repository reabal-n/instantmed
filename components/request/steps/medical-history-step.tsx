"use client"

/**
 * Medical History Step - Allergies, conditions, other medications
 * Safety screening for all service types
 */

import { useState } from "react"
import { Info, HeartPulse } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface MedicalHistoryStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

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

export default function MedicalHistoryStep({ onNext }: MedicalHistoryStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const hasAllergies = answers.hasAllergies as boolean | undefined
  const allergies = (answers.allergies as string) || ""
  const hasConditions = answers.hasConditions as boolean | undefined
  const conditions = (answers.conditions as string) || ""
  const hasOtherMedications = answers.hasOtherMedications as boolean | undefined
  const otherMedications = (answers.otherMedications as string) || ""
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (hasAllergies === undefined) {
      newErrors.allergies = "Please indicate if you have any allergies"
    }
    if (hasAllergies && !allergies.trim()) {
      newErrors.allergies = "Please list your allergies"
    }
    
    if (hasConditions === undefined) {
      newErrors.conditions = "Please indicate if you have any medical conditions"
    }
    if (hasConditions && !conditions.trim()) {
      newErrors.conditions = "Please list your medical conditions"
    }
    
    if (hasOtherMedications === undefined) {
      newErrors.otherMedications = "Please indicate if you take any other medications"
    }
    if (hasOtherMedications && !otherMedications.trim()) {
      newErrors.otherMedications = "Please list your other medications"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = 
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim())

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <HeartPulse className="w-4 h-4" />
        <AlertDescription className="text-xs">
          This information helps our doctors ensure your treatment is safe.
        </AlertDescription>
      </Alert>

      {/* Allergies */}
      <FormField
        label="Do you have any allergies?"
        required
        error={errors.allergies}
        helpText="Including drug allergies, food allergies, or other allergies"
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasAllergies === false}
            onClick={() => {
              setAnswer("hasAllergies", false)
              setAnswer("allergies", "")
            }}
            gradient="teal-emerald"
            className="flex-1 touch-manipulation"
          >
            No allergies
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasAllergies === true}
            onClick={() => setAnswer("hasAllergies", true)}
            gradient="orange-red"
            className="flex-1 touch-manipulation"
          >
            Yes, I have allergies
          </EnhancedSelectionButton>
        </div>
        
        {hasAllergies && (
          <Textarea
            value={allergies}
            onChange={(e) => setAnswer("allergies", e.target.value)}
            placeholder="e.g., Penicillin - causes rash, Peanuts - anaphylaxis"
            className="min-h-[70px] mt-3"
          />
        )}
      </FormField>

      {/* Medical conditions */}
      <FormField
        label="Do you have any medical conditions?"
        required
        error={errors.conditions}
        helpText="Including chronic conditions, past surgeries, or ongoing health issues"
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasConditions === false}
            onClick={() => {
              setAnswer("hasConditions", false)
              setAnswer("conditions", "")
            }}
            gradient="teal-emerald"
            className="flex-1 touch-manipulation"
          >
            No conditions
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasConditions === true}
            onClick={() => setAnswer("hasConditions", true)}
            gradient="orange-red"
            className="flex-1 touch-manipulation"
          >
            Yes, I have conditions
          </EnhancedSelectionButton>
        </div>
        
        {hasConditions && (
          <Textarea
            value={conditions}
            onChange={(e) => setAnswer("conditions", e.target.value)}
            placeholder="e.g., Asthma, Type 2 Diabetes, High blood pressure"
            className="min-h-[70px] mt-3"
          />
        )}
      </FormField>

      {/* Other medications */}
      <FormField
        label="Are you taking any other medications?"
        required
        error={errors.otherMedications}
        helpText="Including prescription, over-the-counter, and supplements"
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasOtherMedications === false}
            onClick={() => {
              setAnswer("hasOtherMedications", false)
              setAnswer("otherMedications", "")
            }}
            gradient="teal-emerald"
            className="flex-1 touch-manipulation"
          >
            No other medications
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasOtherMedications === true}
            onClick={() => setAnswer("hasOtherMedications", true)}
            gradient="orange-red"
            className="flex-1 touch-manipulation"
          >
            Yes, I take medications
          </EnhancedSelectionButton>
        </div>
        
        {hasOtherMedications && (
          <Textarea
            value={otherMedications}
            onChange={(e) => setAnswer("otherMedications", e.target.value)}
            placeholder="e.g., Metformin 500mg twice daily, Vitamin D 1000IU daily"
            className="min-h-[70px] mt-3"
          />
        )}
      </FormField>

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
