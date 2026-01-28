"use client"

/**
 * Symptoms Step - Symptom selection and details
 * 
 * Features:
 * - Smart defaults from recent symptoms
 * - Real-time validation
 * - Help tooltips
 * - Keyboard navigation
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
import { FormField } from "../form-field"
import { getSmartDefaults, recordStepCompletion } from "@/lib/request/preferences"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface SymptomsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const SYMPTOMS_LIST = [
  "Cold/Flu",
  "Fever",
  "Headache",
  "Nausea",
  "Gastro",
  "Fatigue",
  "Back pain",
  "Injury",
  "Migraine",
  "Period pain",
  "Anxiety",
  "Other",
] as const

const SYMPTOM_DURATION_OPTIONS = [
  { value: "less_than_24h", label: "Less than 24 hours" },
  { value: "1_2_days", label: "1-2 days" },
  { value: "3_5_days", label: "3-5 days" },
  { value: "1_week_plus", label: "Over a week" },
] as const

export default function SymptomsStep({ onNext }: SymptomsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const symptoms = useMemo(() => (answers.symptoms as string[]) || [], [answers.symptoms])
  const symptomDetails = (answers.symptomDetails as string) || ""
  const symptomDuration = answers.symptomDuration as string | undefined
  const certType = answers.certType as string | undefined
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [suggestedSymptoms, setSuggestedSymptoms] = useState<string[]>([])

  // Load smart defaults on mount
  useEffect(() => {
    const defaults = getSmartDefaults('symptoms')
    if (defaults.suggestedSymptoms) {
      setSuggestedSymptoms(defaults.suggestedSymptoms as string[])
    }
  }, [])

  const toggleSymptom = (symptom: string) => {
    const current = symptoms
    const updated = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom]
    setAnswer("symptoms", updated)
    setTouched(prev => ({ ...prev, symptoms: true }))
  }

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (symptoms.length === 0) newErrors.symptoms = "Please select at least one symptom"
    if (!symptomDetails || symptomDetails.length < 20) {
      newErrors.symptomDetails = "Please describe your symptoms (minimum 20 characters)"
    }
    if (!symptomDuration) newErrors.symptomDuration = "Please indicate how long you've had these symptoms"
    setErrors(newErrors)
    setTouched({ symptoms: true, symptomDetails: true, symptomDuration: true })
    return Object.keys(newErrors).length === 0
  }, [symptoms.length, symptomDetails, symptomDuration])

  const handleNext = useCallback(() => {
    if (validate()) {
      recordStepCompletion('symptoms', { symptoms })
      onNext()
    }
  }, [validate, symptoms, onNext])

  const isCarer = certType === "carer"
  const isComplete = symptoms.length > 0 && symptomDuration && symptomDetails.length >= 20
  const hasNoErrors = Object.keys(errors).length === 0
  const canContinue = isComplete && hasNoErrors

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: canContinue ? handleNext : undefined,
    enabled: Boolean(canContinue),
  })

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Recently used symptoms suggestion */}
      {suggestedSymptoms.length > 0 && symptoms.length === 0 && (
        <div className="p-3 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Previously selected:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedSymptoms.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Symptoms multi-select */}
      <FormField
        label={isCarer ? "What symptoms does the person you're caring for have?" : "What symptoms do you have?"}
        required
        error={touched.symptoms ? errors.symptoms : undefined}
        hint="Select all that apply"
        helpContent={{ 
          title: "Why do we ask this?", 
          content: isCarer 
            ? "Describing their symptoms helps the doctor write an accurate certificate." 
            : "This helps our doctors understand your condition and write an accurate certificate." 
        }}
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {SYMPTOMS_LIST.map((symptom) => (
            <EnhancedSelectionButton
              key={symptom}
              variant="chip"
              selected={symptoms.includes(symptom)}
              onClick={() => toggleSymptom(symptom)}
              className="touch-manipulation"
            >
              {symptom}
            </EnhancedSelectionButton>
          ))}
        </div>
      </FormField>

      {/* Symptom duration */}
      <FormField
        label={isCarer ? "How long have they had these symptoms?" : "How long have you had these symptoms?"}
        required
        error={touched.symptomDuration ? errors.symptomDuration : undefined}
        hint="This helps assess whether the condition is acute or ongoing"
        helpContent={{ 
          title: "Why does duration matter?", 
          content: "Symptom duration helps the doctor assess whether this is an acute illness or ongoing condition." 
        }}
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {SYMPTOM_DURATION_OPTIONS.map((option) => (
            <EnhancedSelectionButton
              key={option.value}
              variant="chip"
              selected={symptomDuration === option.value}
              onClick={() => setAnswer("symptomDuration", option.value)}
              className="touch-manipulation"
            >
              {option.label}
            </EnhancedSelectionButton>
          ))}
        </div>
      </FormField>

      {/* Symptom details */}
      <FormField
        label={isCarer ? "Describe their symptoms in more detail" : "Describe your symptoms in more detail"}
        required
        error={touched.symptomDetails ? errors.symptomDetails : undefined}
        hint="Minimum 20 characters"
        helpContent={{ 
          title: "What should I include?", 
          content: "Describe how the symptoms affect you, when they started, and any relevant details. This helps the doctor write an accurate certificate." 
        }}
      >
        <Textarea
          value={symptomDetails}
          onChange={(e) => setAnswer("symptomDetails", e.target.value)}
          onBlur={() => setTouched(prev => ({ ...prev, symptomDetails: true }))}
          placeholder={isCarer 
            ? "e.g., They have a high fever since yesterday, severe body aches..." 
            : "e.g., I've had a fever since yesterday, severe body aches, and I can't concentrate at work..."
          }
          className={`min-h-[100px] mt-2 ${touched.symptomDetails && errors.symptomDetails ? 'border-destructive' : ''}`}
        />
        <p className="text-xs text-muted-foreground text-right mt-1">
          {symptomDetails.length}/20 characters minimum
        </p>
      </FormField>

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
