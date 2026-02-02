"use client"

import { useState } from "react"
import { Heart, AlertCircle, ShieldCheck } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const ONSET_OPTIONS = [
  { value: 'recent', label: 'Recently (last few months)' },
  { value: 'gradual', label: 'Gradually over time' },
  { value: 'sudden', label: 'Suddenly' },
  { value: 'always', label: 'Always had difficulty' },
]

const FREQUENCY_OPTIONS = [
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often (more than half the time)' },
  { value: 'always', label: 'Always' },
]

const MORNING_ERECTION_OPTIONS = [
  { value: 'yes', label: 'Yes, regularly' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'rarely', label: 'Rarely or never' },
]

export default function EdAssessmentStep({ onNext }: EdAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const edOnset = answers.edOnset as string | undefined
  const edFrequency = answers.edFrequency as string | undefined
  const edMorningErections = answers.edMorningErections as string | undefined
  const edAdditionalInfo = (answers.edAdditionalInfo as string) || ""
  const edAgeConfirmed = answers.edAgeConfirmed as boolean | undefined

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!edOnset) {
      newErrors.edOnset = "Please select when symptoms started"
    }
    if (!edFrequency) {
      newErrors.edFrequency = "Please select how often this occurs"
    }
    if (!edMorningErections) {
      newErrors.edMorningErections = "Please answer this question"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = edAgeConfirmed && edOnset && edFrequency && edMorningErections

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Age gate */}
      <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <ShieldCheck className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
          This service is only available to patients aged 18 and over.
        </AlertDescription>
      </Alert>

      <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30">
        <Switch
          id="edAgeConfirmed"
          checked={edAgeConfirmed === true}
          onCheckedChange={(checked) => setAnswer("edAgeConfirmed", checked)}
        />
        <Label htmlFor="edAgeConfirmed" className="text-sm leading-relaxed cursor-pointer">
          I confirm I am 18 years or older
        </Label>
      </div>

      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Heart className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Your answers help our doctor understand your situation. All information is kept strictly confidential.
        </AlertDescription>
      </Alert>

      {/* Onset */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          When did you first notice difficulty achieving or maintaining an erection?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={edOnset}
          onValueChange={(value) => setAnswer("edOnset", value)}
          className="space-y-2"
          aria-label="When did symptoms start"
        >
          {ONSET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                edOnset === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.edOnset && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.edOnset}
          </p>
        )}
      </div>

      {/* Frequency */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How often do you experience difficulty?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={edFrequency}
          onValueChange={(value) => setAnswer("edFrequency", value)}
          className="space-y-2"
          aria-label="How often do you experience difficulty"
        >
          {FREQUENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                edFrequency === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.edFrequency && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.edFrequency}
          </p>
        )}
      </div>

      {/* Morning erections */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Do you experience morning erections?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          This helps determine whether the cause is more likely physical or psychological.
        </p>
        <RadioGroup
          value={edMorningErections}
          onValueChange={(value) => setAnswer("edMorningErections", value)}
          className="space-y-2"
          aria-label="Do you experience morning erections"
        >
          {MORNING_ERECTION_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                edMorningErections === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.edMorningErections && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.edMorningErections}
          </p>
        )}
      </div>

      {/* Additional info */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Anything else you&apos;d like to share?
        </Label>
        <Textarea
          value={edAdditionalInfo}
          onChange={(e) => setAnswer("edAdditionalInfo", e.target.value)}
          placeholder="Optional: any other relevant information..."
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
