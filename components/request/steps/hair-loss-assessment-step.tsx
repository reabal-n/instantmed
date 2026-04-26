"use client"

import { motion } from "framer-motion"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useEffect,useRef, useState } from "react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useReducedMotion } from "@/components/ui/motion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"
import {
  ScalpAdvanced,
  ScalpCrown,
  ScalpExtensive,
  ScalpMild,
  ScalpModerate,
  ScalpNone,
} from "./hair-loss-icons"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HairLossAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PATTERN_OPTIONS = [
  {
    value: "none",
    label: "No noticeable loss",
    icon: ScalpNone,
    badge: "Minimal",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    value: "slight_recession",
    label: "Slight recession at temples",
    icon: ScalpMild,
    badge: "Mild",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  {
    value: "noticeable_thinning",
    label: "Noticeable thinning / recession",
    icon: ScalpModerate,
    badge: "Moderate",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    value: "crown_plus_hairline",
    label: "Crown thinning + hairline recession",
    icon: ScalpCrown,
    badge: "Notable",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    value: "significant",
    label: "Significant overall thinning",
    icon: ScalpAdvanced,
    badge: "Advanced",
    badgeClass:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-700",
  },
  {
    value: "extensive",
    label: "Extensive loss",
    icon: ScalpExtensive,
    badge: "Significant",
    badgeClass:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
]

const FAMILY_HISTORY_OPTIONS = [
  { value: "yes_father", label: "Yes, on my father's side" },
  { value: "yes_mother", label: "Yes, on my mother's side" },
  { value: "yes_both", label: "Yes, on both sides" },
  { value: "no", label: "No family history" },
  { value: "unknown", label: "Not sure" },
]

const PREVIOUS_TREATMENTS = [
  { key: "triedMinoxidil", label: "Topical scalp solution" },
  { key: "triedFinasteride", label: "Oral hair loss medication" },
  { key: "triedBiotin", label: "Hair supplements (biotin, etc.)" },
  { key: "triedShampoos", label: "Medicated shampoos" },
  { key: "triedPRP", label: "PRP (Platelet-rich plasma) therapy" },
  { key: "triedOther", label: "Other treatment" },
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HairLossAssessmentStep({
  onNext,
}: HairLossAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Store values
  const hairPattern = (answers.hairPattern as string) || ""
  const hairFamilyHistory = (answers.hairFamilyHistory as string) || ""

  // Progressive disclosure
  const showFamilyHistory = !!hairPattern
  const showTreatments = showFamilyHistory && !!hairFamilyHistory

  // Auto-scroll refs
  const familyRef = useRef<HTMLDivElement>(null)
  const treatmentsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showFamilyHistory) {
      familyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [showFamilyHistory])

  useEffect(() => {
    if (showTreatments) {
      treatmentsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [showTreatments])

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!hairPattern) {
      newErrors.hairPattern = "Please select your hair loss pattern"
    }
    if (!hairFamilyHistory) {
      newErrors.hairFamilyHistory = "Please select your family history"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isComplete = !!hairPattern && !!hairFamilyHistory

  const handleNext = () => {
    if (validate()) {
      posthog?.capture("step_completed", {
        step: "hair-loss-assessment",
        pattern: hairPattern,
      })
      onNext()
    }
  }

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: Boolean(isComplete),
  })

  // Motion helpers
  const containerVariants = prefersReducedMotion ? {} : stagger.container
  const itemVariants = prefersReducedMotion ? {} : stagger.item

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Tell us about your hair loss
        </h2>
        <p className="text-sm text-muted-foreground">
          Select the pattern that best matches what you see. This helps the
          doctor understand your situation.
        </p>
      </motion.div>

      {/* Norwood pattern selector */}
      <motion.div variants={itemVariants} className="space-y-3">
        <Label className="text-sm font-medium">
          Which pattern best describes your hair loss?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          role="radiogroup"
          aria-label="Hair loss pattern"
        >
          {PATTERN_OPTIONS.map((option, idx) => {
            const Icon = option.icon
            const isSelected = hairPattern === option.value
            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                variants={itemVariants}
                custom={idx}
                onClick={() => setAnswer("hairPattern", option.value)}
                aria-checked={isSelected}
                aria-label={`${option.label} - ${option.badge}`}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border text-center cursor-pointer transition-[background-color,border-color]",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/50"
                )}
              >
                <Icon
                  className={cn(
                    "w-12 h-12 transition-colors",
                    isSelected
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <span className="text-xs font-medium leading-tight">
                  {option.label}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                    option.badgeClass
                  )}
                >
                  {option.badge}
                </span>
              </motion.button>
            )
          })}
        </div>
        {errors.hairPattern && (
          <p
            className="text-xs text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-3 h-3" />
            {errors.hairPattern}
          </p>
        )}
      </motion.div>

      {/* Family history -- visible after pattern selected */}
      {showFamilyHistory && (
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          className="space-y-3"
          ref={familyRef}
        >
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
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-[background-color,border-color]",
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
            <p
              className="text-xs text-destructive flex items-center gap-1"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-3 h-3" />
              {errors.hairFamilyHistory}
            </p>
          )}
        </motion.div>
      )}

      {/* Previous treatments -- visible after family history */}
      {showTreatments && (
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          className="space-y-3"
          ref={treatmentsRef}
        >
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
        </motion.div>
      )}

      {/* Continue button */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={handleNext}
          disabled={!isComplete}
          className="w-full h-12 text-base font-medium"
        >
          {isComplete ? (
            <>
              Continue to health check
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            "Continue"
          )}
        </Button>
        {isComplete && (
          <p className="text-[11px] text-muted-foreground text-center hidden sm:block mt-2">
            Press Enter to continue
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
