"use client"

import { AlertCircle, ArrowRight,Droplets, Pill, Scissors, Stethoscope } from "lucide-react"
import { useEffect,useRef, useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

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
  { key: 'triedMinoxidil', label: 'Topical scalp solution' },
  { key: 'triedFinasteride', label: 'Oral hair loss medication' },
  { key: 'triedBiotin', label: 'Hair supplements (biotin, etc.)' },
  { key: 'triedShampoos', label: 'Medicated shampoos' },
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
  const posthog = usePostHog()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const hairPattern = (answers.hairPattern as string) || ""
  const hairDuration = (answers.hairDuration as string) || ""
  const hairFamilyHistory = (answers.hairFamilyHistory as string) || ""
  const hairMedicationPreference = (answers.hairMedicationPreference as string) || ""
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
      posthog?.capture('step_completed', { step: 'hair-loss-assessment', pattern: hairPattern, preference: hairMedicationPreference })
      onNext()
    }
  }

  const isComplete = hairPattern && hairDuration && hairFamilyHistory && hairMedicationPreference

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: Boolean(isComplete),
  })

  // Refs for auto-scroll on progressive disclosure
  const durationRef = useRef<HTMLDivElement>(null)
  const familyRef = useRef<HTMLDivElement>(null)
  const treatmentsRef = useRef<HTMLDivElement>(null)
  const preferenceRef = useRef<HTMLDivElement>(null)
  const scalpRef = useRef<HTMLDivElement>(null)

  // Progressive disclosure: reveal sections as earlier required fields are answered
  const showDuration = !!hairPattern
  const showFamilyHistory = showDuration && !!hairDuration
  const showTreatments = showFamilyHistory && !!hairFamilyHistory
  const showPreference = showTreatments
  const showScalp = showPreference && !!hairMedicationPreference

  // Auto-scroll into view when sections reveal
  useEffect(() => { if (showDuration) durationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [showDuration])
  useEffect(() => { if (showFamilyHistory) familyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [showFamilyHistory])
  useEffect(() => { if (showTreatments) treatmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [showTreatments])
  useEffect(() => { if (showScalp) scalpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [showScalp])

  return (
    <div className="space-y-6">
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
          <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
            <AlertCircle className="w-3 h-3" />
            {errors.hairPattern}
          </p>
        )}
      </div>

      {/* Duration - visible after pattern selected */}
      {showDuration && (
      <div className="space-y-3" ref={durationRef}>
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
          <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
            <AlertCircle className="w-3 h-3" />
            {errors.hairDuration}
          </p>
        )}
      </div>
      )}

      {/* Family history - visible after duration selected */}
      {showFamilyHistory && (
      <div className="space-y-3" ref={familyRef}>
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
          <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
            <AlertCircle className="w-3 h-3" />
            {errors.hairFamilyHistory}
          </p>
        )}
      </div>
      )}

      {/* Previous treatments - visible after family history */}
      {showTreatments && (
      <div className="space-y-3" ref={treatmentsRef}>
        <Label className="text-sm font-medium">
          Which treatments have you tried before?
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any treatments you have previously used.
        </p>
        <MedicalHistoryToggles
          items={PREVIOUS_TREATMENTS}
          values={answers}
          onChange={(key, checked) => setAnswer(key, checked)}
        />
      </div>

      )}

      {/* Treatment preference - lifestyle-framed, no drug names (TGA) */}
      {showPreference && (
      <div className="space-y-3" ref={preferenceRef}>
        <Label className="text-sm font-medium">
          How would you prefer to treat your hair loss?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex flex-col gap-2.5">
          {[
            {
              value: "oral",
              icon: Pill,
              label: "Daily oral tablet",
              description: "One tablet a day to slow hair loss and promote regrowth.",
            },
            {
              value: "topical",
              icon: Droplets,
              label: "Topical scalp treatment",
              description: "Applied directly to the scalp to stimulate follicles.",
            },
            {
              value: "doctor_decides",
              icon: Stethoscope,
              label: "Not sure - let the doctor decide",
              description: "Your doctor will recommend the best option for you.",
            },
          ].map((option) => {
            const Icon = option.icon
            const isSelected = hairMedicationPreference === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswer("hairMedicationPreference", option.value)}
                className={cn(
                  "flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {option.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
        {errors.hairMedicationPreference && (
          <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
            <AlertCircle className="w-3 h-3" />
            {errors.hairMedicationPreference}
          </p>
        )}
      </div>

      )}

      {/* Scalp conditions - visible after preference selected */}
      {showScalp && (
      <div className="space-y-3" ref={scalpRef}>
        <Label className="text-sm font-medium">
          Do you have any scalp conditions?
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any that apply.
        </p>
        <MedicalHistoryToggles
          items={SCALP_CONDITIONS}
          values={answers}
          onChange={(key, checked) => setAnswer(key, checked)}
        />
      </div>

      )}

      {/* Additional info - visible after scalp */}
      {showScalp && (
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

      )}

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
      >
        {isComplete ? (
          <>
            Continue to your details
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {isComplete && (
        <p className="text-[11px] text-muted-foreground/60 text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
