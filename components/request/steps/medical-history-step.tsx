"use client"

/**
 * Medical History Step - Allergies, conditions, other medications
 * 
 * Features:
 * - Real-time validation
 * - Help tooltips with medical jargon explanations
 * - Keyboard navigation
 */

import { useState, useCallback } from "react"
import { HeartPulse } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface MedicalHistoryStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
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
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(() => {
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
    setTouched({ allergies: true, conditions: true, otherMedications: true })
    return Object.keys(newErrors).length === 0
  }, [hasAllergies, allergies, hasConditions, conditions, hasOtherMedications, otherMedications])

  const handleNext = useCallback(() => {
    if (validate()) {
      onNext()
    }
  }, [validate, onNext])

  const isComplete = 
    hasAllergies !== undefined && (!hasAllergies || allergies.trim()) &&
    hasConditions !== undefined && (!hasConditions || conditions.trim()) &&
    hasOtherMedications !== undefined && (!hasOtherMedications || otherMedications.trim())
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
        <HeartPulse className="w-4 h-4" />
        <AlertDescription className="text-xs">
          This information helps our doctors ensure your treatment is safe.
        </AlertDescription>
      </Alert>

      {/* Allergies */}
      <FormField
        label="Do you have any allergies?"
        required
        error={touched.allergies ? errors.allergies : undefined}
        helpContent={{ 
          title: "What counts as an allergy?", 
          content: "Include drug allergies (e.g., penicillin), food allergies, and environmental allergies. Describe the reaction if known (e.g., rash, anaphylaxis)." 
        }}
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasAllergies === false}
            onClick={() => {
              setAnswer("hasAllergies", false)
              setAnswer("allergies", "")
            }}
            className="flex-1 touch-manipulation"
          >
            No allergies
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasAllergies === true}
            onClick={() => setAnswer("hasAllergies", true)}
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
        error={touched.conditions ? errors.conditions : undefined}
        helpContent={{ 
          title: "What should I include?", 
          content: "Include chronic conditions (diabetes, asthma, heart disease), past surgeries, and ongoing health issues. This helps ensure safe treatment." 
        }}
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasConditions === false}
            onClick={() => {
              setAnswer("hasConditions", false)
              setAnswer("conditions", "")
            }}
            className="flex-1 touch-manipulation"
          >
            No conditions
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasConditions === true}
            onClick={() => setAnswer("hasConditions", true)}
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
        error={touched.otherMedications ? errors.otherMedications : undefined}
        helpContent={{ 
          title: "What medications should I list?", 
          content: "Include all prescription medications, over-the-counter medicines (paracetamol, ibuprofen), vitamins, and supplements. This helps check for drug interactions." 
        }}
      >
        <div className="flex gap-2 mt-2">
          <EnhancedSelectionButton
            variant="chip"
            selected={hasOtherMedications === false}
            onClick={() => {
              setAnswer("hasOtherMedications", false)
              setAnswer("otherMedications", "")
            }}
            className="flex-1 touch-manipulation"
          >
            No other medications
          </EnhancedSelectionButton>
          <EnhancedSelectionButton
            variant="chip"
            selected={hasOtherMedications === true}
            onClick={() => setAnswer("hasOtherMedications", true)}
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
        disabled={!canContinue}
      >
        Continue
      </Button>
    </div>
  )
}
