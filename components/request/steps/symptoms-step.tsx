"use client"

/**
 * Symptoms Step - Symptom selection and details
 * Extracted from EnhancedIntakeFlow for the unified /request flow
 */

import { useState } from "react"
import { Info } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { EnhancedSelectionButton } from "@/components/shared/enhanced-selection-button"
import { useRequestStore } from "../store"
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

export default function SymptomsStep({ onNext }: SymptomsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  
  const symptoms = (answers.symptoms as string[]) || []
  const symptomDetails = (answers.symptomDetails as string) || ""
  const symptomDuration = answers.symptomDuration as string | undefined
  const certType = answers.certType as string | undefined
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleSymptom = (symptom: string) => {
    const current = symptoms
    const updated = current.includes(symptom)
      ? current.filter((s) => s !== symptom)
      : [...current, symptom]
    setAnswer("symptoms", updated)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (symptoms.length === 0) newErrors.symptoms = "Please select at least one symptom"
    if (!symptomDetails || symptomDetails.length < 20) {
      newErrors.symptomDetails = "Please describe your symptoms (minimum 20 characters)"
    }
    if (!symptomDuration) newErrors.symptomDuration = "Please indicate how long you've had these symptoms"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isCarer = certType === "carer"

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Symptoms multi-select */}
      <FormField
        label={isCarer ? "What symptoms does the person you're caring for have?" : "What symptoms do you have?"}
        required
        error={errors.symptoms}
        hint="Select all that apply"
        helpText={isCarer ? "Describe the symptoms of the person you're caring for" : "This helps our doctors understand your condition"}
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {SYMPTOMS_LIST.map((symptom, index) => (
            <EnhancedSelectionButton
              key={symptom}
              variant="chip"
              selected={symptoms.includes(symptom)}
              onClick={() => toggleSymptom(symptom)}
              gradient={
                index % 4 === 0 ? "blue-purple" :
                index % 4 === 1 ? "purple-pink" :
                index % 4 === 2 ? "teal-emerald" : "orange-red"
              }
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
        error={errors.symptomDuration}
        hint="This helps assess whether the condition is acute or ongoing"
      >
        <div className="flex flex-wrap gap-2 mt-2">
          {SYMPTOM_DURATION_OPTIONS.map((option) => (
            <EnhancedSelectionButton
              key={option.value}
              variant="chip"
              selected={symptomDuration === option.value}
              onClick={() => setAnswer("symptomDuration", option.value)}
              gradient="primary-subtle"
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
        error={errors.symptomDetails}
        hint="Minimum 20 characters"
        helpText="This helps the doctor write an accurate certificate"
      >
        <Textarea
          value={symptomDetails}
          onChange={(e) => setAnswer("symptomDetails", e.target.value)}
          placeholder={isCarer 
            ? "e.g., They have a high fever since yesterday, severe body aches..." 
            : "e.g., I've had a fever since yesterday, severe body aches, and I can't concentrate at work..."
          }
          className="min-h-[100px] mt-2"
        />
        <p className="text-xs text-muted-foreground text-right mt-1">
          {symptomDetails.length}/20 characters minimum
        </p>
      </FormField>

      {/* Continue button */}
      <Button 
        onClick={handleNext} 
        className="w-full h-12 mt-4"
        disabled={symptoms.length === 0 || !symptomDuration || symptomDetails.length < 20}
      >
        Continue
      </Button>
    </div>
  )
}
