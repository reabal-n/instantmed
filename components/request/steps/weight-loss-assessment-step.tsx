"use client"

import { useState } from "react"
import { Scale, AlertCircle, AlertTriangle, Syringe, Pill } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
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

const MEDICAL_HISTORY_TOGGLES = [
  { key: 'wlHistoryDiabetes', label: 'Type 2 diabetes' },
  { key: 'wlHistoryHeartCondition', label: 'Heart condition or cardiovascular disease' },
  { key: 'wlHistoryHighBP', label: 'High blood pressure' },
  { key: 'wlHistoryThyroid', label: 'Thyroid disorder' },
  { key: 'wlHistorySleepApnea', label: 'Sleep apnea' },
  { key: 'wlHistoryPCOS', label: 'PCOS (polycystic ovary syndrome)' },
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
  const weightLossMedPreference = answers.weightLossMedPreference as string | undefined
  const wlAdverseReactions = answers.wlAdverseReactions as string | undefined
  const wlAdverseReactionsDetails = (answers.wlAdverseReactionsDetails as string) || ""

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
    if (!weightLossMedPreference) {
      newErrors.weightLossMedPreference = "Please select your preferred medication type"
    }
    if (!wlAdverseReactions) {
      newErrors.wlAdverseReactions = "Please answer this question"
    }
    if (wlAdverseReactions === 'yes' && wlAdverseReactionsDetails.length < 10) {
      newErrors.wlAdverseReactionsDetails = "Please describe the adverse reaction(s)"
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

  const isComplete = currentWeight && currentHeight && targetWeight && previousAttempts && eatingDisorderHistory && weightLossMedPreference && wlAdverseReactions && (wlAdverseReactions !== 'yes' || wlAdverseReactionsDetails.length >= 10) && weightLossGoals.length >= 20

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

      {/* Preferred medication type — styled option cards */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Which type of medication interests you?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* GLP-1 card */}
          <button
            type="button"
            onClick={() => setAnswer("weightLossMedPreference", "glp1")}
            className={cn(
              "flex flex-col items-start gap-3 p-4 rounded-xl border text-left cursor-pointer transition-all",
              weightLossMedPreference === "glp1"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              weightLossMedPreference === "glp1"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              <Syringe className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">GLP-1 (Ozempic / Mounjaro)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Weekly injection. Reduces appetite and slows gastric emptying.
              </p>
            </div>
          </button>

          {/* Duromine card */}
          <button
            type="button"
            onClick={() => setAnswer("weightLossMedPreference", "duromine")}
            className={cn(
              "flex flex-col items-start gap-3 p-4 rounded-xl border text-left cursor-pointer transition-all",
              weightLossMedPreference === "duromine"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              weightLossMedPreference === "duromine"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              <Pill className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Duromine (Phentermine)</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Daily capsule. Appetite suppressant for short-term use.
              </p>
            </div>
          </button>
        </div>
        {errors.weightLossMedPreference && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.weightLossMedPreference}
          </p>
        )}
      </div>

      {/* Relevant medical history — toggles */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Relevant medical history
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any conditions that apply to you.
        </p>
        <div className="space-y-2">
          {MEDICAL_HISTORY_TOGGLES.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30"
            >
              <Label htmlFor={item.key} className="text-sm cursor-pointer leading-snug flex-1">
                {item.label}
              </Label>
              <Switch
                id={item.key}
                checked={answers[item.key] === true}
                onCheckedChange={(checked) => setAnswer(item.key, checked)}
              />
            </div>
          ))}
        </div>
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

      {/* Previous adverse reactions to weight loss medications */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Have you had any adverse reactions to weight loss medications?<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          value={wlAdverseReactions}
          onValueChange={(value) => setAnswer("wlAdverseReactions", value)}
          className="space-y-2"
          aria-label="Previous adverse reactions to weight loss medications"
        >
          <label
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
              wlAdverseReactions === 'yes'
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
              wlAdverseReactions === 'no'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value="no" />
            <span className="text-sm">No</span>
          </label>
        </RadioGroup>
        {errors.wlAdverseReactions && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.wlAdverseReactions}
          </p>
        )}

        {wlAdverseReactions === 'yes' && (
          <div className="space-y-2 animate-in fade-in">
            <Label className="text-sm font-medium">
              Please describe the reaction(s)<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              value={wlAdverseReactionsDetails}
              onChange={(e) => setAnswer("wlAdverseReactionsDetails", e.target.value)}
              placeholder="e.g., Severe nausea with Ozempic, heart palpitations with Duromine..."
              className="min-h-[80px] resize-none"
            />
            {errors.wlAdverseReactionsDetails && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.wlAdverseReactionsDetails}
              </p>
            )}
          </div>
        )}
      </div>

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
