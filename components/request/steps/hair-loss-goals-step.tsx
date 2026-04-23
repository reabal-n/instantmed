"use client"

/**
 * Hair Loss Goals Step - Step 1 of 4 in the hair loss intake flow
 *
 * Emotional entry point: goal selection + onset timing.
 * Chip grid for goals, segmented duration selector.
 */

import { motion } from "framer-motion"
import { ArrowRight,Search, Shield, Sprout, Target } from "lucide-react"

import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useReducedMotion } from "@/components/ui/motion"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import { stagger } from "@/lib/motion"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { cn } from "@/lib/utils"

import { useRequestStore } from "../store"

interface HairLossGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const GOAL_OPTIONS = [
  { value: "prevent", label: "Prevent further loss", icon: Shield },
  { value: "regrow", label: "Regrow what I've lost", icon: Sprout },
  { value: "both", label: "Both (stop + regrow)", icon: Target },
  { value: "exploring", label: "Just exploring options", icon: Search },
] as const

const ONSET_OPTIONS = [
  { value: "not_yet", label: "Not yet" },
  { value: "few_months", label: "Few months" },
  { value: "6_12_months", label: "6-12 months" },
  { value: "1_2_years", label: "1-2 years" },
  { value: "2_plus_years", label: "2+ years" },
] as const

export default function HairLossGoalsStep({ onNext }: HairLossGoalsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()

  const hairGoal = (answers.hairGoal as string) || ""
  const hairOnset = (answers.hairOnset as string) || ""

  const isComplete = !!hairGoal && !!hairOnset

  const handleNext = () => {
    if (isComplete) {
      posthog?.capture('step_completed', { step: 'hair-loss-goals', goal: hairGoal, onset: hairOnset })
      onNext()
    }
  }

  useKeyboardNavigation({
    onNext: handleNext,
    enabled: isComplete,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Let&apos;s start with what matters to you
        </h2>
        <p className="text-sm text-muted-foreground">
          Your answers help our doctor recommend the right approach. Everything is confidential.
        </p>
      </div>

      {/* Goal selection - chip grid */}
      <div className="space-y-3">
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
          aria-label="Hair loss goal"
        >
          {GOAL_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = hairGoal === option.value
            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                variants={prefersReducedMotion ? undefined : stagger.item}
                onClick={() => setAnswer("hairGoal", option.value)}
                aria-checked={isSelected}
                aria-label={option.label}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all text-sm",
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
      </div>

      {/* Onset timing - segmented selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          When did you first notice changes?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div
          className="flex gap-1 p-1 rounded-full bg-muted/50"
          role="radiogroup"
          aria-label="When did you first notice changes"
        >
          {ONSET_OPTIONS.map((option) => {
            const isSelected = hairOnset === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                onClick={() => setAnswer("hairOnset", option.value)}
                aria-checked={isSelected}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-medium rounded-full text-center transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Continue button */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
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
