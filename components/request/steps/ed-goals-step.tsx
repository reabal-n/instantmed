"use client"

/**
 * ED Goals Step - Step 1 of 4 in the ED intake flow
 *
 * Emotional entry point: low-friction goal selection + duration picker.
 * Age gate (Switch), chip grid for goals, segmented duration selector.
 */

import { motion } from "framer-motion"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Target, Sparkles, Shield, Heart, Stethoscope, ArrowRight } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { stagger } from "@/lib/motion"
import { useReducedMotion } from "@/components/ui/motion"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/lib/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

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

  const handleNext = () => {
    if (isComplete) {
      posthog?.capture('step_completed', { step: 'ed-goals', goal: edGoal, duration: edDuration })
      onNext()
    }
  }

  useKeyboardNavigation({
    onNext: handleNext,
    enabled: isComplete,
  })

  return (
    <div className="space-y-6">
      {/* Age gate */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06]">
        <Switch
          id="edAgeConfirmed"
          checked={edAgeConfirmed === true}
          onCheckedChange={(checked) => setAnswer("edAgeConfirmed", checked)}
        />
        <Label htmlFor="edAgeConfirmed" className="text-sm leading-relaxed cursor-pointer">
          I confirm I am 18 years or older
        </Label>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Let&apos;s start with what matters to you
        </h2>
        <p className="text-sm text-muted-foreground">
          Your answers help our doctor tailor the right approach. Everything is confidential.
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
        >
          {GOAL_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = edGoal === option.value
            return (
              <motion.button
                key={option.value}
                type="button"
                variants={prefersReducedMotion ? undefined : stagger.item}
                onClick={() => setAnswer("edGoal", option.value)}
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

      {/* Duration - segmented selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How long has this been a concern?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex gap-1 p-1 rounded-full bg-muted/50">
          {DURATION_OPTIONS.map((option) => {
            const isSelected = edDuration === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswer("edDuration", option.value)}
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
        <p className="text-[11px] text-muted-foreground/60 text-center hidden sm:block">
          Press Enter to continue
        </p>
      )}
    </div>
  )
}
