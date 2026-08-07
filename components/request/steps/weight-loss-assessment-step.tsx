"use client"

/**
 * Weight-loss assessment — the single clinical screen for the weight-management
 * consult (launch build 2026-08-07, decisions D-A..D-E in
 * docs/plans/2026-08-07-weight-loss-launch-plan.md).
 *
 * Form-first (D-A): there is no scheduled-call step. The eating-disorder answer
 * soft-escalates to a doctor call (`requiresCall`) exactly like women's health;
 * everything else is reviewed asynchronously.
 *
 * Medicine-neutral (D-B): no treatment-preference cards and no drug names —
 * the doctor recommends the medicine, or declines, after review. TGA: patients
 * may type a drug name into free text; we never print one.
 *
 * Screening (D-D): pregnancy/breastfeeding, MEN2/medullary thyroid cancer, and
 * pancreatitis are collected here because the server safety rules DECLINE on
 * them (lib/safety/rules.ts weightRules). The answer keys match the rules
 * exactly — `weight_pregnancy_status` ('yes'/'no'), and boolean
 * `weight_men2_thyroid_cancer` / `weight_pancreatitis`.
 *
 * Keys are aligned with the ED common tail (`weightKg`/`heightCm`/`bmi`) so the
 * doctor draft context and clinical summary read one vocabulary; legacy drafts
 * carrying `currentWeight`/`currentHeight` are migrated on mount.
 * `wlHasWeightComorbidity` is derived from the comorbidity toggles (single
 * boolean for the BMI 27–29.9 rule) — see lib/clinical/weight-loss-eligibility.
 *
 * One always-mounted screen, no phased reveals (#209 rule); the only
 * conditional blocks are detail fields for answered "yes"es and the soft
 * eating-disorder note.
 */

