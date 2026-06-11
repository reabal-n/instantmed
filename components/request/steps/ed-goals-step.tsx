"use client"

/**
 * ED Goals Step - Step 1 of 4 in the ED intake flow
 *
 * Emotional entry point: low-friction goal selection + duration picker.
 * Age gate (Switch), chip grid for goals, segmented duration selector.
 */

import { motion } from "framer-motion"
import { ArrowRight,Heart, Shield, Sparkles, Stethoscope, Target } from "lucide-react"
import { useCallback } from "react"

import { IntakeStepIntro, QuestionCard, SegmentedChoiceGroup, useRovingRadio } from "@/components/request/shared/intake-step-primitives"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useReducedMotion } from "@/components/ui/motion"
import { Switch } from "@/components/ui/switch"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { useStepValidationSummary } from "@/lib/hooks/use-step-validation-summary"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface EdGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const GOAL_OPTIONS = [
  { value: "improve_erections", label: "Improve erections", icon: Target },
  { value: "more_spontaneity", label: "More spontaneity", icon: Sparkles },
  { value: "boost_confidence", label: "Boost confidence", icon: Shield },
  { value: "better_stamina", label: "Better stamina", icon: Heart },
  { value: "maintain", label: "Maintain what I have", icon: Stethoscope },
] as const

const DURATION_OPTIONS = [
  { value: "less_than_3_months", label: "< 3 months" },
  { value: "3_to_12_months", label: "3\u201312 months" },
  { value: "1_to_3_years", label: "1\u20133 years" },
  { value: "3_plus_years", label: "3+ years" },
] as const

export default function EdGoalsStep({ onNext }: EdGoalsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const edAgeConfirmed = answers.edAgeConfirmed as boolean | undefined
  const edGoal = (answers.edGoal as string) || ""
  const edDuration = (answers.edDuration as string) || ""

  const isComplete = edAgeConfirmed === true && !!edGoal && !!edDuration

  const { validationSummary, showBlockingReasons } = useStepValidationSummary(
    isComplete,
    useCallback(() => {
      const reasons: string[] = []
      if (!edAgeConfirmed) reasons.push("your age confirmation")
      if (!edGoal) reasons.push("your main goal")
      if (!edDuration) reasons.push("how long this has been a concern")
      return reasons
    }, [edAgeConfirmed, edGoal, edDuration])
  )

  const handleNext = () => {
    if (!isComplete) {
      showBlockingReasons()
      return
    }
    posthog?.capture('step_completed', { step: 'ed-goals', goal: edGoal, duration: edDuration })
    onNext()
  }

  useKeyboardNavigation({
    onNext: isComplete ? handleNext : undefined,
    enabled: isComplete,
  })

  const goalRoving = useRovingRadio(
    GOAL_OPTIONS.length,
    GOAL_OPTIONS.findIndex((option) => option.value === edGoal),
    (index) => setAnswer("edGoal", GOAL_OPTIONS[index].value),
  )

  return (
    <div className="space-y-4">
      {/* Age gate */}
      <QuestionCard compact className="flex flex-row items-start gap-3">
        <Switch
          id="edAgeConfirmed"
          checked={edAgeConfirmed === true}
          onCheckedChange={(checked) => setAnswer("edAgeConfirmed", checked)}
        />
        <Label htmlFor="edAgeConfirmed" className="text-sm leading-relaxed cursor-pointer">
          I confirm I am 18 years or older
        </Label>
      </QuestionCard>

      {/* Header */}
      <IntakeStepIntro
        title="What matters most right now?"
        description="Discreet answers help the doctor choose a safe approach."
      />

      {/* Goal selection - chip grid */}
      <QuestionCard compact>
        <Label className="text-sm font-medium">
          What&apos;s your main goal?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <motion.div
          className="grid grid-cols-2 gap-2"
          variants={prefersReducedMotion ? undefined : stagger.container}
          initial="initial"
          animate="animate"
          role="radiogroup"
          aria-label="Treatment goal"
        >
          {GOAL_OPTIONS.map((option, index) => {
            const Icon = option.icon
            const isSelected = edGoal === option.value
            return (
              <motion.button
                key={option.value}
                ref={goalRoving.registerRef(index)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={option.label}
                tabIndex={goalRoving.tabIndexFor(index)}
                variants={prefersReducedMotion ? undefined : stagger.item}
                onClick={() => setAnswer("edGoal", option.value)}
                onKeyDown={(event) => goalRoving.onKeyDown(event, index)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-[background-color,border-color] text-sm",
                  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="leading-snug">{option.label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </QuestionCard>

      {/* Duration - segmented selector */}
      <QuestionCard compact>
        <Label className="text-sm font-medium">
          How long has this been a concern?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <SegmentedChoiceGroup
          options={DURATION_OPTIONS}
          value={edDuration}
          onChange={(value) => setAnswer("edDuration", value)}
          ariaLabel="How long this has been a concern"
          columns="two"
        />
      </QuestionCard>

      {/* Validation summary — announced to screen readers on first Continue tap */}
      {validationSummary.length > 0 && (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertDescription>
            {validationSummary.length === 1 ? "Add this to continue: " : "Add these to continue: "}
            {validationSummary.join(", ")}.
          </AlertDescription>
        </Alert>
      )}

      {/* Always clickable — variant signals readiness; handleNext gates progression */}
      <Button
        data-intake-primary-action="true"
        data-intake-primary-label="Continue"
        onClick={handleNext}
        variant={isComplete ? "default" : "secondary"}
        className="w-full h-12 text-base font-medium max-sm:hidden"
      >
        {isComplete ? (
          <>
            Continue to assessment
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {isComplete && (
        <p className="text-[11px] text-muted-foreground text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
