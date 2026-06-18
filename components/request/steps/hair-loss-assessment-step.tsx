"use client"

import { motion } from "framer-motion"
import { AlertCircle, ArrowRight } from "lucide-react"
import { useCallback, useEffect,useRef, useState } from "react"

import { ChoiceCardGroup, IntakeStepIntro, QuestionCard, QuestionPrompt, SegmentedChoiceGroup } from "@/components/request/shared/intake-step-primitives"
import { MedicalHistoryToggles } from "@/components/request/shared/medical-history-toggles"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

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
    label: "Temple recession",
    icon: ScalpMild,
    badge: "Mild",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  {
    value: "noticeable_thinning",
    label: "Thinning / recession",
    icon: ScalpModerate,
    badge: "Moderate",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    value: "crown_plus_hairline",
    label: "Crown + hairline",
    icon: ScalpCrown,
    badge: "Notable",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  {
    value: "significant",
    label: "Overall thinning",
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
  serviceType,
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

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!hairPattern) reasons.push("your hair loss pattern")
      if (!hairFamilyHistory) reasons.push("your family history")
      return reasons
    }, [hairPattern, hairFamilyHistory]),
    { posthog, serviceType, subtype: answers.consultSubtype as string | undefined, stepId: "hair-loss-assessment" },
  )

  const handleNext = () => {
    if (!validate()) {
      showBlockingReasons()
      return
    }
    posthog?.capture("step_completed", {
      step: "hair-loss-assessment",
      pattern: hairPattern,
    })
    onNext()
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
      className="space-y-4"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={itemVariants}>
        <IntakeStepIntro
          title="Which pattern looks closest?"
          description="Choose the closest match. It does not need to be perfect."
        />
      </motion.div>

      {/* Norwood pattern selector */}
      <QuestionCard compact>
        <QuestionPrompt label="Which pattern best describes your hair loss?" required />
        <ChoiceCardGroup
          options={PATTERN_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            icon: option.icon,
            chips: [option.badge],
          }))}
          value={hairPattern}
          onChange={(value) => setAnswer("hairPattern", value)}
          ariaLabel="Hair loss pattern"
          columns="three"
          mobileColumns="two"
          hideChipsOnMobile
          compact
        />
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
      </QuestionCard>

      {/* Family history -- visible after pattern selected */}
      {showFamilyHistory && (
        <motion.div
          variants={itemVariants}
          initial="initial"
          animate="animate"
          className="space-y-3"
          ref={familyRef}
        >
          <QuestionCard compact>
          <QuestionPrompt label="Do you have a family history of hair loss?" required />
          <SegmentedChoiceGroup
            options={FAMILY_HISTORY_OPTIONS}
            value={hairFamilyHistory}
            onChange={(value) => setAnswer("hairFamilyHistory", value)}
            ariaLabel="Do you have a family history of hair loss"
            columns="one"
          />
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
          </QuestionCard>
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
          <QuestionCard compact>
          <QuestionPrompt
            label="Which treatments have you tried before?"
            hint="Toggle on any treatments you have previously used."
          />
          <MedicalHistoryToggles
            items={PREVIOUS_TREATMENTS}
            values={answers}
            onChange={(key, checked) => setAnswer(key, checked)}
          />
          </QuestionCard>
        </motion.div>
      )}

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <motion.div variants={itemVariants}>
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertDescription>
              {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
              {validationSummary.join(", ")}.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Always clickable — variant signals readiness; handleNext gates progression */}
      <motion.div variants={itemVariants}>
        <Button
          data-intake-primary-action="true"
          data-intake-primary-label="Continue"
          data-intake-primary-ready={isComplete ? "true" : "false"}
          onClick={handleNext}
          variant={isComplete ? "default" : "secondary"}
          className="w-full h-12 text-base font-medium max-sm:hidden"
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