import { AlertCircle, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"

import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import {
  computeBmi,
  WEIGHT_LOSS_BMI_FLOOR,
  WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY,
  WEIGHT_LOSS_COMORBIDITY_KEYS,
} from "@/lib/clinical/weight-loss-eligibility"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

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

/** The file's established radio-card pattern, extracted so the three
 *  safety questions don't triple the markup. */
function BinaryChoice({
  label,
  value,
  onChange,
  error,
  ariaLabel,
}: {
  label: React.ReactNode
  value: "yes" | "no" | ""
  onChange: (value: "yes" | "no") => void
  error?: string
  ariaLabel: string
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        {label}<span className="text-destructive ml-0.5">*</span>
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as "yes" | "no")}
        className="space-y-2"
        aria-label={ariaLabel}
      >
        {(["yes", "no"] as const).map((option) => (
          <label
            key={option}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]",
              value === option
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <RadioGroupItem value={option} />
            <span className="text-sm">{option === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </RadioGroup>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

export default function WeightLossAssessmentStep({ onNext }: WeightLossAssessmentStepProps) {
  const { answers, setAnswer, setAnswers } = useRequestStore()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const weightKg = (answers.weightKg as string) || ""
  const heightCm = (answers.heightCm as string) || ""
  const targetWeight = (answers.targetWeight as string) || ""
  const previousAttempts = (answers.previousAttempts as string) || ""
  const eatingDisorderHistory = (answers.eatingDisorderHistory as string) || ""
  const pregnancyStatus = (answers.weight_pregnancy_status as string) || ""
  const men2History = answers.weight_men2_thyroid_cancer as boolean | undefined
  const pancreatitisHistory = answers.weight_pancreatitis as boolean | undefined
  const weightLossGoals = (answers.weightLossGoals as string) || ""
  const wlAdverseReactions = (answers.wlAdverseReactions as string) || ""
  const wlAdverseReactionsDetails = (answers.wlAdverseReactionsDetails as string) || ""

  // Migrate drafts saved before the key alignment (currentWeight/currentHeight
  // -> weightKg/heightCm). One-way, on mount, only when the new keys are empty.
  useEffect(() => {
    const legacyWeight = answers.currentWeight as string | undefined
    const legacyHeight = answers.currentHeight as string | undefined
    if ((legacyWeight && !answers.weightKg) || (legacyHeight && !answers.heightCm)) {
      setAnswers({
        ...(legacyWeight && !answers.weightKg ? { weightKg: legacyWeight } : {}),
        ...(legacyHeight && !answers.heightCm ? { heightCm: legacyHeight } : {}),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bmi = computeBmi(parseFloat(weightKg), parseFloat(heightCm))

  // Persist derived values the server rules evaluate: the BMI itself and the
  // single comorbidity boolean (six maybe-missing toggles collapse to one
  // always-present flag).
  const hasComorbidity = WEIGHT_LOSS_COMORBIDITY_KEYS.some((key) => answers[key] === true)
  useEffect(() => {
    setAnswer("bmi", bmi ?? "")
  }, [bmi, setAnswer])
  useEffect(() => {
    setAnswer("wlHasWeightComorbidity", hasComorbidity)
  }, [hasComorbidity, setAnswer])

  // Honest early signal, same thresholds the server enforces: below the floor
  // the request will be declined, so say it before payment, not after.
  const belowFloor = bmi !== null && bmi < WEIGHT_LOSS_BMI_FLOOR
  const needsComorbidity =
    bmi !== null
    && bmi >= WEIGHT_LOSS_BMI_FLOOR
    && bmi < WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY
    && !hasComorbidity

  const handleEatingDisorderChange = (value: "yes" | "no") => {
    setAnswer("eatingDisorderHistory", value)
    if (value === "yes") {
      // Soft escalate — mark for a doctor call, don't hard block.
      setAnswer("requiresCall", true)
      setAnswer("callReason", "eating_disorder_history")
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!weightKg || parseFloat(weightKg) < 30 || parseFloat(weightKg) > 300) {
      newErrors.weightKg = "Please enter a valid weight (30-300 kg)"
    }
    if (!heightCm || parseFloat(heightCm) < 100 || parseFloat(heightCm) > 250) {
      newErrors.heightCm = "Please enter a valid height (100-250 cm)"
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
    if (!pregnancyStatus) {
      newErrors.pregnancyStatus = "Please answer this question"
    }
    if (men2History === undefined) {
      newErrors.men2History = "Please answer this question"
    }
    if (pancreatitisHistory === undefined) {
      newErrors.pancreatitisHistory = "Please answer this question"
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

  const isComplete = Boolean(
    weightKg && heightCm && targetWeight && previousAttempts
    && eatingDisorderHistory && pregnancyStatus
    && men2History !== undefined && pancreatitisHistory !== undefined
    && wlAdverseReactions
    && (wlAdverseReactions !== 'yes' || wlAdverseReactionsDetails.length >= 10)
    && weightLossGoals.length >= 20
  )

  return (
    <div className="space-y-6">
      {/* Current measurements */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Current weight (kg)<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            type="number"
            value={weightKg}
            onChange={(e) => setAnswer("weightKg", e.target.value)}
            placeholder="e.g., 85"
            className="h-11"
          />
          {errors.weightKg && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.weightKg}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Height (cm)<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            type="number"
            value={heightCm}
            onChange={(e) => setAnswer("heightCm", e.target.value)}
            placeholder="e.g., 170"
            className="h-11"
          />
          {errors.heightCm && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.heightCm}
            </p>
          )}
        </div>
      </div>

      {/* BMI display + honest eligibility signal (same thresholds the server enforces) */}
      {bmi !== null && (
        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">Your BMI</p>
          <p className="text-2xl font-semibold">{bmi.toFixed(1)}</p>
          {belowFloor && (
            <p className="text-sm text-muted-foreground mt-1">
              Doctor review for weight-management treatment usually needs a BMI of{" "}
              {WEIGHT_LOSS_BMI_FLOOR}+ — this request is likely to be declined. Your
              GP is the right place to talk through healthy weight support.
            </p>
          )}
          {needsComorbidity && (
            <p className="text-sm text-muted-foreground mt-1">
              Between BMI {WEIGHT_LOSS_BMI_FLOOR} and {WEIGHT_LOSS_BMI_FLOOR_WITHOUT_COMORBIDITY},
              review usually needs a weight-related condition (like those in the
              medical history list below) to proceed.
            </p>
          )}
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
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]",
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

      {/* Relevant medical history - toggles (also feeds the comorbidity rule) */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Relevant medical history
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Toggle on any conditions that apply to you.
        </p>
        <MedicalHistoryToggles
          items={MEDICAL_HISTORY_TOGGLES}
          values={answers}
          onChange={(key, checked) => setAnswer(key, checked)}
        />
      </div>

      {/* Safety screening — keys match the server DECLINE rules exactly. */}
      <BinaryChoice
        label="Are you currently pregnant, possibly pregnant, or breastfeeding?"
        ariaLabel="Pregnancy or breastfeeding status"
        value={(pregnancyStatus as "yes" | "no" | "")}
        onChange={(value) => setAnswer("weight_pregnancy_status", value)}
        error={errors.pregnancyStatus}
      />

      <BinaryChoice
        label="Have you, or anyone in your family, had medullary thyroid cancer or MEN2 syndrome?"
        ariaLabel="Medullary thyroid cancer or MEN2 history"
        value={men2History === undefined ? "" : men2History ? "yes" : "no"}
        onChange={(value) => setAnswer("weight_men2_thyroid_cancer", value === "yes")}
        error={errors.men2History}
      />

      <BinaryChoice
        label="Have you ever had pancreatitis?"
        ariaLabel="Pancreatitis history"
        value={pancreatitisHistory === undefined ? "" : pancreatitisHistory ? "yes" : "no"}
        onChange={(value) => setAnswer("weight_pancreatitis", value === "yes")}
        error={errors.pancreatitisHistory}
      />

      {/* Eating disorder history — soft escalation to a doctor call */}
      <BinaryChoice
        label="Have you ever been diagnosed with or treated for an eating disorder?"
        ariaLabel="Eating disorder history"
        value={(eatingDisorderHistory as "yes" | "no" | "")}
        onChange={handleEatingDisorderChange}
        error={errors.eatingDisorderHistory}
      />

      {eatingDisorderHistory === "yes" && (
        <Alert variant="default" className="border-warning-border bg-warning-light/50 dark:bg-warning/10">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-xs text-warning">
            Thank you for sharing. A doctor will call you before any treatment
            decision, to make sure whatever happens next is safe and supportive
            for you.
          </AlertDescription>
        </Alert>
      )}

      {/* Previous adverse reactions to weight loss medications */}
      <div className="space-y-3">
        <BinaryChoice
          label="Have you had any adverse reactions to weight loss medications?"
          ariaLabel="Previous adverse reactions to weight loss medications"
          value={(wlAdverseReactions as "yes" | "no" | "")}
          onChange={(value) => setAnswer("wlAdverseReactions", value)}
          error={errors.wlAdverseReactions}
        />

        {wlAdverseReactions === 'yes' && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Please describe the reaction(s)<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Textarea
              value={wlAdverseReactionsDetails}
              onChange={(e) => setAnswer("wlAdverseReactionsDetails", e.target.value)}
              placeholder="Tell us what happened and which option it involved, if you remember."
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
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        data-intake-primary-ready={isComplete ? "true" : "false"}
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        Continue
      </Button>
    </div>
  )
}
