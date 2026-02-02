"use client"

import { useState } from "react"
import { Scale, AlertCircle, AlertTriangle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface WeightLossAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PREVIOUS_ATTEMPTS_OPTIONS = [
  { value: 'none', label: 'No previous attempts' },
  { value: 'diet_exercise', label: 'Diet and exercise only' },
  { value: 'programs', label: 'Weight loss programs (e.g., Weight Watchers)' },
  { value: 'medication', label: 'Weight loss medication' },
  { value: 'multiple', label: 'Multiple methods' },
]

export default function WeightLossAssessmentStep({ onNext }: WeightLossAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showEatingDisorderWarning, setShowEatingDisorderWarning] = useState(false)

  const currentWeight = (answers.currentWeight as string) || ""
  const currentHeight = (answers.currentHeight as string) || ""
  const targetWeight = (answers.targetWeight as string) || ""
  const previousAttempts = answers.previousAttempts as string | undefined
  const eatingDisorderHistory = answers.eatingDisorderHistory as string | undefined
  const weightLossGoals = (answers.weightLossGoals as string) || ""

  // Calculate BMI
  const calculateBMI = () => {
    const weight = parseFloat(currentWeight)
    const heightCm = parseFloat(currentHeight)
    if (weight && heightCm) {
      const heightM = heightCm / 100
      return (weight / (heightM * heightM)).toFixed(1)
    }
    return null
  }

  const bmi = calculateBMI()

  const handleEatingDisorderChange = (value: string) => {
    setAnswer("eatingDisorderHistory", value)
    if (value === 'yes') {
      setShowEatingDisorderWarning(true)
      // Soft escalate - mark for call, don't hard block
      setAnswer("requiresCall", true)
      setAnswer("callReason", "eating_disorder_history")
    } else {
      setShowEatingDisorderWarning(false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!currentWeight || parseFloat(currentWeight) < 30 || parseFloat(currentWeight) > 300) {
      newErrors.currentWeight = "Please enter a valid weight (30-300 kg)"
    }
    if (!currentHeight || parseFloat(currentHeight) < 100 || parseFloat(currentHeight) > 250) {
      newErrors.currentHeight = "Please enter a valid height (100-250 cm)"
    }
    if (!targetWeight) {
      newErrors.targetWeight = "Please enter your target weight"
    }
    if (!previousAttempts) {
      newErrors.previousAttempts = "Please select an option"
    }
    if (!eatingDisorderHistory) {
      newErrors.eatingDisorderHistory = "Please answer this question"
    }
    if (!weightLossGoals || weightLossGoals.length < 20) {
      newErrors.weightLossGoals = "Please describe your goals (at least 20 characters)"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validate()) {
      onNext()
    }
  }

  const isComplete = currentWeight && currentHeight && targetWeight && previousAttempts && eatingDisorderHistory && weightLossGoals.length >= 20

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Info alert */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Scale className="w-4 h-4" />
        <AlertDescription className="text-xs">
          This service includes a brief consultation call to discuss your weight loss goals safely.
        </AlertDescription>
      </Alert>

      {/* Current measurements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Current weight (kg)<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            type="number"
            value={currentWeight}
            onChange={(e) => setAnswer("currentWeight", e.target.value)}
            placeholder="e.g., 85"
            className="h-11"
          />
          {errors.currentWeight && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.currentWeight}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Height (cm)<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            type="number"
            value={currentHeight}
            onChange={(e) => setAnswer("currentHeight", e.target.value)}
            placeholder="e.g., 170"
            className="h-11"
          />
          {errors.currentHeight && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.currentHeight}
            </p>
          )}
        </div>
      </div>

      {/* BMI display */}
      {bmi && (
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Your BMI</p>
          <p className="text-2xl font-semibold">{bmi}</p>
          <p className="text-xs text-muted-foreground">
            {parseFloat(bmi) < 18.5 ? 'Underweight' :
             parseFloat(bmi) < 25 ? 'Healthy weight' :
             parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'}
          </p>
        </div>
      )}

      {/* Target weight */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Target weight (kg)<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          type="number"
          value={targetWeight}
          onChange={(e) => setAnswer("targetWeight", e.target.value)}
          placeholder="e.g., 75"
          className="h-11"
        />
        {errors.targetWeight && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.targetWeight}
          </p>
        )}
      </div>

      {/* Previous attempts */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          What have you tried before?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={previousAttempts}
          onValueChange={(value) => setAnswer("previousAttempts", value)}
          className="space-y-2"
          aria-label="What have you tried before"
        >
          {PREVIOUS_ATTEMPTS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                previousAttempts === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value={option.value} />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.previousAttempts && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.previousAttempts}
          </p>
        )}
      </div>

      {/* Eating disorder history */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Have you ever been diagnosed with or treated for an eating disorder?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={eatingDisorderHistory}
          onValueChange={handleEatingDisorderChange}
          className="space-y-2"
          aria-label="Eating disorder history"
        >
          <label
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              eatingDisorderHistory === 'yes'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="yes" />
            <span className="text-sm">Yes</span>
          </label>
          <label
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              eatingDisorderHistory === 'no'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
        {errors.eatingDisorderHistory && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.eatingDisorderHistory}
          </p>
        )}
      </div>

      {/* Eating disorder warning (soft escalate) */}
      {showEatingDisorderWarning && (
        <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            Thank you for sharing. The doctor will discuss this with you during your call to ensure any treatment is appropriate and safe for you.
          </AlertDescription>
        </Alert>
      )}

      {/* Goals */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          What are your weight loss goals?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Textarea
          value={weightLossGoals}
          onChange={(e) => setAnswer("weightLossGoals", e.target.value)}
          placeholder="Describe what you hope to achieve, any specific concerns, and what motivated you to seek help now..."
          className="min-h-[100px] resize-none"
        />
        {errors.weightLossGoals && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.weightLossGoals}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{weightLossGoals.length}/20 characters minimum</p>
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
