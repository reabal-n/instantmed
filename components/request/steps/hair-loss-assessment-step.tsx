"use client"

import { useState } from "react"
import { Scissors, AlertCircle, Pill, Droplets } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
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
  { value: 'male_pattern', label: 'Male pattern baldness (receding hairline / thinning crown)' },
  { value: 'overall_thinning', label: 'Overall thinning' },
  { value: 'patchy', label: 'Patchy hair loss (alopecia areata)' },
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

const PREVIOUS_TREATMENTS = [
  { key: 'triedMinoxidil', label: 'Minoxidil (Rogaine) — topical' },
  { key: 'triedFinasteride', label: 'Finasteride (Propecia) — oral' },
  { key: 'triedBiotin', label: 'Biotin / hair supplements' },
  { key: 'triedShampoos', label: 'Medicated shampoos (e.g., Nizoral)' },
  { key: 'triedPRP', label: 'PRP (Platelet-rich plasma) therapy' },
  { key: 'triedOther', label: 'Other treatment' },
]

const SCALP_CONDITIONS = [
  { key: 'scalpDandruff', label: 'Dandruff / seborrheic dermatitis' },
  { key: 'scalpPsoriasis', label: 'Scalp psoriasis' },
  { key: 'scalpItching', label: 'Persistent itching or irritation' },
  { key: 'scalpFolliculitis', label: 'Folliculitis (infected hair follicles)' },
  { key: 'scalpNone', label: 'No scalp conditions' },
]

export default function HairLossAssessmentStep({ onNext }: HairLossAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hairPattern = answers.hairPattern as string | undefined
  const hairDuration = answers.hairDuration as string | undefined
  const hairFamilyHistory = answers.hairFamilyHistory as string | undefined
  const hairMedicationPreference = answers.hairMedicationPreference as string | undefined
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
    if (!hairMedicationPreference) {
      newErrors.hairMedicationPreference = "Please select your preferred treatment"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = hairPattern && hairDuration && hairFamilyHistory && hairMedicationPreference

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
          What type of hair loss are you experiencing?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={hairPattern}
          onValueChange={(value) => setAnswer("hairPattern", value)}
          className="space-y-2"
          aria-label="What type of hair loss are you experiencing"
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

      {/* Previous treatments — toggle list */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Which treatments have you tried before?
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any treatments you have previously used.
        </p>
        <div className="space-y-2">
          {PREVIOUS_TREATMENTS.map((treatment) => (
            <div
              key={treatment.key}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30"
            >
              <Label htmlFor={treatment.key} className="text-sm cursor-pointer leading-snug flex-1">
                {treatment.label}
              </Label>
              <Switch
                id={treatment.key}
                checked={answers[treatment.key] === true}
                onCheckedChange={(checked) => setAnswer(treatment.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preferred medication — styled option cards */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Which treatment option interests you?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Finasteride card */}
          <button
            type="button"
            onClick={() => setAnswer("hairMedicationPreference", "finasteride")}
            className={cn(
              "flex flex-col items-start gap-3 p-4 rounded-xl border text-left cursor-pointer transition-all",
              hairMedicationPreference === "finasteride"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              hairMedicationPreference === "finasteride"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              <Pill className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Finasteride (oral)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Daily tablet. Blocks DHT to slow hair loss and promote regrowth.
              </p>
            </div>
          </button>

          {/* Minoxidil card */}
          <button
            type="button"
            onClick={() => setAnswer("hairMedicationPreference", "minoxidil")}
            className={cn(
              "flex flex-col items-start gap-3 p-4 rounded-xl border text-left cursor-pointer transition-all",
              hairMedicationPreference === "minoxidil"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              hairMedicationPreference === "minoxidil"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              <Droplets className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Minoxidil (topical)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Applied to scalp. Stimulates hair follicles and improves blood flow.
              </p>
            </div>
          </button>
        </div>
        {errors.hairMedicationPreference && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.hairMedicationPreference}
          </p>
        )}
      </div>

      {/* Scalp conditions — toggle list */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Do you have any scalp conditions?
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any that apply.
        </p>
        <div className="space-y-2">
          {SCALP_CONDITIONS.map((condition) => (
            <div
              key={condition.key}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30"
            >
              <Label htmlFor={condition.key} className="text-sm cursor-pointer leading-snug flex-1">
                {condition.label}
              </Label>
              <Switch
                id={condition.key}
                checked={answers[condition.key] === true}
                onCheckedChange={(checked) => setAnswer(condition.key, checked)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Additional info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Anything else relevant?
        </Label>
        <Textarea
          value={hairAdditionalInfo}
          onChange={(e) => setAnswer("hairAdditionalInfo", e.target.value)}
          placeholder="Optional: recent changes, stress, medications, etc..."
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
