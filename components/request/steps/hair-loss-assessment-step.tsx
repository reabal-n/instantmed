"use client"

import { useState } from "react"
import { Scissors, AlertCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface HairLossAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PATTERN_OPTIONS = [
  { value: 'receding_hairline', label: 'Receding hairline' },
  { value: 'thinning_crown', label: 'Thinning at the crown' },
  { value: 'overall_thinning', label: 'Overall thinning' },
  { value: 'patchy', label: 'Patchy hair loss' },
  { value: 'other', label: 'Other pattern' },
]

const DURATION_OPTIONS = [
  { value: 'less_than_6_months', label: 'Less than 6 months' },
  { value: '6_to_12_months', label: '6-12 months' },
  { value: '1_to_2_years', label: '1-2 years' },
  { value: 'more_than_2_years', label: 'More than 2 years' },
]

const FAMILY_HISTORY_OPTIONS = [
  { value: 'yes_father', label: 'Yes, on my father\'s side' },
  { value: 'yes_mother', label: 'Yes, on my mother\'s side' },
  { value: 'yes_both', label: 'Yes, on both sides' },
  { value: 'no', label: 'No family history' },
  { value: 'unknown', label: 'Not sure' },
]

const PREVIOUS_TREATMENT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'minoxidil', label: 'Minoxidil (Rogaine)' },
  { value: 'finasteride', label: 'Finasteride (Propecia)' },
  { value: 'both', label: 'Both minoxidil and finasteride' },
  { value: 'other', label: 'Other treatments' },
]

export default function HairLossAssessmentStep({ onNext }: HairLossAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hairPattern = answers.hairPattern as string | undefined
  const hairDuration = answers.hairDuration as string | undefined
  const hairFamilyHistory = answers.hairFamilyHistory as string | undefined
  const hairPreviousTreatment = answers.hairPreviousTreatment as string | undefined
  const hairAdditionalInfo = (answers.hairAdditionalInfo as string) || ""

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!hairPattern) {
      newErrors.hairPattern = "Please select your hair loss pattern"
    }
    if (!hairDuration) {
      newErrors.hairDuration = "Please select how long you've noticed hair loss"
    }
    if (!hairFamilyHistory) {
      newErrors.hairFamilyHistory = "Please select your family history"
    }
    if (!hairPreviousTreatment) {
      newErrors.hairPreviousTreatment = "Please select previous treatments"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = hairPattern && hairDuration && hairFamilyHistory && hairPreviousTreatment

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Scissors className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Understanding your hair loss pattern helps us recommend the most effective treatment.
        </AlertDescription>
      </Alert>

      {/* Pattern */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          What pattern of hair loss are you experiencing?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={hairPattern}
          onValueChange={(value) => setAnswer("hairPattern", value)}
          className="space-y-2"
          aria-label="What pattern of hair loss are you experiencing"
        >
          {PATTERN_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                hairPattern === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.hairPattern && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.hairPattern}
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How long have you been experiencing hair loss?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={hairDuration}
          onValueChange={(value) => setAnswer("hairDuration", value)}
          className="space-y-2"
          aria-label="How long have you been experiencing hair loss"
        >
          {DURATION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                hairDuration === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.hairDuration && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.hairDuration}
          </p>
        )}
      </div>

      {/* Family history */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Do you have a family history of hair loss?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={hairFamilyHistory}
          onValueChange={(value) => setAnswer("hairFamilyHistory", value)}
          className="space-y-2"
          aria-label="Do you have a family history of hair loss"
        >
          {FAMILY_HISTORY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                hairFamilyHistory === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.hairFamilyHistory && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.hairFamilyHistory}
          </p>
        )}
      </div>

      {/* Previous treatments */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Have you tried any hair loss treatments before?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={hairPreviousTreatment}
          onValueChange={(value) => setAnswer("hairPreviousTreatment", value)}
          className="space-y-2"
          aria-label="Have you tried any hair loss treatments before"
        >
          {PREVIOUS_TREATMENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                hairPreviousTreatment === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.hairPreviousTreatment && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.hairPreviousTreatment}
          </p>
        )}
      </div>

      {/* Additional info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Anything else relevant?
        </Label>
        <Textarea
          value={hairAdditionalInfo}
          onChange={(e) => setAnswer("hairAdditionalInfo", e.target.value)}
          placeholder="Optional: scalp conditions, recent changes, etc..."
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
